#!/usr/bin/env python3
"""
IP Calculator for Cloud Network Generation

Calculates CIDR blocks for cloud networks (VNet/VPC) and subnets.
Supports multiple cloud providers and output formats.
Matches TypeScript CLI implementation.
"""

import argparse
import ipaddress
import json
import sys
import os
from typing import List, Dict, Any, Optional
import math

from cloud_provider_config import (
    get_cloud_provider_config,
    validate_output_format,
    get_availability_zone,
    CLOUD_PROVIDERS
)

try:
    from template_processor import process_template
    TEMPLATE_PROCESSOR_AVAILABLE = True
except ImportError:
    TEMPLATE_PROCESSOR_AVAILABLE = False


def calculate_prefix_length(base_network: ipaddress.IPv4Network, num_divisions: int) -> int:
    """
    Calculate the prefix length needed to divide a network into num_divisions subnets.

    Args:
        base_network: The base network to divide
        num_divisions: Number of subnets needed

    Returns:
        New prefix length
    """
    if num_divisions <= 0:
        raise ValueError("Number of divisions must be positive")

    # Calculate bits needed
    bits_needed = math.ceil(math.log2(num_divisions))
    new_prefix = base_network.prefixlen + bits_needed

    if new_prefix > 32:
        raise ValueError(
            f"Cannot divide {base_network} into {num_divisions} subnets. "
            f"Would require /{new_prefix} which exceeds /32"
        )

    return new_prefix


def split_network(network: ipaddress.IPv4Network, num_subnets: int) -> List[ipaddress.IPv4Network]:
    """
    Split a network into num_subnets equal-sized subnets.

    Args:
        network: The network to split
        num_subnets: Number of subnets to create

    Returns:
        List of subnet networks
    """
    new_prefix = calculate_prefix_length(network, num_subnets)
    subnets = list(network.subnets(new_prefix=new_prefix))
    return subnets[:num_subnets]


def calculate_network_info(network: ipaddress.IPv4Network, provider_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate detailed information about a network.

    Args:
        network: The network to analyze
        provider_config: Cloud provider configuration

    Returns:
        Dictionary with network information
    """
    reserved_count = provider_config['reserved_ip_count']
    total_ips = network.num_addresses

    # Calculate usable IPs based on provider-specific reserved IPs
    if network.prefixlen < 31:
        usable_ips = total_ips - reserved_count
    else:
        usable_ips = total_ips

    # Calculate first and last usable IPs
    if network.prefixlen < 31:
        reserved_first = math.ceil(reserved_count / 2)
        reserved_last = math.floor(reserved_count / 2)
        first_usable = str(network.network_address + reserved_first)
        last_usable = str(network.broadcast_address - reserved_last)
    else:
        first_usable = str(network.network_address)
        last_usable = str(network.broadcast_address)

    return {
        "cidr": str(network),
        "network": str(network.network_address),
        "network_address": str(network.network_address),
        "broadcast_address": str(network.broadcast_address),
        "netmask": str(network.netmask),
        "mask": str(network.netmask),
        "prefix_length": network.prefixlen,
        "total_ips": total_ips,
        "totalIPs": total_ips,  # Alias for compatibility
        "usable_ips": usable_ips,
        "usableIPs": usable_ips,  # Alias for compatibility
        "first_usable": first_usable,
        "firstIP": str(network.network_address),
        "last_usable": last_usable,
        "lastIP": str(network.broadcast_address),
        "usable_range": f"{first_usable} - {last_usable}",
        "usableRange": f"{first_usable} - {last_usable}",  # Alias for compatibility
    }


def calculate_subnets(
    cidr: str,
    num_subnets: int,
    provider: str,
    desired_subnet_prefix: Optional[int] = None
) -> Dict[str, Any]:
    """
    Calculate subnets for a given network CIDR.
    Matches TypeScript calculateSubnets function.

    Args:
        cidr: Network CIDR (e.g., "10.0.0.0/16")
        num_subnets: Number of subnets to create
        provider: Cloud provider name
        desired_subnet_prefix: Optional custom subnet prefix (e.g., 26 for /26)

    Returns:
        Dictionary with subnets array and optional error message
    """
    config = get_cloud_provider_config(provider)

    # Parse base network
    try:
        base_network = ipaddress.ip_network(cidr, strict=False)
    except ValueError as e:
        return {
            "subnets": [],
            "error": f"Invalid CIDR notation. Use format: 10.0.0.0/16. Error: {e}"
        }

    base_prefix = base_network.prefixlen

    if num_subnets < 1 or num_subnets > 256:
        return {
            "subnets": [],
            "error": "Number of subnets must be between 1 and 256"
        }

    # Determine subnet prefix
    if desired_subnet_prefix is not None and desired_subnet_prefix > 0:
        subnet_prefix = desired_subnet_prefix

        # Validate the desired prefix
        if subnet_prefix < base_prefix:
            return {
                "subnets": [],
                "error": f"Desired subnet prefix /{subnet_prefix} is larger than network prefix /{base_prefix}. "
                        f"Subnet must be smaller than or equal to network."
            }

        if subnet_prefix > config['min_cidr_prefix']:
            return {
                "subnets": [],
                "error": f"Desired subnet prefix /{subnet_prefix} is smaller than cloud provider minimum "
                        f"/{config['min_cidr_prefix']}."
            }

        if subnet_prefix < config['max_cidr_prefix']:
            return {
                "subnets": [],
                "error": f"Desired subnet prefix /{subnet_prefix} is larger than cloud provider maximum "
                        f"/{config['max_cidr_prefix']}."
            }

        # Check capacity
        total_ips = base_network.num_addresses
        subnet_size = 2 ** (32 - subnet_prefix)
        max_possible_subnets = total_ips // subnet_size

        if max_possible_subnets < num_subnets:
            return {
                "subnets": [],
                "error": f"Cannot create {num_subnets} subnets with prefix /{subnet_prefix} in a "
                        f"/{base_prefix} network. Maximum possible: {max_possible_subnets} subnet(s). "
                        f"Use a larger prefix (smaller subnets) or reduce the number of subnets."
            }
    else:
        # Calculate required prefix automatically
        bits_needed = math.ceil(math.log2(num_subnets))
        subnet_prefix = base_prefix + bits_needed

        # Check against cloud provider minimum
        if subnet_prefix > config['min_cidr_prefix']:
            return {
                "subnets": [],
                "error": f"Cannot divide /{base_prefix} into {num_subnets} subnets. Each subnet would be "
                        f"smaller than /{config['min_cidr_prefix']} (cloud provider minimum)."
            }

        if subnet_prefix > 32:
            return {
                "subnets": [],
                "error": f"Cannot divide /{base_prefix} into {num_subnets} subnets. Not enough address space."
            }

    # Calculate subnets
    try:
        subnet_networks = split_network(base_network, num_subnets)
    except ValueError as e:
        # If desired prefix was specified, create subnets manually
        if desired_subnet_prefix:
            subnet_networks = []
            subnet_size = 2 ** (32 - subnet_prefix)
            network_num = int(base_network.network_address)

            for i in range(num_subnets):
                subnet_network_num = network_num + (i * subnet_size)
                subnet_cidr = f"{ipaddress.IPv4Address(subnet_network_num)}/{subnet_prefix}"
                subnet_networks.append(ipaddress.ip_network(subnet_cidr))
        else:
            return {"subnets": [], "error": str(e)}

    # Build subnet info list
    subnets = []
    for idx, subnet_network in enumerate(subnet_networks):
        subnet_info = calculate_network_info(subnet_network, config)
        subnet_info["name"] = f"subnet{idx + 1}"
        subnet_info["index"] = idx + 1

        # Add availability zone
        az = get_availability_zone(provider, idx)
        subnet_info["availabilityZone"] = az
        subnet_info["availability_zone"] = az
        subnet_info["zone"] = az
        subnet_info["region"] = az
        subnet_info["availabilityDomain"] = az

        # Calculate reserved IPs
        reserved = []
        reserved_count = config['reserved_ip_count']
        reserved_first = math.ceil(reserved_count / 2)
        reserved_last = math.floor(reserved_count / 2)

        # First reserved IPs
        for j in range(reserved_first):
            reserved.append(str(subnet_network.network_address + j))

        # Last reserved IPs
        for j in range(reserved_last, 0, -1):
            reserved.append(str(subnet_network.broadcast_address - j + 1))

        subnet_info["reserved"] = reserved

        subnets.append(subnet_info)

    return {"subnets": subnets}


def generate_hub_spoke_topology(
    hub_cidr: str,
    hub_subnets: int,
    spoke_cidrs: List[str],
    spoke_subnets_list: List[int],
    provider: str,
    hub_prefix: Optional[int] = None
) -> Dict[str, Any]:
    """
    Generate hub-spoke network topology.

    Args:
        hub_cidr: Hub VNet/VPC CIDR
        hub_subnets: Number of subnets in hub
        spoke_cidrs: List of spoke VNet/VPC CIDRs
        spoke_subnets_list: List of subnet counts for each spoke
        provider: Cloud provider name
        hub_prefix: Optional custom subnet prefix for hub

    Returns:
        Dictionary with hub and spokes information
    """
    # Calculate hub network
    hub_result = calculate_subnets(hub_cidr, hub_subnets, provider, hub_prefix)
    if "error" in hub_result:
        return {"error": f"Hub network error: {hub_result['error']}"}

    config = get_cloud_provider_config(provider)
    hub_network_info = calculate_network_info(ipaddress.ip_network(hub_cidr, strict=False), config)

    hub = {
        "cidr": hub_cidr,
        "subnets": hub_result["subnets"],
        "network_info": hub_network_info
    }

    # Calculate spoke networks
    spokes = []
    for idx, spoke_cidr in enumerate(spoke_cidrs):
        spoke_subnet_count = spoke_subnets_list[idx] if idx < len(spoke_subnets_list) else 2

        spoke_result = calculate_subnets(spoke_cidr, spoke_subnet_count, provider)
        if "error" in spoke_result:
            return {"error": f"Spoke {idx + 1} error: {spoke_result['error']}"}

        spoke_network_info = calculate_network_info(
            ipaddress.ip_network(spoke_cidr, strict=False),
            config
        )

        spokes.append({
            "cidr": spoke_cidr,
            "numberOfSubnets": spoke_subnet_count,
            "vnetInfo": spoke_network_info,
            "subnets": spoke_result["subnets"],
            "index": idx + 1
        })

    return {
        "hub": hub,
        "spokes": spokes,
        "peeringEnabled": len(spokes) > 0
    }


def format_network_info(cidr: str, subnets: List[Dict[str, Any]], provider: str) -> str:
    """Format network information as human-readable text."""
    config = get_cloud_provider_config(provider)
    network = ipaddress.ip_network(cidr, strict=False)
    network_info = calculate_network_info(network, config)

    output = '\n'
    output += '═══════════════════════════════════════════════════════════\n'
    output += f'  Network Information - {provider.upper()}\n'
    output += '═══════════════════════════════════════════════════════════\n\n'
    output += f'  Network Address:  {network_info["network"]}\n'
    output += f'  CIDR Notation:    {cidr}\n'
    output += f'  Total IPs:        {network_info["total_ips"]:,}\n'
    output += f'  Address Range:    {network_info["firstIP"]} - {network_info["lastIP"]}\n'
    output += f'  Subnets:          {len(subnets)}\n\n'

    output += '───────────────────────────────────────────────────────────\n'
    output += '  Subnet Details\n'
    output += '───────────────────────────────────────────────────────────\n\n'

    for subnet in subnets:
        output += f'  Subnet {subnet["index"]}:\n'
        output += f'    CIDR:           {subnet["cidr"]}\n'
        output += f'    Network:        {subnet["network"]}\n'
        output += f'    Mask:           {subnet["mask"]}\n'
        output += f'    Total IPs:      {subnet["total_ips"]}\n'
        output += f'    Usable IPs:     {subnet["usable_ips"]}\n'
        output += f'    Usable Range:   {subnet["usable_range"]}\n'

        if provider in ['azure', 'aws']:
            output += f'    AZ/Zone:        {subnet.get("availabilityZone", "")}\n'
        elif provider == 'gcp':
            output += f'    Region:         {subnet.get("region", "")}\n'
        elif provider == 'oracle':
            output += f'    AD:             {subnet.get("availabilityDomain", "")}\n'
        elif provider == 'alicloud':
            output += f'    Zone:           {subnet.get("zone", "")}\n'

        output += f'    Reserved IPs:   {", ".join(subnet["reserved"])}\n'
        output += '\n'

    output += '═══════════════════════════════════════════════════════════\n\n'

    return output


def main():
    parser = argparse.ArgumentParser(
        description="IP Calculator for Cloud Network Generation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Show network information
  %(prog)s --provider azure --cidr 10.0.0.0/16 --subnets 4

  # Use custom subnet prefix
  %(prog)s --provider azure --cidr 172.16.1.0/24 --subnets 4 --prefix 26

  # Generate Terraform for AWS
  %(prog)s --provider aws --cidr 10.0.0.0/16 --subnets 3 --output terraform

  # Hub-spoke topology for Azure
  %(prog)s --provider azure --cidr 10.0.0.0/16 --subnets 2 \\
    --spoke-cidrs "10.1.0.0/16,10.2.0.0/16" --spoke-subnets "2,2" \\
    --output terraform
        """
    )

    # Required arguments
    parser.add_argument(
        "--provider",
        required=True,
        choices=list(CLOUD_PROVIDERS.keys()),
        help="Cloud provider"
    )
    parser.add_argument(
        "--cidr",
        required=True,
        help="Network CIDR (e.g., 10.0.0.0/16)"
    )
    parser.add_argument(
        "--subnets",
        type=int,
        required=True,
        help="Number of subnets to create (1-256)"
    )

    # Optional arguments
    parser.add_argument(
        "--prefix",
        type=int,
        help="Desired subnet CIDR prefix (e.g., 26 for /26)"
    )
    parser.add_argument(
        "--output",
        default="info",
        help="Output type (default: info)"
    )
    parser.add_argument(
        "--file",
        help="Write output to file instead of stdout"
    )

    # Hub-spoke topology options
    parser.add_argument(
        "--spoke-cidrs",
        help="Comma-separated list of spoke VPC/VNET CIDRs"
    )
    parser.add_argument(
        "--spoke-subnets",
        help="Comma-separated list of subnet counts per spoke"
    )

    # Legacy compatibility
    parser.add_argument(
        "--base-cidr",
        help="(Legacy) Alias for --cidr"
    )
    args = parser.parse_args()

    # Handle legacy arguments
    if args.base_cidr and not args.cidr:
        args.cidr = args.base_cidr

    # Validate output format for provider
    if not validate_output_format(args.provider, args.output):
        config = get_cloud_provider_config(args.provider)
        supported = ', '.join(config['supported_outputs'])
        print(f"Error: Invalid output type for {args.provider}. Supported: {supported}", file=sys.stderr)
        sys.exit(1)

    # Validate hub-spoke options
    spoke_cidrs = []
    spoke_subnets_list = []

    if args.spoke_cidrs:
        if args.provider not in ['azure', 'gcp']:
            print(
                f"Error: Hub-spoke topology is only supported for Azure and GCP, not {args.provider}",
                file=sys.stderr
            )
            sys.exit(1)

        spoke_cidrs = [c.strip() for c in args.spoke_cidrs.split(',')]

        if args.spoke_subnets:
            spoke_subnets_list = [int(s.strip()) for s in args.spoke_subnets.split(',')]
            if len(spoke_subnets_list) != len(spoke_cidrs):
                print("Error: Number of spoke subnet counts must match number of spoke CIDRs", file=sys.stderr)
                sys.exit(1)
        else:
            spoke_subnets_list = [2] * len(spoke_cidrs)

    try:
        # Calculate network
        if spoke_cidrs:
            # Hub-spoke topology
            result = generate_hub_spoke_topology(
                args.cidr,
                args.subnets,
                spoke_cidrs,
                spoke_subnets_list,
                args.provider,
                args.prefix
            )

            if "error" in result:
                print(f"Error: {result['error']}", file=sys.stderr)
                sys.exit(1)

            subnets = result["hub"]["subnets"]
            spoke_vnets = result["spokes"]
        else:
            # Single VNet/VPC
            result = calculate_subnets(args.cidr, args.subnets, args.provider, args.prefix)

            if "error" in result:
                print(f"Error: {result['error']}", file=sys.stderr)
                sys.exit(1)

            subnets = result["subnets"]
            spoke_vnets = []

        # Generate output
        if args.output == "info":
            output = format_network_info(args.cidr, subnets, args.provider)
        elif args.output == "json":
            # JSON output
            output_data = {
                "vnetCidr": args.cidr,
                "provider": args.provider,
                "subnets": subnets,
                "peeringEnabled": len(spoke_vnets) > 0
            }
            if spoke_vnets:
                if args.provider == 'azure':
                    output_data["spokeVNets"] = spoke_vnets
                elif args.provider == 'gcp':
                    output_data["spokeVPCs"] = spoke_vnets
            output = json.dumps(output_data, indent=2)
        elif args.output in ['terraform', 'bicep', 'arm', 'powershell', 'cli', 'cloudformation', 'gcloud', 'oci', 'aliyun']:
            # Template-based output formats
            if not TEMPLATE_PROCESSOR_AVAILABLE:
                print("Error: Template processor not available. Install required dependencies.", file=sys.stderr)
                sys.exit(1)

            # Prepare data for template
            output_data = {
                "vnetCidr": args.cidr,
                "vpcCidr": args.cidr,  # AWS uses vpcCidr
                "subnets": subnets,
                "peeringEnabled": len(spoke_vnets) > 0
            }
            if spoke_vnets:
                if args.provider == 'azure':
                    output_data["spokeVNets"] = spoke_vnets
                elif args.provider == 'gcp':
                    output_data["spokeVPCs"] = spoke_vnets

            # Get templates directory
            script_dir = os.path.dirname(os.path.abspath(__file__))
            templates_dir = os.path.join(os.path.dirname(script_dir), 'templates')

            try:
                output = process_template(args.provider, args.output, output_data, templates_dir)
            except (FileNotFoundError, NotImplementedError) as e:
                print(f"Error: {e}", file=sys.stderr)
                print(f"Template not available for {args.provider}/{args.output}", file=sys.stderr)
                sys.exit(1)
        else:
            output = f"# Output format '{args.output}' not supported\n"
            output += "# Showing JSON data instead:\n"
            output_data = {
                "vnetCidr": args.cidr,
                "provider": args.provider,
                "subnets": subnets
            }
            output += json.dumps(output_data, indent=2)

        # Write output
        if args.file:
            with open(args.file, 'w') as f:
                f.write(output)
            print(f"Output written to: {args.file}")
        else:
            print(output)

    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
