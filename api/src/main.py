"""
IPCalc Diagram API - FastAPI application
Generates network diagrams based on IP calculations
"""
import os
import tempfile
from typing import Optional, List
from enum import Enum

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from .ip_calculator import (
    calculate_network,
    NetworkCalculation,
    SubnetInfo,
    ReservedIP,
    PROVIDER_CONFIGS
)
from .diagram_generator import (
    generate_diagram,
    read_diagram_bytes,
    diagram_to_base64
)


app = FastAPI(
    title="IPCalc Diagram API",
    description="""
    Generate network diagrams based on IP subnet calculations.

    This API provides the same network calculation capabilities as the IPCalc CLI,
    but returns visual network diagrams in PNG, SVG, or draw.io format.

    ## Supported Providers
    - **Azure** - Azure VNet calculations
    - **AWS** - AWS VPC calculations
    - **GCP** - Google Cloud VPC calculations
    - **Oracle** - Oracle Cloud VCN calculations
    - **Alicloud** - Alibaba Cloud VPC calculations
    - **On-Premises** - Standard network calculations

    ## Output Formats
    - **PNG** - Raster image (default)
    - **SVG** - Vector image
    - **PDF** - PDF document
    - **DOT** - Graphviz DOT format
    - **draw.io** - draw.io compatible XML
    """,
    version="1.0.0"
)


class Provider(str, Enum):
    azure = "azure"
    aws = "aws"
    gcp = "gcp"
    oracle = "oracle"
    alicloud = "alicloud"
    onpremises = "onpremises"


class OutputFormat(str, Enum):
    png = "png"
    svg = "svg"
    pdf = "pdf"
    dot = "dot"
    drawio = "drawio"


class DiagramRequest(BaseModel):
    """Request model for generating a network diagram"""
    provider: Provider = Field(..., description="Cloud provider")
    cidr: str = Field(..., description="VPC/VNet CIDR (e.g., 10.0.0.0/16)")
    subnets: int = Field(..., ge=1, le=256, description="Number of subnets (1-256)")
    prefix: Optional[int] = Field(None, ge=8, le=30, description="Custom subnet prefix length")
    output_format: OutputFormat = Field(OutputFormat.png, description="Output format")


class ReservedIPResponse(BaseModel):
    """Reserved IP address response"""
    ip: str
    description: str


class SubnetResponse(BaseModel):
    """Subnet information response"""
    name: str
    network_address: str
    cidr: str
    subnet_mask: str
    total_ips: int
    usable_ips: int
    reserved_ips: List[ReservedIPResponse]
    usable_range: str
    availability_zone: str


class NetworkCalculationResponse(BaseModel):
    """Network calculation response"""
    provider: str
    vpc_cidr: str
    vpc_network_address: str
    vpc_subnet_mask: str
    vpc_total_ips: int
    subnets: List[SubnetResponse]
    subnet_prefix: int


class DiagramResponse(BaseModel):
    """Response with diagram data"""
    calculation: NetworkCalculationResponse
    diagram_base64: str
    format: str
    filename: str


class ProviderInfo(BaseModel):
    """Provider information response"""
    name: str
    reserved_ips: int
    min_subnet_size: int
    max_cidr: int
    availability_zones: List[str]
    description: str


@app.get("/")
async def root():
    """API root - returns basic info"""
    return {
        "name": "IPCalc Diagram API",
        "version": "1.0.0",
        "description": "Generate network diagrams based on IP subnet calculations",
        "docs_url": "/docs"
    }


@app.get("/providers", response_model=List[ProviderInfo])
async def list_providers():
    """List all supported cloud providers and their configurations"""
    providers = []
    for name, config in PROVIDER_CONFIGS.items():
        providers.append(ProviderInfo(
            name=name,
            reserved_ips=config.reserved_ips,
            min_subnet_size=config.min_subnet_size,
            max_cidr=config.max_cidr,
            availability_zones=config.availability_zones,
            description=config.description
        ))
    return providers


@app.get("/providers/{provider}", response_model=ProviderInfo)
async def get_provider(provider: Provider):
    """Get configuration for a specific provider"""
    config = PROVIDER_CONFIGS[provider.value]
    return ProviderInfo(
        name=provider.value,
        reserved_ips=config.reserved_ips,
        min_subnet_size=config.min_subnet_size,
        max_cidr=config.max_cidr,
        availability_zones=config.availability_zones,
        description=config.description
    )


@app.get("/calculate", response_model=NetworkCalculationResponse)
async def calculate(
    provider: Provider = Query(..., description="Cloud provider"),
    cidr: str = Query(..., description="VPC/VNet CIDR (e.g., 10.0.0.0/16)"),
    subnets: int = Query(..., ge=1, le=256, description="Number of subnets"),
    prefix: Optional[int] = Query(None, ge=8, le=30, description="Custom subnet prefix")
):
    """
    Calculate network subnets without generating a diagram.

    Returns the same calculation information as the CLI's 'info' output.
    """
    try:
        result = calculate_network(provider.value, cidr, subnets, prefix)
        return _calculation_to_response(result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/diagram", response_model=DiagramResponse)
async def create_diagram(request: DiagramRequest):
    """
    Generate a network diagram based on the calculation.

    Returns the calculation details and the diagram as a base64-encoded string.
    """
    try:
        # Calculate network
        result = calculate_network(
            request.provider.value,
            request.cidr,
            request.subnets,
            request.prefix
        )

        # Generate diagram
        diagram_path = generate_diagram(
            result,
            output_format=request.output_format.value,
            show=False
        )

        # Read and encode diagram
        diagram_base64 = diagram_to_base64(diagram_path)

        # Clean up temp file
        try:
            os.remove(diagram_path)
            os.rmdir(os.path.dirname(diagram_path))
        except (OSError, ValueError):
            pass  # Ignore cleanup errors

        return DiagramResponse(
            calculation=_calculation_to_response(result),
            diagram_base64=diagram_base64,
            format=request.output_format.value,
            filename=f"{request.provider.value}_network.{request.output_format.value}"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagram generation failed: {str(e)}")


@app.get("/diagram/download")
async def download_diagram(
    provider: Provider = Query(..., description="Cloud provider"),
    cidr: str = Query(..., description="VPC/VNet CIDR (e.g., 10.0.0.0/16)"),
    subnets: int = Query(..., ge=1, le=256, description="Number of subnets"),
    prefix: Optional[int] = Query(None, ge=8, le=30, description="Custom subnet prefix"),
    format: OutputFormat = Query(OutputFormat.png, description="Output format")
):
    """
    Generate and download a network diagram directly.

    Returns the diagram file as a download.
    """
    try:
        # Calculate network
        result = calculate_network(provider.value, cidr, subnets, prefix)

        # Generate diagram in temp directory
        temp_dir = tempfile.mkdtemp()
        filename = os.path.join(temp_dir, f"{provider.value}_network")

        diagram_path = generate_diagram(
            result,
            output_format=format.value,
            filename=filename,
            show=False
        )

        # Determine media type
        media_types = {
            "png": "image/png",
            "svg": "image/svg+xml",
            "pdf": "application/pdf",
            "dot": "text/vnd.graphviz",
            "drawio": "application/xml"
        }

        return FileResponse(
            diagram_path,
            media_type=media_types.get(format.value, "application/octet-stream"),
            filename=f"{provider.value}_network.{format.value}"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagram generation failed: {str(e)}")


def _calculation_to_response(calc: NetworkCalculation) -> NetworkCalculationResponse:
    """Convert NetworkCalculation to response model"""
    subnets = []
    for subnet in calc.subnets:
        reserved = [
            ReservedIPResponse(ip=r.ip, description=r.description)
            for r in subnet.reserved_ips
        ]
        subnets.append(SubnetResponse(
            name=subnet.name,
            network_address=subnet.network_address,
            cidr=subnet.cidr,
            subnet_mask=subnet.subnet_mask,
            total_ips=subnet.total_ips,
            usable_ips=subnet.usable_ips,
            reserved_ips=reserved,
            usable_range=subnet.usable_range,
            availability_zone=subnet.availability_zone
        ))

    return NetworkCalculationResponse(
        provider=calc.provider,
        vpc_cidr=calc.vpc_cidr,
        vpc_network_address=calc.vpc_network_address,
        vpc_subnet_mask=calc.vpc_subnet_mask,
        vpc_total_ips=calc.vpc_total_ips,
        subnets=subnets,
        subnet_prefix=calc.subnet_prefix
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
