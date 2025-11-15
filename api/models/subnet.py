"""
Data models for subnet and network information
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class NetworkInfoModel(BaseModel):
    """Network information model"""
    network: str = Field(..., description="Network address")
    totalIPs: int = Field(..., description="Total number of IP addresses")
    firstIP: str = Field(..., description="First IP address in the network")
    lastIP: str = Field(..., description="Last IP address in the network")

    class Config:
        json_schema_extra = {
            "example": {
                "network": "10.0.0.0",
                "totalIPs": 65536,
                "firstIP": "10.0.0.0",
                "lastIP": "10.0.255.255"
            }
        }


class SubnetInfoModel(BaseModel):
    """Subnet information model"""
    network: str = Field(..., description="Network address")
    cidr: str = Field(..., description="CIDR notation")
    mask: str = Field(..., description="Subnet mask")
    totalIPs: int = Field(..., description="Total IP addresses in subnet")
    usableIPs: int = Field(..., description="Usable IP addresses")
    reserved: List[str] = Field(..., description="Reserved IP addresses")
    usableRange: str = Field(..., description="Range of usable IPs")
    availabilityZone: Optional[str] = Field(None, description="Availability zone (for cloud providers)")
    region: Optional[str] = Field(None, description="Region (for cloud providers)")
    availabilityDomain: Optional[str] = Field(None, description="Availability domain (for Oracle)")
    zone: Optional[str] = Field(None, description="Zone (for cloud providers)")

    class Config:
        json_schema_extra = {
            "example": {
                "network": "10.0.0.0",
                "cidr": "10.0.0.0/24",
                "mask": "255.255.255.0",
                "totalIPs": 256,
                "usableIPs": 251,
                "reserved": ["10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.255"],
                "usableRange": "10.0.0.4 - 10.0.0.254",
                "availabilityZone": "us-east-1a"
            }
        }


class CloudProviderConfigModel(BaseModel):
    """Cloud provider configuration model"""
    defaultCidr: str = Field(..., description="Default CIDR block")
    defaultSubnetCount: int = Field(..., description="Default number of subnets")
    reservedIpCount: int = Field(..., description="Number of reserved IPs")
    minCidrPrefix: int = Field(..., description="Minimum CIDR prefix")
    maxCidrPrefix: int = Field(..., description="Maximum CIDR prefix")
    availabilityZones: List[str] = Field(..., description="Availability zones")

    class Config:
        json_schema_extra = {
            "example": {
                "defaultCidr": "172.16.1.0/24",
                "defaultSubnetCount": 4,
                "reservedIpCount": 5,
                "minCidrPrefix": 29,
                "maxCidrPrefix": 8,
                "availabilityZones": []
            }
        }
