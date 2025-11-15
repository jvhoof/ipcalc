"""
IP Calculator Core Logic
Ported from TypeScript implementation
"""

import math
from typing import List, Optional, Dict, Any, Tuple
from ipaddress import IPv4Network, IPv4Address, AddressValueError
from api.config.cloud_providers import CloudProviderConfig


class NetworkInfo:
    """Information about a network"""
    def __init__(self, network: str, total_ips: int, first_ip: str, last_ip: str):
        self.network = network
        self.total_ips = total_ips
        self.first_ip = first_ip
        self.last_ip = last_ip

    def to_dict(self) -> Dict[str, Any]:
        return {
            "network": self.network,
            "totalIPs": self.total_ips,
            "firstIP": self.first_ip,
            "lastIP": self.last_ip
        }


class SubnetInfo:
    """Information about a subnet"""
    def __init__(
        self,
        network: str,
        cidr: str,
        mask: str,
        total_ips: int,
        usable_ips: int,
        reserved: List[str],
        usable_range: str,
        availability_zone: Optional[str] = None,
        region: Optional[str] = None,
        availability_domain: Optional[str] = None,
        zone: Optional[str] = None
    ):
        self.network = network
        self.cidr = cidr
        self.mask = mask
        self.total_ips = total_ips
        self.usable_ips = usable_ips
        self.reserved = reserved
        self.usable_range = usable_range
        self.availability_zone = availability_zone
        self.region = region
        self.availability_domain = availability_domain
        self.zone = zone

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "network": self.network,
            "cidr": self.cidr,
            "mask": self.mask,
            "totalIPs": self.total_ips,
            "usableIPs": self.usable_ips,
            "reserved": self.reserved,
            "usableRange": self.usable_range
        }
        if self.availability_zone:
            result["availabilityZone"] = self.availability_zone
        if self.region:
            result["region"] = self.region
        if self.availability_domain:
            result["availabilityDomain"] = self.availability_domain
        if self.zone:
            result["zone"] = self.zone
        return result


def parse_ip(ip: str) -> Optional[List[int]]:
    """Parse IP address string into array of octets"""
    parts = ip.split('.')
    if len(parts) != 4:
        return None

    try:
        octets = [int(part) for part in parts]
        if any(octet < 0 or octet > 255 for octet in octets):
            return None
        return octets
    except ValueError:
        return None


def parse_cidr(cidr: str, min_prefix: int, max_prefix: int) -> Optional[Dict[str, Any]]:
    """Parse CIDR notation into IP and prefix"""
    parts = cidr.split('/')
    if len(parts) != 2:
        return None

    ip = parse_ip(parts[0])
    try:
        prefix = int(parts[1])
    except ValueError:
        return None

    if not ip or prefix < min_prefix or prefix > max_prefix:
        return None

    return {"ip": ip, "prefix": prefix}


def ip_to_number(ip: List[int]) -> int:
    """Convert IP array to number"""
    return (ip[0] << 24) + (ip[1] << 16) + (ip[2] << 8) + ip[3]


def number_to_ip(num: int) -> List[int]:
    """Convert number to IP array"""
    return [
        (num >> 24) & 0xFF,
        (num >> 16) & 0xFF,
        (num >> 8) & 0xFF,
        num & 0xFF
    ]


def cidr_to_mask(cidr: int) -> List[int]:
    """Convert CIDR prefix to subnet mask"""
    mask = []
    for i in range(4):
        bits = min(8, max(0, cidr - i * 8))
        mask.append((0xFF << (8 - bits)) & 0xFF)
    return mask


def calculate_network(cidr: str, config: CloudProviderConfig) -> Optional[NetworkInfo]:
    """Calculate network information"""
    parsed = parse_cidr(cidr, config.max_cidr_prefix, config.min_cidr_prefix)
    if not parsed:
        return None

    ip = parsed["ip"]
    prefix = parsed["prefix"]

    network_num = ip_to_number(ip) & (0xFFFFFFFF << (32 - prefix))
    network_ip = number_to_ip(network_num)
    total_ips = 2 ** (32 - prefix)
    last_ip_num = network_num + total_ips - 1
    last_ip = number_to_ip(last_ip_num)

    return NetworkInfo(
        network='.'.join(map(str, network_ip)),
        total_ips=total_ips,
        first_ip='.'.join(map(str, network_ip)),
        last_ip='.'.join(map(str, last_ip))
    )


def calculate_subnets(
    cidr: str,
    number_of_subnets: int,
    config: CloudProviderConfig,
    desired_subnet_prefix: Optional[int] = None
) -> Dict[str, Any]:
    """
    Calculate subnets for a given network

    Returns:
        Dictionary with 'subnets' list and optional 'error' string
    """
    parsed = parse_cidr(cidr, config.max_cidr_prefix, config.min_cidr_prefix)
    if not parsed:
        return {"subnets": [], "error": "Invalid CIDR notation. Use format: 10.0.0.0/16"}

    ip = parsed["ip"]
    prefix = parsed["prefix"]

    if number_of_subnets < 1 or number_of_subnets > 256:
        return {"subnets": [], "error": "Number of subnets must be between 1 and 256"}

    # Use desired subnet prefix if specified, otherwise calculate automatically
    if desired_subnet_prefix is not None and desired_subnet_prefix > 0:
        subnet_prefix = desired_subnet_prefix

        # Validate the desired prefix
        if subnet_prefix < prefix:
            return {
                "subnets": [],
                "error": f"Desired subnet prefix /{subnet_prefix} is larger than network prefix /{prefix}. Subnet must be smaller than or equal to network."
            }

        if subnet_prefix > config.min_cidr_prefix:
            return {
                "subnets": [],
                "error": f"Desired subnet prefix /{subnet_prefix} is smaller than cloud provider minimum /{config.min_cidr_prefix}."
            }

        if subnet_prefix < config.max_cidr_prefix:
            return {
                "subnets": [],
                "error": f"Desired subnet prefix /{subnet_prefix} is larger than cloud provider maximum /{config.max_cidr_prefix}."
            }

        # Calculate network base and total IPs to check capacity
        network_num = ip_to_number(ip) & (0xFFFFFFFF << (32 - prefix))
        total_ips = 2 ** (32 - prefix)
        subnet_size = 2 ** (32 - subnet_prefix)
        max_possible_subnets = total_ips // subnet_size

        # Check if the desired prefix can accommodate the requested number of subnets
        if max_possible_subnets < number_of_subnets:
            return {
                "subnets": [],
                "error": f"Cannot create {number_of_subnets} subnets with prefix /{subnet_prefix} in a /{prefix} network. Maximum possible: {max_possible_subnets} subnet(s). Use a larger prefix (smaller subnets) or reduce the number of subnets."
            }
    else:
        # Calculate required prefix length for subnets automatically
        bits_needed = math.ceil(math.log2(number_of_subnets))
        subnet_prefix = prefix + bits_needed

        # Check against cloud provider minimum
        if subnet_prefix > config.min_cidr_prefix:
            return {
                "subnets": [],
                "error": f"Cannot divide /{prefix} into {number_of_subnets} subnets. Each subnet would be smaller than /{config.min_cidr_prefix} (cloud provider minimum)."
            }

        if subnet_prefix > 32:
            return {
                "subnets": [],
                "error": f"Cannot divide /{prefix} into {number_of_subnets} subnets. Not enough address space."
            }

    # Calculate network base
    network_num = ip_to_number(ip) & (0xFFFFFFFF << (32 - prefix))
    total_ips = 2 ** (32 - prefix)
    subnet_size = 2 ** (32 - subnet_prefix)
    actual_number_of_subnets = min(number_of_subnets, total_ips // subnet_size)

    subnets: List[SubnetInfo] = []

    for i in range(actual_number_of_subnets):
        subnet_network_num = network_num + (i * subnet_size)
        subnet_network = number_to_ip(subnet_network_num)
        subnet_mask = cidr_to_mask(subnet_prefix)

        # Calculate reserved IPs based on cloud provider
        reserved: List[str] = []

        # First IPs (network, gateway, etc.)
        for j in range(math.ceil(config.reserved_ip_count / 2)):
            reserved.append('.'.join(map(str, number_to_ip(subnet_network_num + j))))

        # Last IPs
        for j in range(config.reserved_ip_count // 2, 0, -1):
            reserved.append('.'.join(map(str, number_to_ip(subnet_network_num + subnet_size - j))))

        usable_ips = subnet_size - config.reserved_ip_count
        first_usable_offset = math.ceil(config.reserved_ip_count / 2)
        last_usable_offset = config.reserved_ip_count // 2 + 1

        first_usable = '.'.join(map(str, number_to_ip(subnet_network_num + first_usable_offset)))
        last_usable = '.'.join(map(str, number_to_ip(subnet_network_num + subnet_size - last_usable_offset)))

        # Assign availability zone
        az_index = i % len(config.availability_zones) if config.availability_zones else 0
        az = config.availability_zones[az_index] if config.availability_zones else None

        subnets.append(SubnetInfo(
            network='.'.join(map(str, subnet_network)),
            cidr=f"{'.'.join(map(str, subnet_network))}/{subnet_prefix}",
            mask='.'.join(map(str, subnet_mask)),
            total_ips=subnet_size,
            usable_ips=usable_ips,
            reserved=reserved,
            usable_range=f"{first_usable} - {last_usable}",
            availability_zone=az,
            zone=az,
            region=az,
            availability_domain=az
        ))

    return {"subnets": subnets}
