#!/usr/bin/env python3
"""
Cloud Provider Configuration
Defines provider-specific settings for IP calculations and template generation
"""

from typing import Dict, List, TypedDict


class CloudProviderConfig(TypedDict):
    """Cloud provider configuration structure"""
    reserved_ip_count: int
    max_cidr_prefix: int
    min_cidr_prefix: int
    availability_zones: List[str]
    supported_outputs: List[str]


# Cloud Provider Configurations
CLOUD_PROVIDERS: Dict[str, CloudProviderConfig] = {
    'azure': {
        'reserved_ip_count': 5,  # Azure reserves first 3 IPs + last IP + broadcast
        'max_cidr_prefix': 8,
        'min_cidr_prefix': 29,
        'availability_zones': ['1', '2', '3'],  # Azure availability zones
        'supported_outputs': ['info', 'json', 'cli', 'terraform', 'bicep', 'arm', 'powershell']
    },
    'aws': {
        'reserved_ip_count': 5,  # AWS reserves first 4 IPs + broadcast
        'max_cidr_prefix': 16,
        'min_cidr_prefix': 28,
        'availability_zones': [
            'us-east-1a', 'us-east-1b', 'us-east-1c',
            'us-east-1d', 'us-east-1e', 'us-east-1f'
        ],
        'supported_outputs': ['info', 'json', 'cli', 'terraform', 'cloudformation']
    },
    'gcp': {
        'reserved_ip_count': 4,
        'max_cidr_prefix': 8,
        'min_cidr_prefix': 29,
        'availability_zones': ['a', 'b', 'c', 'd'],
        'supported_outputs': ['info', 'json', 'gcloud', 'terraform']
    },
    'oracle': {
        'reserved_ip_count': 3,
        'max_cidr_prefix': 16,
        'min_cidr_prefix': 30,
        'availability_zones': ['AD-1', 'AD-2', 'AD-3'],
        'supported_outputs': ['info', 'json', 'oci', 'terraform']
    },
    'alicloud': {
        'reserved_ip_count': 5,
        'max_cidr_prefix': 8,
        'min_cidr_prefix': 29,
        'availability_zones': ['a', 'b', 'c', 'd', 'e', 'f'],
        'supported_outputs': ['info', 'json', 'aliyun', 'terraform']
    },
    'onpremises': {
        'reserved_ip_count': 2,
        'max_cidr_prefix': 1,
        'min_cidr_prefix': 32,
        'availability_zones': [],
        'supported_outputs': ['info', 'json']
    }
}


def get_cloud_provider_config(provider: str) -> CloudProviderConfig:
    """
    Get configuration for a specific cloud provider.

    Args:
        provider: Cloud provider name (azure, aws, gcp, oracle, alicloud, onpremises)

    Returns:
        CloudProviderConfig dictionary

    Raises:
        ValueError: If provider is not supported
    """
    provider_lower = provider.lower()

    if provider_lower not in CLOUD_PROVIDERS:
        available = ', '.join(CLOUD_PROVIDERS.keys())
        raise ValueError(
            f"Unsupported cloud provider: {provider}. "
            f"Available providers: {available}"
        )

    return CLOUD_PROVIDERS[provider_lower]


def validate_output_format(provider: str, output_format: str) -> bool:
    """
    Validate that an output format is supported for a provider.

    Args:
        provider: Cloud provider name
        output_format: Desired output format

    Returns:
        True if supported, False otherwise
    """
    try:
        config = get_cloud_provider_config(provider)
        return output_format in config['supported_outputs']
    except ValueError:
        return False


def get_availability_zone(provider: str, index: int) -> str:
    """
    Get availability zone for a subnet based on round-robin distribution.

    Args:
        provider: Cloud provider name
        index: Subnet index (0-based)

    Returns:
        Availability zone string
    """
    config = get_cloud_provider_config(provider)
    zones = config['availability_zones']

    if not zones:
        return ''

    return zones[index % len(zones)]
