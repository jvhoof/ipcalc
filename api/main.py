#!/usr/bin/env python3
"""
ipcalc FastAPI server

Exposes IaC code generation via HTTP so users can curl the output directly:
  curl "https://example.com/api/azure?cidr=10.0.0.0/16&subnets=4&format=terraform" > main.tf
  curl "https://example.com/api/aws?cidr=10.0.0.0/16&subnets=4&format=terraform" > main.tf
  curl "https://example.com/api/gcp?cidr=10.0.0.0/16&subnets=4&format=terraform" > main.tf
"""

import ipaddress
import logging
import os
import re
import sys
from http import HTTPStatus

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger('ipcalc.api')

# Add the skill scripts directory to the path so we can import without moving files
_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'skills', 'ipcalc-for-cloud', 'scripts')
_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'skills', 'ipcalc-for-cloud', 'templates')
sys.path.insert(0, os.path.abspath(_SCRIPTS_DIR))

from ipcalc import calculate_subnets, generate_hub_spoke_topology  # noqa: E402
from template_processor import process_template  # noqa: E402
from diagram_generator import AzureDiagramGenerator  # noqa: E402

TEMPLATES_DIR = os.path.abspath(_TEMPLATES_DIR)
_ICONS_DIR = os.path.join(os.path.dirname(__file__), 'icons')

# Content-type and suggested filename per output format
AZURE_FORMAT_CONFIG: dict[str, tuple[str, str]] = {
    'terraform':      ('text/plain',         'main.tf'),
    'cli':            ('text/x-shellscript', 'deploy.sh'),
    'bicep':          ('text/plain',         'main.bicep'),
    'arm':            ('application/json',   'azuredeploy.json'),
    'powershell':     ('text/plain',         'deploy.ps1'),
    'd2':             ('text/plain',         'diagram.d2'),
}

AWS_FORMAT_CONFIG: dict[str, tuple[str, str]] = {
    'terraform':      ('text/plain',         'main.tf'),
    'cli':            ('text/x-shellscript', 'deploy.sh'),
    'cloudformation': ('text/plain',         'template.yaml'),
}

GCP_FORMAT_CONFIG: dict[str, tuple[str, str]] = {
    'terraform': ('text/plain',         'main.tf'),
    'gcloud':    ('text/x-shellscript', 'deploy.sh'),
}

# RFC 9457 — Problem Details for HTTP APIs
_PROBLEM_CONTENT_TYPE = 'application/problem+json'


def _problem(status: int, detail: str) -> JSONResponse:
    """Build an RFC 9457 Problem Details response.

    Returns a JSON body with:
      type    — always "about:blank" (no problem-specific URI registered)
      title   — standard HTTP status phrase, e.g. "Bad Request"
      status  — mirrors the HTTP status code
      detail  — human-readable explanation of this specific occurrence
    """
    return JSONResponse(
        status_code=status,
        content={
            'type': 'about:blank',
            'title': HTTPStatus(status).phrase,
            'status': status,
            'detail': detail,
        },
        media_type=_PROBLEM_CONTENT_TYPE,
    )


# Safety limits
_MAX_SPOKE_COUNT = 10
_CIDR_MAX_LEN = 18       # "255.255.255.255/32"
_SPOKE_LIST_MAX_LEN = (_CIDR_MAX_LEN + 1) * _MAX_SPOKE_COUNT  # ~190 chars


# ---------------------------------------------------------------------------
# Input validation helpers
# ---------------------------------------------------------------------------

def _validate_cidr(value: str, field: str = 'cidr') -> str:
    """Return normalized CIDR or raise HTTP 400 with a clear message.

    Using the parsed output of ipaddress.ip_network() as the canonical form
    ensures that only clean "A.B.C.D/prefix" strings (digits, dots, slash)
    ever reach the template renderer, preventing any character-level injection
    in the generated IaC files.
    """
    value = value.strip()
    if not value:
        raise HTTPException(status_code=400, detail=f"'{field}' must not be empty.")
    if len(value) > _CIDR_MAX_LEN:
        raise HTTPException(
            status_code=400,
            detail=(
                f"'{field}' value is too long ({len(value)} chars). "
                f"A valid IPv4 CIDR is at most {_CIDR_MAX_LEN} characters, e.g. 10.0.0.0/16."
            ),
        )
    try:
        network = ipaddress.ip_network(value, strict=False)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=(
                f"'{field}' value '{value}' is not a valid CIDR block. "
                "Expected an IPv4 network in CIDR notation, e.g. 10.0.0.0/16."
            ),
        )
    if network.version != 4:
        raise HTTPException(
            status_code=400,
            detail=f"'{field}' value '{value}' is IPv6. Only IPv4 CIDR blocks are supported.",
        )
    return str(network)  # normalized "A.B.C.D/prefix" — safe for template embedding


_NAME_PREFIX_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$')


def _validate_name_prefix(value: str) -> str:
    """Return the name prefix as-is or raise HTTP 400.

    Allowed characters: alphanumeric, hyphens, underscores.
    Must start with an alphanumeric character. Maximum 32 characters.
    """
    value = value.strip()
    if not _NAME_PREFIX_RE.match(value):
        raise HTTPException(
            status_code=400,
            detail=(
                f"'name-prefix' value '{value}' is invalid. "
                "It must start with a letter or digit and contain only "
                "letters, digits, hyphens, or underscores (max 32 characters)."
            ),
        )
    return value


def _parse_spoke_cidrs(raw: str) -> list[str]:
    """Parse, validate, and normalize a comma-separated list of spoke CIDRs."""
    parts = [c.strip() for c in raw.split(',') if c.strip()]
    if not parts:
        raise HTTPException(status_code=400, detail="'spoke-cidrs' must not be empty.")
    if len(parts) > _MAX_SPOKE_COUNT:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Too many spoke networks: {len(parts)} provided, "
                f"maximum is {_MAX_SPOKE_COUNT}."
            ),
        )
    return [_validate_cidr(c, f'spoke-cidrs[{i}]') for i, c in enumerate(parts)]


def _parse_spoke_subnets(raw: str, expected_count: int) -> list[int]:
    """Parse and validate a comma-separated list of spoke subnet counts."""
    try:
        counts = [int(s.strip()) for s in raw.split(',') if s.strip()]
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="'spoke-subnets' must be a comma-separated list of positive integers, e.g. 2,4,2.",
        )
    if len(counts) != expected_count:
        raise HTTPException(
            status_code=400,
            detail=(
                f"'spoke-subnets' has {len(counts)} value(s) but 'spoke-cidrs' has {expected_count}. "
                "Counts must match."
            ),
        )
    if any(c < 1 or c > 256 for c in counts):
        raise HTTPException(
            status_code=400,
            detail="Each value in 'spoke-subnets' must be between 1 and 256.",
        )
    return counts


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(title='ipcalc API', docs_url='/api/docs', redoc_url=None)

app.mount('/api/icons', StaticFiles(directory=os.path.abspath(_ICONS_DIR)), name='icons')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['GET'],
    allow_headers=['*'],
)


@app.middleware('http')
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Return RFC 9457 Problem Details for all HTTPException responses."""
    return _problem(exc.status_code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return RFC 9457 Problem Details for FastAPI query/body validation errors.

    Flattens FastAPI's nested error list into a single human-readable detail string
    so the shape is consistent with all other error responses.
    """
    messages = []
    for error in exc.errors():
        loc_parts = [str(x) for x in error['loc'] if x not in ('query', 'body')]
        location = ' → '.join(loc_parts) if loc_parts else 'request'
        messages.append(f"{location}: {error['msg']}")
    return _problem(422, '; '.join(messages))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return RFC 9457 Problem Details for unexpected errors without leaking internals."""
    logger.exception('Unhandled exception on %s %s', request.method, request.url.path)
    return _problem(500, 'An unexpected error occurred. Please verify your input and try again.')


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get('/api/azure', summary='Generate Azure IaC code')
def generate_azure(
    request: Request,
    cidr: str = Query(..., max_length=_CIDR_MAX_LEN, description='Hub VNet CIDR, e.g. 10.0.0.0/16'),
    subnets: int = Query(..., ge=1, le=256, description='Number of subnets'),
    format: str = Query(..., description='Output format: terraform, cli, bicep, arm, powershell'),
    prefix: int | None = Query(None, ge=1, le=32, description='Optional desired subnet prefix, e.g. 26 for /26'),
    name_prefix: str | None = Query(None, alias='name-prefix', max_length=32, description='Prefix for resource naming, e.g. myapp'),
    spoke_cidrs: str | None = Query(None, alias='spoke-cidrs', max_length=_SPOKE_LIST_MAX_LEN, description='Comma-separated spoke VNet CIDRs'),
    spoke_subnets: str | None = Query(None, alias='spoke-subnets', max_length=64, description='Comma-separated spoke subnet counts'),
) -> Response:
    if format not in AZURE_FORMAT_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid format '{format}'. "
                f"Supported formats: {', '.join(AZURE_FORMAT_CONFIG)}."
            ),
        )

    cidr = _validate_cidr(cidr)
    if name_prefix is not None:
        name_prefix = _validate_name_prefix(name_prefix)

    spoke_cidrs_list: list[str] = []
    spoke_subnets_list: list[int] = []

    if spoke_cidrs:
        spoke_cidrs_list = _parse_spoke_cidrs(spoke_cidrs)
        spoke_subnets_list = (
            _parse_spoke_subnets(spoke_subnets, len(spoke_cidrs_list))
            if spoke_subnets
            else [2] * len(spoke_cidrs_list)
        )

    if spoke_cidrs_list:
        result = generate_hub_spoke_topology(
            cidr, subnets, spoke_cidrs_list, spoke_subnets_list, 'azure', prefix
        )
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        hub_subnets = result['hub']['subnets']
        spoke_vnets = result['spokes']
    else:
        result = calculate_subnets(cidr, subnets, 'azure', prefix)
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        hub_subnets = result['subnets']
        spoke_vnets = []

    data = {
        'vnetCidr': cidr,
        'subnets': hub_subnets,
        'peeringEnabled': len(spoke_vnets) > 0,
        'spokeVNets': spoke_vnets,
        **(({'namePrefix': name_prefix}) if name_prefix else {}),
    }

    if format == 'd2':
        icon_base_url = f"{request.base_url}api/icons"
        code = AzureDiagramGenerator(icon_base_url=icon_base_url).generate(data)
    else:
        try:
            code = process_template('azure', format, data, TEMPLATES_DIR)
        except (FileNotFoundError, NotImplementedError) as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    content_type, filename = AZURE_FORMAT_CONFIG[format]
    return Response(
        content=code,
        media_type=content_type,
        headers={'Content-Disposition': f'inline; filename="{filename}"'},
    )


@app.get('/api/aws', summary='Generate AWS IaC code')
def generate_aws(
    cidr: str = Query(..., max_length=_CIDR_MAX_LEN, description='VPC CIDR, e.g. 10.0.0.0/16'),
    subnets: int = Query(..., ge=1, le=256, description='Number of subnets'),
    format: str = Query(..., description='Output format: terraform, cli, cloudformation'),
    prefix: int | None = Query(None, ge=1, le=32, description='Optional desired subnet prefix, e.g. 24 for /24'),
    name_prefix: str | None = Query(None, alias='name-prefix', max_length=32, description='Prefix for resource naming, e.g. myapp'),
) -> Response:
    if format not in AWS_FORMAT_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid format '{format}'. "
                f"Supported formats: {', '.join(AWS_FORMAT_CONFIG)}."
            ),
        )

    cidr = _validate_cidr(cidr)
    if name_prefix is not None:
        name_prefix = _validate_name_prefix(name_prefix)

    result = calculate_subnets(cidr, subnets, 'aws', prefix)
    if 'error' in result:
        raise HTTPException(status_code=400, detail=result['error'])

    data = {
        'vpcCidr': cidr,
        'subnets': result['subnets'],
        **(({'namePrefix': name_prefix}) if name_prefix else {}),
    }

    try:
        code = process_template('aws', format, data, TEMPLATES_DIR)
    except (FileNotFoundError, NotImplementedError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    content_type, filename = AWS_FORMAT_CONFIG[format]
    return Response(
        content=code,
        media_type=content_type,
        headers={'Content-Disposition': f'inline; filename="{filename}"'},
    )


@app.get('/api/gcp', summary='Generate GCP IaC code')
def generate_gcp(
    cidr: str = Query(..., max_length=_CIDR_MAX_LEN, description='Hub VPC CIDR, e.g. 10.0.0.0/16'),
    subnets: int = Query(..., ge=1, le=256, description='Number of subnets'),
    format: str = Query(..., description='Output format: terraform, gcloud'),
    prefix: int | None = Query(None, ge=1, le=32, description='Optional desired subnet prefix, e.g. 24 for /24'),
    name_prefix: str | None = Query(None, alias='name-prefix', max_length=32, description='Prefix for resource naming, e.g. myapp'),
    spoke_cidrs: str | None = Query(None, alias='spoke-cidrs', max_length=_SPOKE_LIST_MAX_LEN, description='Comma-separated spoke VPC CIDRs'),
    spoke_subnets: str | None = Query(None, alias='spoke-subnets', max_length=64, description='Comma-separated spoke subnet counts'),
) -> Response:
    if format not in GCP_FORMAT_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid format '{format}'. "
                f"Supported formats: {', '.join(GCP_FORMAT_CONFIG)}."
            ),
        )

    cidr = _validate_cidr(cidr)
    if name_prefix is not None:
        name_prefix = _validate_name_prefix(name_prefix)

    spoke_cidrs_list: list[str] = []
    spoke_subnets_list: list[int] = []

    if spoke_cidrs:
        spoke_cidrs_list = _parse_spoke_cidrs(spoke_cidrs)
        spoke_subnets_list = (
            _parse_spoke_subnets(spoke_subnets, len(spoke_cidrs_list))
            if spoke_subnets
            else [2] * len(spoke_cidrs_list)
        )

    if spoke_cidrs_list:
        result = generate_hub_spoke_topology(
            cidr, subnets, spoke_cidrs_list, spoke_subnets_list, 'gcp', prefix
        )
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        hub_subnets = result['hub']['subnets']
        spoke_vpcs = result['spokes']
    else:
        result = calculate_subnets(cidr, subnets, 'gcp', prefix)
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        hub_subnets = result['subnets']
        spoke_vpcs = []

    data = {
        'vpcCidr': cidr,
        'subnets': hub_subnets,
        'peeringEnabled': len(spoke_vpcs) > 0,
        'spokeVPCs': spoke_vpcs,
        **(({'namePrefix': name_prefix}) if name_prefix else {}),
    }

    try:
        code = process_template('gcp', format, data, TEMPLATES_DIR)
    except (FileNotFoundError, NotImplementedError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    content_type, filename = GCP_FORMAT_CONFIG[format]
    return Response(
        content=code,
        media_type=content_type,
        headers={'Content-Disposition': f'inline; filename="{filename}"'},
    )
