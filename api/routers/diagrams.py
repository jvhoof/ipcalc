"""
Network diagram generation API endpoints
"""

from fastapi import APIRouter, HTTPException

from api.models.requests import DiagramRequest, DiagramResponse
from api.core.ip_calculator import calculate_subnets
from api.config.cloud_providers import get_cloud_provider_config
from api.diagrams.generator import DiagramGenerator

router = APIRouter(prefix="/api/diagram", tags=["diagrams"])


@router.post("/code", response_model=DiagramResponse)
async def generate_diagram_code(request: DiagramRequest):
    """
    Generate Python code for network diagram visualization

    This endpoint:
    1. Calculates the subnet layout based on your network configuration
    2. Generates executable Python code using the 'diagrams' library
    3. Returns the code as a string that you can save and run

    The generated code uses the mingrammer/diagrams library to create
    visual representations of your network architecture showing:
    - Virtual network/VPC structure
    - All subnets with CIDR blocks
    - Usable IP counts
    - Availability zones (for cloud providers)
    - Security groups and routing (in detailed mode)

    Supported providers:
    - Azure: Full support with detailed NSG and routing visualization
    - AWS: VPC with subnet visualization
    - GCP: VPC network visualization
    - Others: Basic diagram support

    Diagram types:
    - simple: Basic network and subnet visualization
    - detailed: Includes security groups, routing tables, and zones
    """
    try:
        # Get cloud provider configuration
        config = get_cloud_provider_config(request.provider)

        # Calculate subnets
        result = calculate_subnets(
            cidr=request.cidr,
            number_of_subnets=request.subnets,
            config=config,
            desired_subnet_prefix=request.prefix
        )

        # Check for errors
        if "error" in result and result["error"]:
            raise HTTPException(status_code=400, detail=result["error"])

        # Generate diagram code
        python_code = DiagramGenerator.generate_diagram(
            provider=request.provider,
            network_cidr=request.cidr,
            subnets=result["subnets"],
            diagram_type=request.diagram_type
        )

        description = DiagramGenerator.get_diagram_description(
            provider=request.provider,
            network_cidr=request.cidr,
            subnet_count=len(result["subnets"]),
            diagram_type=request.diagram_type
        )

        execution_instructions = DiagramGenerator.get_execution_instructions(
            provider=request.provider,
            diagram_type=request.diagram_type
        )

        return DiagramResponse(
            python_code=python_code,
            description=description,
            execution_instructions=execution_instructions,
            provider=request.provider
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
