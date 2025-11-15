#!/usr/bin/env python3
"""
Example client for IP Calculator API

Demonstrates how to use the API to:
1. List supported providers
2. Calculate subnets
3. Generate network diagrams
"""

import requests
import json
import sys


API_BASE_URL = "http://localhost:8000"


def list_providers():
    """List all supported cloud providers"""
    print("\n=== Supported Providers ===")
    response = requests.get(f"{API_BASE_URL}/api/providers")
    response.raise_for_status()

    providers = response.json()["providers"]
    print(f"Providers: {', '.join(providers)}")
    return providers


def calculate_subnets(provider, cidr, subnet_count, prefix=None):
    """Calculate subnets for a network"""
    print(f"\n=== Calculating Subnets for {provider.upper()} ===")
    print(f"Network: {cidr}")
    print(f"Requested subnets: {subnet_count}")

    payload = {
        "provider": provider,
        "cidr": cidr,
        "subnets": subnet_count
    }

    if prefix:
        payload["prefix"] = prefix
        print(f"Subnet prefix: /{prefix}")

    response = requests.post(f"{API_BASE_URL}/api/calculate", json=payload)
    response.raise_for_status()

    data = response.json()

    # Display network info
    network = data["network"]
    print(f"\nNetwork Information:")
    print(f"  Network Address: {network['network']}")
    print(f"  Total IPs: {network['totalIPs']:,}")
    print(f"  IP Range: {network['firstIP']} - {network['lastIP']}")

    # Display subnet info
    print(f"\nSubnets ({len(data['subnets'])}):")
    for i, subnet in enumerate(data['subnets'], 1):
        print(f"\n  Subnet {i}:")
        print(f"    CIDR: {subnet['cidr']}")
        print(f"    Mask: {subnet['mask']}")
        print(f"    Total IPs: {subnet['totalIPs']}")
        print(f"    Usable IPs: {subnet['usableIPs']}")
        print(f"    Usable Range: {subnet['usableRange']}")
        if subnet.get('availabilityZone'):
            print(f"    Availability Zone: {subnet['availabilityZone']}")
        print(f"    Reserved: {', '.join(subnet['reserved'])}")

    return data


def generate_diagram(provider, cidr, subnet_count, diagram_type="simple", output_file=None):
    """Generate network diagram code"""
    print(f"\n=== Generating {diagram_type.title()} Diagram for {provider.upper()} ===")

    payload = {
        "provider": provider,
        "cidr": cidr,
        "subnets": subnet_count,
        "diagram_type": diagram_type
    }

    response = requests.post(f"{API_BASE_URL}/api/diagram/code", json=payload)
    response.raise_for_status()

    data = response.json()

    print(f"\nDescription: {data['description']}")
    print(f"\nExecution Instructions:")
    print(data['execution_instructions'])

    # Save to file if specified
    if output_file:
        with open(output_file, 'w') as f:
            f.write(data['python_code'])
        print(f"\nDiagram code saved to: {output_file}")
        print(f"Run with: python {output_file}")
    else:
        print("\nGenerated Python Code:")
        print("=" * 80)
        print(data['python_code'])
        print("=" * 80)

    return data


def main():
    """Main example workflow"""
    try:
        # Check if API is running
        response = requests.get(f"{API_BASE_URL}/health")
        response.raise_for_status()
        print("✓ API is healthy and running")

        # List providers
        providers = list_providers()

        # Example 1: Azure Virtual Network
        calculate_subnets(
            provider="azure",
            cidr="10.0.0.0/16",
            subnet_count=4,
            prefix=24
        )

        # Example 2: AWS VPC with automatic subnet sizing
        calculate_subnets(
            provider="aws",
            cidr="172.16.0.0/16",
            subnet_count=6
        )

        # Example 3: Generate Azure diagram
        generate_diagram(
            provider="azure",
            cidr="10.0.0.0/16",
            subnet_count=4,
            diagram_type="detailed",
            output_file="azure_network_diagram.py"
        )

        print("\n✓ All examples completed successfully!")
        print("\nTo run the generated diagram:")
        print("  1. pip install diagrams")
        print("  2. Install Graphviz (see README.md)")
        print("  3. python azure_network_diagram.py")

    except requests.exceptions.ConnectionError:
        print(f"✗ Error: Could not connect to API at {API_BASE_URL}")
        print("  Make sure the API server is running:")
        print("  cd api && python main.py")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"✗ HTTP Error: {e}")
        if hasattr(e.response, 'text'):
            print(f"  Response: {e.response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
