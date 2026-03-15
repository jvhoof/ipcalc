#!/usr/bin/env python3
"""
ipcalc FastAPI server

Exposes IaC code generation via HTTP so users can curl the output directly:
  curl "https://example.com/api/azure?cidr=10.0.0.0/16&subnets=4&format=terraform" > main.tf
"""

import os
import sys

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# Add the skill scripts directory to the path so we can import without moving files
_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'skills', 'ipcalc-for-cloud', 'scripts')
_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'skills', 'ipcalc-for-cloud', 'templates')
sys.path.insert(0, os.path.abspath(_SCRIPTS_DIR))

from ipcalc import calculate_subnets, generate_hub_spoke_topology  # noqa: E402
from template_processor import process_template  # noqa: E402

TEMPLATES_DIR = os.path.abspath(_TEMPLATES_DIR)

# Content-type and suggested filename per output format
FORMAT_CONFIG: dict[str, tuple[str, str]] = {
    'terraform':  ('text/plain',             'main.tf'),
    'cli':        ('text/x-shellscript',     'deploy.sh'),
    'bicep':      ('text/plain',             'main.bicep'),
    'arm':        ('application/json',       'azuredeploy.json'),
    'powershell': ('text/plain',             'deploy.ps1'),
}

app = FastAPI(title='ipcalc API', docs_url='/api/docs', redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['GET'],
    allow_headers=['*'],
)


@app.get('/api/azure', summary='Generate Azure IaC code')
def generate_azure(
    cidr: str = Query(..., description='Hub VNet CIDR, e.g. 10.0.0.0/16'),
    subnets: int = Query(..., ge=1, le=256, description='Number of subnets'),
    format: str = Query(..., description='Output format: terraform, cli, bicep, arm, powershell'),
    prefix: int | None = Query(None, description='Optional desired subnet prefix, e.g. 26 for /26'),
    spoke_cidrs: str | None = Query(None, alias='spoke-cidrs', description='Comma-separated spoke VNet CIDRs'),
    spoke_subnets: str | None = Query(None, alias='spoke-subnets', description='Comma-separated spoke subnet counts'),
) -> Response:
    if format not in FORMAT_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid format '{format}'. Must be one of: {', '.join(FORMAT_CONFIG)}",
        )

    # Parse hub-spoke params
    spoke_cidrs_list: list[str] = [c.strip() for c in spoke_cidrs.split(',')] if spoke_cidrs else []
    spoke_subnets_list: list[int] = []

    if spoke_cidrs_list:
        if spoke_subnets:
            try:
                spoke_subnets_list = [int(s.strip()) for s in spoke_subnets.split(',')]
            except ValueError:
                raise HTTPException(status_code=400, detail='spoke-subnets must be comma-separated integers')
            if len(spoke_subnets_list) != len(spoke_cidrs_list):
                raise HTTPException(
                    status_code=400,
                    detail='Number of spoke-subnets must match number of spoke-cidrs',
                )
        else:
            spoke_subnets_list = [2] * len(spoke_cidrs_list)

    # Calculate subnets
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
    }

    try:
        code = process_template('azure', format, data, TEMPLATES_DIR)
    except (FileNotFoundError, NotImplementedError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    content_type, filename = FORMAT_CONFIG[format]
    return Response(
        content=code,
        media_type=content_type,
        headers={'Content-Disposition': f'inline; filename="{filename}"'},
    )
