"""
IP Calculator module - Python port of the TypeScript CLI logic
"""
import ipaddress
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CloudProviderConfig:
    """Configuration for cloud provider network characteristics"""
    reserved_ips: int
    min_subnet_size: int
    max_cidr: int
    availability_zones: List[str]
    description: str


# Cloud provider configurations matching the TypeScript version
PROVIDER_CONFIGS = {
    "azure": CloudProviderConfig(
        reserved_ips=5,
        min_subnet_size=29,
        max_cidr=8,
        availability_zones=["Zone 1", "Zone 2", "Zone 3"],
        description="Azure VNet"
    ),
    "aws": CloudProviderConfig(
        reserved_ips=5,
        min_subnet_size=28,
        max_cidr=16,
        availability_zones=["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1e", "us-east-1f"],
        description="AWS VPC"
    ),
    "gcp": CloudProviderConfig(
        reserved_ips=4,
        min_subnet_size=29,
        max_cidr=8,
        availability_zones=["us-central1", "us-east1", "us-west1", "europe-west1", "asia-east1"],
        description="GCP VPC"
    ),
    "oracle": CloudProviderConfig(
        reserved_ips=3,
        min_subnet_size=30,
        max_cidr=16,
        availability_zones=["AD-1", "AD-2", "AD-3"],
        description="Oracle VCN"
    ),
    "alicloud": CloudProviderConfig(
        reserved_ips=4,
        min_subnet_size=29,
        max_cidr=8,
        availability_zones=["cn-hangzhou-a", "cn-hangzhou-b", "cn-hangzhou-c", "cn-hangzhou-d", "cn-hangzhou-e", "cn-hangzhou-f"],
        description="Alibaba Cloud VPC"
    ),
    "onpremises": CloudProviderConfig(
        reserved_ips=2,
        min_subnet_size=30,
        max_cidr=8,
        availability_zones=[],
        description="On-Premises Network"
    )
}


@dataclass
class ReservedIP:
    """Reserved IP address with description"""
    ip: str
    description: str


@dataclass
class SubnetInfo:
    """Information about a calculated subnet"""
    name: str
    network_address: str
    cidr: str
    subnet_mask: str
    total_ips: int
    usable_ips: int
    reserved_ips: List[ReservedIP]
    usable_range: str
    availability_zone: str


@dataclass
class NetworkCalculation:
    """Complete network calculation result"""
    provider: str
    vpc_cidr: str
    vpc_network_address: str
    vpc_subnet_mask: str
    vpc_total_ips: int
    subnets: List[SubnetInfo]
    subnet_prefix: int


def cidr_to_subnet_mask(prefix: int) -> str:
    """Convert CIDR prefix to subnet mask string"""
    mask = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
    return f"{(mask >> 24) & 0xFF}.{(mask >> 16) & 0xFF}.{(mask >> 8) & 0xFF}.{mask & 0xFF}"


def get_reserved_ips(network: ipaddress.IPv4Network, provider: str) -> List[ReservedIP]:
    """Get reserved IP addresses based on provider"""
    hosts = list(network.hosts())
    network_addr = str(network.network_address)
    broadcast_addr = str(network.broadcast_address)

    reserved = []

    if provider == "azure":
        reserved = [
            ReservedIP(network_addr, "Network address"),
            ReservedIP(str(hosts[0]) if hosts else network_addr, "Reserved by Azure for default gateway"),
            ReservedIP(str(hosts[1]) if len(hosts) > 1 else network_addr, "Reserved by Azure (DNS)"),
            ReservedIP(str(hosts[2]) if len(hosts) > 2 else network_addr, "Reserved by Azure (DNS)"),
            ReservedIP(broadcast_addr, "Broadcast address"),
        ]
    elif provider == "aws":
        reserved = [
            ReservedIP(network_addr, "Network address"),
            ReservedIP(str(hosts[0]) if hosts else network_addr, "Reserved by AWS for VPC router"),
            ReservedIP(str(hosts[1]) if len(hosts) > 1 else network_addr, "Reserved by AWS for DNS"),
            ReservedIP(str(hosts[2]) if len(hosts) > 2 else network_addr, "Reserved by AWS for future use"),
            ReservedIP(broadcast_addr, "Broadcast address"),
        ]
    elif provider == "gcp":
        reserved = [
            ReservedIP(network_addr, "Network address"),
            ReservedIP(str(hosts[0]) if hosts else network_addr, "Reserved by GCP for gateway"),
            ReservedIP(str(hosts[-1]) if hosts else broadcast_addr, "Reserved by GCP"),
            ReservedIP(broadcast_addr, "Broadcast address"),
        ]
    elif provider == "oracle":
        reserved = [
            ReservedIP(network_addr, "Network address"),
            ReservedIP(str(hosts[0]) if hosts else network_addr, "Reserved by Oracle for gateway"),
            ReservedIP(broadcast_addr, "Broadcast address"),
        ]
    elif provider == "alicloud":
        reserved = [
            ReservedIP(network_addr, "Network address"),
            ReservedIP(str(hosts[0]) if hosts else network_addr, "Reserved by Alibaba for gateway"),
            ReservedIP(str(hosts[1]) if len(hosts) > 1 else network_addr, "Reserved by Alibaba"),
            ReservedIP(broadcast_addr, "Broadcast address"),
        ]
    else:  # onpremises
        reserved = [
            ReservedIP(network_addr, "Network address"),
            ReservedIP(broadcast_addr, "Broadcast address"),
        ]

    return reserved


def calculate_optimal_prefix(vpc_prefix: int, num_subnets: int, provider: str) -> int:
    """Calculate optimal subnet prefix for the given number of subnets"""
    config = PROVIDER_CONFIGS[provider]

    # Calculate bits needed for subnets
    import math
    bits_needed = math.ceil(math.log2(num_subnets)) if num_subnets > 1 else 0
    optimal_prefix = vpc_prefix + bits_needed

    # Ensure we don't exceed minimum subnet size
    if optimal_prefix > config.min_subnet_size:
        optimal_prefix = config.min_subnet_size

    return optimal_prefix


def calculate_network(
    provider: str,
    cidr: str,
    num_subnets: int,
    custom_prefix: Optional[int] = None
) -> NetworkCalculation:
    """
    Calculate network subnets for a given provider and CIDR

    Args:
        provider: Cloud provider name (azure, aws, gcp, oracle, alicloud, onpremises)
        cidr: VPC/VNet CIDR in format "x.x.x.x/y"
        num_subnets: Number of subnets to create (1-256)
        custom_prefix: Optional custom subnet prefix length

    Returns:
        NetworkCalculation with all subnet details
    """
    if provider not in PROVIDER_CONFIGS:
        raise ValueError(f"Invalid provider: {provider}. Must be one of {list(PROVIDER_CONFIGS.keys())}")

    config = PROVIDER_CONFIGS[provider]

    # Parse VPC CIDR
    try:
        vpc_network = ipaddress.IPv4Network(cidr, strict=False)
    except ValueError as e:
        raise ValueError(f"Invalid CIDR: {cidr}. {str(e)}")

    vpc_prefix = vpc_network.prefixlen

    # Validate CIDR
    if vpc_prefix > config.min_subnet_size:
        raise ValueError(f"VPC CIDR /{vpc_prefix} is too small. Minimum is /{config.min_subnet_size}")

    if vpc_prefix < config.max_cidr:
        raise ValueError(f"VPC CIDR /{vpc_prefix} is too large. Maximum is /{config.max_cidr}")

    # Validate subnet count
    if num_subnets < 1 or num_subnets > 256:
        raise ValueError("Number of subnets must be between 1 and 256")

    # Calculate subnet prefix
    if custom_prefix:
        subnet_prefix = custom_prefix
        if subnet_prefix < vpc_prefix:
            raise ValueError(f"Subnet prefix /{subnet_prefix} cannot be larger than VPC prefix /{vpc_prefix}")
        if subnet_prefix > config.min_subnet_size:
            raise ValueError(f"Subnet prefix /{subnet_prefix} exceeds minimum subnet size /{config.min_subnet_size}")
    else:
        subnet_prefix = calculate_optimal_prefix(vpc_prefix, num_subnets, provider)

    # Calculate subnets
    try:
        all_subnets = list(vpc_network.subnets(new_prefix=subnet_prefix))
    except ValueError as e:
        raise ValueError(f"Cannot create subnets: {str(e)}")

    if len(all_subnets) < num_subnets:
        raise ValueError(f"Cannot fit {num_subnets} subnets with prefix /{subnet_prefix} in VPC {cidr}")

    # Create subnet info for requested number
    subnets = []
    for i in range(num_subnets):
        subnet = all_subnets[i]
        total_ips = subnet.num_addresses
        usable_ips = total_ips - config.reserved_ips
        if usable_ips < 0:
            usable_ips = 0

        # Get reserved IPs
        reserved = get_reserved_ips(subnet, provider)

        # Calculate usable range
        hosts = list(subnet.hosts())
        if provider in ["azure", "aws"]:
            first_usable = hosts[3] if len(hosts) > 3 else hosts[0] if hosts else subnet.network_address
            last_usable = hosts[-1] if hosts else subnet.broadcast_address
        elif provider == "gcp":
            first_usable = hosts[1] if len(hosts) > 1 else hosts[0] if hosts else subnet.network_address
            last_usable = hosts[-2] if len(hosts) > 2 else hosts[-1] if hosts else subnet.broadcast_address
        elif provider == "oracle":
            first_usable = hosts[1] if len(hosts) > 1 else hosts[0] if hosts else subnet.network_address
            last_usable = hosts[-1] if hosts else subnet.broadcast_address
        elif provider == "alicloud":
            first_usable = hosts[2] if len(hosts) > 2 else hosts[0] if hosts else subnet.network_address
            last_usable = hosts[-1] if hosts else subnet.broadcast_address
        else:  # onpremises
            first_usable = hosts[0] if hosts else subnet.network_address
            last_usable = hosts[-1] if hosts else subnet.broadcast_address

        usable_range = f"{first_usable} - {last_usable}"

        # Assign availability zone
        az = ""
        if config.availability_zones:
            az = config.availability_zones[i % len(config.availability_zones)]

        subnet_info = SubnetInfo(
            name=f"Subnet-{i + 1}",
            network_address=str(subnet.network_address),
            cidr=str(subnet),
            subnet_mask=cidr_to_subnet_mask(subnet.prefixlen),
            total_ips=total_ips,
            usable_ips=usable_ips,
            reserved_ips=reserved,
            usable_range=usable_range,
            availability_zone=az
        )
        subnets.append(subnet_info)

    return NetworkCalculation(
        provider=provider,
        vpc_cidr=str(vpc_network),
        vpc_network_address=str(vpc_network.network_address),
        vpc_subnet_mask=cidr_to_subnet_mask(vpc_network.prefixlen),
        vpc_total_ips=vpc_network.num_addresses,
        subnets=subnets,
        subnet_prefix=subnet_prefix
    )
