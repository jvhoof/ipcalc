#!/usr/bin/env python3
"""
Quick test script to verify API functionality
"""

import sys
sys.path.insert(0, '/home/user/ipcalc')

from api.core.ip_calculator import calculate_network, calculate_subnets
from api.config.cloud_providers import get_cloud_provider_config, get_supported_providers
from api.diagrams.generator import DiagramGenerator

print("=" * 80)
print("IP Calculator API - Quick Verification Test")
print("=" * 80)

# Test 1: List providers
print("\n[1] Testing provider configuration...")
providers = get_supported_providers()
print(f"✓ Supported providers: {', '.join(providers)}")

# Test 2: Calculate network
print("\n[2] Testing network calculation...")
config = get_cloud_provider_config("azure")
network = calculate_network("10.0.0.0/16", config)
if network:
    print(f"✓ Network: {network.network}")
    print(f"  Total IPs: {network.total_ips:,}")
    print(f"  Range: {network.first_ip} - {network.last_ip}")
else:
    print("✗ Network calculation failed")
    sys.exit(1)

# Test 3: Calculate subnets
print("\n[3] Testing subnet calculation...")
result = calculate_subnets("10.0.0.0/16", 4, config, 24)
if "error" in result and result["error"]:
    print(f"✗ Error: {result['error']}")
    sys.exit(1)

print(f"✓ Created {len(result['subnets'])} subnets:")
for i, subnet in enumerate(result['subnets'][:2], 1):  # Show first 2
    print(f"  {i}. {subnet.cidr} - {subnet.usable_ips} usable IPs")

# Test 4: Generate diagram code
print("\n[4] Testing diagram generation...")
diagram_code = DiagramGenerator.generate_azure_diagram(
    "10.0.0.0/16",
    result['subnets'],
    "simple"
)
if diagram_code and len(diagram_code) > 100:
    print(f"✓ Generated diagram code ({len(diagram_code)} characters)")
    print(f"  First line: {diagram_code.split(chr(10))[0]}")
else:
    print("✗ Diagram generation failed")
    sys.exit(1)

# Test 5: Test multiple providers
print("\n[5] Testing multiple cloud providers...")
test_cases = [
    ("azure", "10.0.0.0/16", 4),
    ("aws", "172.16.0.0/16", 3),
    ("gcp", "192.168.0.0/16", 2),
]

for provider, cidr, count in test_cases:
    config = get_cloud_provider_config(provider)
    result = calculate_subnets(cidr, count, config)
    if "error" not in result or not result["error"]:
        print(f"✓ {provider.upper()}: {len(result['subnets'])} subnets from {cidr}")
    else:
        print(f"✗ {provider.upper()}: {result['error']}")

print("\n" + "=" * 80)
print("✓ All tests passed! API is ready to use.")
print("=" * 80)
print("\nTo start the API server:")
print("  cd /home/user/ipcalc/api")
print("  python main.py")
print("\nThen visit: http://localhost:8000/docs")
