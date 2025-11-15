"""
Cloud Provider Configuration

This file contains all centralized configuration for cloud provider calculators.
Modify these values to change defaults for each cloud provider.
"""

from typing import List
from dataclasses import dataclass


@dataclass
class CloudProviderConfig:
    """Configuration for a cloud provider"""
    default_cidr: str
    default_subnet_count: int
    reserved_ip_count: int  # Number of reserved IPs (unavailable for use)
    min_cidr_prefix: int    # Minimum allowed CIDR prefix (e.g., 29 for /29)
    max_cidr_prefix: int    # Maximum allowed CIDR prefix (e.g., 8 for /8)
    availability_zones: List[str]  # List of availability zones/domains/regions


# Cloud provider configurations
CLOUD_PROVIDERS = {
    "azure": CloudProviderConfig(
        default_cidr="172.16.1.0/24",
        default_subnet_count=4,
        reserved_ip_count=5,  # First 4 IPs + last IP
        min_cidr_prefix=29,
        max_cidr_prefix=8,
        availability_zones=[]
    ),
    "aws": CloudProviderConfig(
        default_cidr="172.16.1.0/24",
        default_subnet_count=3,
        reserved_ip_count=5,  # First 4 IPs + last IP
        min_cidr_prefix=28,
        max_cidr_prefix=16,
        availability_zones=[
            "us-east-1a",
            "us-east-1b",
            "us-east-1c",
            "us-east-1d",
            "us-east-1e",
            "us-east-1f"
        ]
    ),
    "gcp": CloudProviderConfig(
        default_cidr="172.16.1.0/24",
        default_subnet_count=3,
        reserved_ip_count=4,  # First 2 IPs + last 2 IPs
        min_cidr_prefix=29,
        max_cidr_prefix=8,
        availability_zones=[
            "us-central1",
            "us-east1",
            "us-west1",
            "europe-west1",
            "asia-east1",
            "asia-southeast1"
        ]
    ),
    "oracle": CloudProviderConfig(
        default_cidr="172.16.1.0/24",
        default_subnet_count=3,
        reserved_ip_count=3,  # First 2 IPs + last IP
        min_cidr_prefix=30,
        max_cidr_prefix=16,
        availability_zones=["AD-1", "AD-2", "AD-3"]
    ),
    "alicloud": CloudProviderConfig(
        default_cidr="172.16.1.0/24",
        default_subnet_count=3,
        reserved_ip_count=4,  # Network address + last 3 IPs
        min_cidr_prefix=29,
        max_cidr_prefix=8,
        availability_zones=[
            "cn-hangzhou-a",
            "cn-hangzhou-b",
            "cn-hangzhou-c",
            "cn-hangzhou-d",
            "cn-hangzhou-e",
            "cn-hangzhou-f"
        ]
    ),
    "onpremises": CloudProviderConfig(
        default_cidr="172.16.1.0/24",
        default_subnet_count=3,
        reserved_ip_count=2,  # First IP + last IP (typical)
        min_cidr_prefix=30,
        max_cidr_prefix=8,
        availability_zones=[]
    )
}


def get_cloud_provider_config(provider: str) -> CloudProviderConfig:
    """
    Get configuration for a specific cloud provider

    Args:
        provider: The cloud provider (azure, aws, gcp, oracle, alicloud, onpremises)

    Returns:
        Cloud provider configuration object

    Raises:
        ValueError: If provider is not supported
    """
    if provider not in CLOUD_PROVIDERS:
        raise ValueError(f"Unsupported provider: {provider}. Supported: {list(CLOUD_PROVIDERS.keys())}")
    return CLOUD_PROVIDERS[provider]


def get_supported_providers() -> List[str]:
    """Get list of supported cloud providers"""
    return list(CLOUD_PROVIDERS.keys())
