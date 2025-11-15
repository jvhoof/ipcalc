"""
API request and response models
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from api.models.subnet import SubnetInfoModel, NetworkInfoModel


class CalculateRequest(BaseModel):
    """Request model for subnet calculation"""
    provider: str = Field(..., description="Cloud provider (azure, aws, gcp, oracle, alicloud, onpremises)")
    cidr: str = Field(..., description="Network CIDR notation (e.g., 10.0.0.0/16)")
    subnets: int = Field(..., description="Number of subnets to create (1-256)", ge=1, le=256)
    prefix: Optional[int] = Field(None, description="Desired subnet prefix (optional)")

    @field_validator('provider')
    @classmethod
    def validate_provider(cls, v: str) -> str:
        valid_providers = ['azure', 'aws', 'gcp', 'oracle', 'alicloud', 'onpremises']
        if v.lower() not in valid_providers:
            raise ValueError(f"Invalid provider. Must be one of: {', '.join(valid_providers)}")
        return v.lower()

    @field_validator('cidr')
    @classmethod
    def validate_cidr(cls, v: str) -> str:
        if '/' not in v:
            raise ValueError("CIDR must be in format: x.x.x.x/prefix")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "provider": "azure",
                "cidr": "10.0.0.0/16",
                "subnets": 4,
                "prefix": 24
            }
        }


class CalculateResponse(BaseModel):
    """Response model for subnet calculation"""
    provider: str = Field(..., description="Cloud provider")
    network: NetworkInfoModel = Field(..., description="Network information")
    subnets: List[SubnetInfoModel] = Field(..., description="List of subnets")
    error: Optional[str] = Field(None, description="Error message if calculation failed")
    diagram_available: bool = Field(True, description="Whether diagram generation is available")

    class Config:
        json_schema_extra = {
            "example": {
                "provider": "azure",
                "network": {
                    "network": "10.0.0.0",
                    "totalIPs": 65536,
                    "firstIP": "10.0.0.0",
                    "lastIP": "10.0.255.255"
                },
                "subnets": [
                    {
                        "network": "10.0.0.0",
                        "cidr": "10.0.0.0/24",
                        "mask": "255.255.255.0",
                        "totalIPs": 256,
                        "usableIPs": 251,
                        "reserved": ["10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.255"],
                        "usableRange": "10.0.0.4 - 10.0.0.254"
                    }
                ],
                "diagram_available": True
            }
        }


class DiagramRequest(BaseModel):
    """Request model for diagram generation"""
    provider: str = Field(..., description="Cloud provider (azure, aws, gcp, oracle, alicloud, onpremises)")
    cidr: str = Field(..., description="Network CIDR notation (e.g., 10.0.0.0/16)")
    subnets: int = Field(..., description="Number of subnets to create (1-256)", ge=1, le=256)
    prefix: Optional[int] = Field(None, description="Desired subnet prefix (optional)")
    diagram_type: str = Field("simple", description="Diagram type (simple, detailed)")

    @field_validator('provider')
    @classmethod
    def validate_provider(cls, v: str) -> str:
        valid_providers = ['azure', 'aws', 'gcp', 'oracle', 'alicloud', 'onpremises']
        if v.lower() not in valid_providers:
            raise ValueError(f"Invalid provider. Must be one of: {', '.join(valid_providers)}")
        return v.lower()

    @field_validator('diagram_type')
    @classmethod
    def validate_diagram_type(cls, v: str) -> str:
        valid_types = ['simple', 'detailed']
        if v.lower() not in valid_types:
            raise ValueError(f"Invalid diagram type. Must be one of: {', '.join(valid_types)}")
        return v.lower()

    class Config:
        json_schema_extra = {
            "example": {
                "provider": "azure",
                "cidr": "10.0.0.0/16",
                "subnets": 4,
                "prefix": 24,
                "diagram_type": "simple"
            }
        }


class DiagramResponse(BaseModel):
    """Response model for diagram generation"""
    python_code: str = Field(..., description="Python code to generate the diagram")
    description: str = Field(..., description="Description of the diagram")
    execution_instructions: str = Field(..., description="How to execute the generated code")
    provider: str = Field(..., description="Cloud provider")

    class Config:
        json_schema_extra = {
            "example": {
                "python_code": "from diagrams import Diagram...",
                "description": "Azure Virtual Network with 4 subnets",
                "execution_instructions": "Save as diagram.py and run: python diagram.py",
                "provider": "azure"
            }
        }


class ProvidersResponse(BaseModel):
    """Response model for listing providers"""
    providers: List[str] = Field(..., description="List of supported cloud providers")

    class Config:
        json_schema_extra = {
            "example": {
                "providers": ["azure", "aws", "gcp", "oracle", "alicloud", "onpremises"]
            }
        }
