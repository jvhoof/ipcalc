"""
Subnet calculation API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List

from api.models.requests import CalculateRequest, CalculateResponse, ProvidersResponse
from api.models.subnet import SubnetInfoModel, NetworkInfoModel
from api.core.ip_calculator import calculate_network, calculate_subnets
from api.config.cloud_providers import get_cloud_provider_config, get_supported_providers

router = APIRouter(prefix="/api", tags=["calculation"])


@router.get("/providers", response_model=ProvidersResponse)
async def list_providers():
    """
    Get list of supported cloud providers

    Returns a list of all cloud providers supported by the API.
    """
    return ProvidersResponse(providers=get_supported_providers())


@router.post("/calculate", response_model=CalculateResponse)
async def calculate_subnets_endpoint(request: CalculateRequest):
    """
    Calculate subnets for a given network and cloud provider

    This endpoint calculates subnet divisions based on:
    - Provider-specific constraints (reserved IPs, CIDR limits)
    - Number of desired subnets
    - Optional custom subnet prefix

    Returns detailed information about the network and all subnets including:
    - Network address and range
    - Subnet CIDRs and masks
    - Usable IP counts
    - Reserved IPs
    - Availability zone assignments
    """
    try:
        # Get cloud provider configuration
        config = get_cloud_provider_config(request.provider)

        # Calculate network information
        network = calculate_network(request.cidr, config)
        if not network:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid CIDR notation for {request.provider}. Expected format: x.x.x.x/prefix"
            )

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

        # Convert subnets to response models
        subnet_models = [
            SubnetInfoModel(**subnet.to_dict())
            for subnet in result["subnets"]
        ]

        return CalculateResponse(
            provider=request.provider,
            network=NetworkInfoModel(**network.to_dict()),
            subnets=subnet_models,
            diagram_available=True
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
