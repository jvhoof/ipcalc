# IP Calculator for Cloud - Usage Guide

This guide explains how to use the IP calculator Python script for cloud network planning.

> **Note**: This tool matches the TypeScript CLI implementation. It creates a single VNet/VPC with multiple subnets and supports hub-spoke topologies for Azure and GCP.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Running the Script](#running-the-script)
- [Command-Line Options](#command-line-options)
- [Cloud Provider Support](#cloud-provider-support)
- [Usage Examples](#usage-examples)
- [Hub-Spoke Topology](#hub-spoke-topology)
- [Output Formats](#output-formats)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Prerequisites

The script uses Python 3's standard library and has no external dependencies.

**Required:**
- Python 3.6 or higher

## Running the Script

The script is located at `scripts/ipcalc.py` and can be run directly from the command line.

### Basic Syntax

```bash
python3 scripts/ipcalc.py --provider PROVIDER --cidr CIDR --subnets N [OPTIONS]
```

### Making the Script Executable (Optional)

```bash
chmod +x scripts/ipcalc.py
./scripts/ipcalc.py --provider azure --cidr "10.0.0.0/16" --subnets 4
```

## Command-Line Options

### Required Options

| Option | Description | Example |
|--------|-------------|---------|
| `--provider` | Cloud provider (azure, aws, gcp, oracle, alicloud, onpremises) | `azure` |
| `--cidr` | Network CIDR block | `10.0.0.0/16` |
| `--subnets` | Number of subnets to create (1-256) | `4` |

### Optional Options

| Option | Description | Example |
|--------|-------------|---------|
| `--prefix` | Custom subnet CIDR prefix (e.g., 26 for /26) | `26` |
| `--output` | Output format (info, json, terraform, etc.) | `terraform` |
| `--file` | Write output to file instead of stdout | `output.tf` |
| `--spoke-cidrs` | Comma-separated spoke VNet/VPC CIDRs (hub-spoke) | `10.1.0.0/16,10.2.0.0/16` |
| `--spoke-subnets` | Comma-separated subnet counts per spoke | `2,2` |

## Cloud Provider Support

Each cloud provider has specific configurations:

| Provider | Reserved IPs | CIDR Range | Supported Outputs |
|----------|--------------|------------|-------------------|
| **Azure** | 5 | /8 to /29 | info, json, terraform, bicep, arm, powershell, cli |
| **AWS** | 5 | /16 to /28 | info, json, terraform, cloudformation, cli |
| **GCP** | 4 | /8 to /29 | info, json, terraform, gcloud |
| **Oracle** | 3 | /16 to /30 | info, json, terraform, oci |
| **AliCloud** | 5 | /8 to /29 | info, json, terraform, aliyun |
| **On-Premises** | 2 | /1 to /32 | info, json |

**Note:** Currently, only Azure and AWS Terraform templates are fully implemented. Other formats are pending.

## Usage Examples

### Example 1: Basic Azure Network Info

```bash
python3 scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 4
```

**Output:** Human-readable table with Azure VNet and 4 subnets, AZ distribution, reserved IPs

### Example 2: AWS with Custom Subnet Prefix

```bash
python3 scripts/ipcalc.py \
  --provider aws \
  --cidr "172.16.1.0/24" \
  --subnets 4 \
  --prefix 26 \
  --output info
```

**Output:** 4 subnets with /26 prefix (64 IPs each), distributed across AWS AZs

### Example 3: Generate Terraform for Azure

```bash
python3 scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 3 \
  --output terraform \
  --file azure-network.tf
```

**Output:** Terraform file with Azure provider, VNet, 3 subnets, variables, outputs

### Example 4: AWS with JSON Output

```bash
python3 scripts/ipcalc.py \
  --provider aws \
  --cidr "192.168.0.0/16" \
  --subnets 6 \
  --output json
```

**Output:** JSON with subnet details, AZ assignments, reserved IPs

### Example 5: GCP Network Planning

```bash
python3 scripts/ipcalc.py \
  --provider gcp \
  --cidr "10.0.0.0/20" \
  --subnets 4 \
  --output info
```

**Output:** Info table with GCP VPC and subnets with region distribution

## Hub-Spoke Topology

Create hub-spoke network architectures (Azure and GCP only):

### Example 6: Azure Hub-Spoke with 3 Spokes

```bash
python3 scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 2 \
  --spoke-cidrs "10.1.0.0/16,10.2.0.0/16,10.3.0.0/16" \
  --spoke-subnets "2,2,2" \
  --output terraform
```

**Output:** Terraform with:
- Hub VNet (10.0.0.0/16) with 2 subnets
- 3 Spoke VNets with 2 subnets each
- Bidirectional peering between hub and all spokes

### Example 7: GCP Hub-Spoke

```bash
python3 scripts/ipcalc.py \
  --provider gcp \
  --cidr "172.16.0.0/12" \
  --subnets 3 \
  --spoke-cidrs "172.20.0.0/16,172.21.0.0/16" \
  --spoke-subnets "3,3" \
  --output json
```

**Output:** JSON with hub VPC and 2 spoke VPCs with peering configuration

## Output Formats

### Info Format (Default)

Human-readable table format showing:
- Network information (CIDR, total IPs, address range)
- Subnet details for each subnet:
  - CIDR notation
  - Network address and mask
  - Total and usable IP counts
  - Usable IP range
  - Availability zone/region assignment
  - Reserved IP addresses

### JSON Format

Structured JSON output including:
- `vnetCidr` (or `vpcCidr` for AWS): Base network CIDR
- `provider`: Cloud provider name
- `subnets`: Array of subnet objects with:
  - `cidr`: Subnet CIDR notation
  - `network`: Network address
  - `mask`: Subnet mask
  - `totalIPs`: Total IP addresses
  - `usableIPs`: Usable IP addresses
  - `usableRange`: Range of usable IPs
  - `availabilityZone`/`region`: AZ/region assignment
  - `reserved`: Array of reserved IP addresses
- `peeringEnabled`: Boolean indicating if hub-spoke is configured
- `spokeVNets` (Azure) or `spokeVPCs` (GCP): Spoke network details (if applicable)

### Terraform Format

Infrastructure-as-Code templates:
- **Azure**: Complete Terraform configuration with provider, resource group, VNet, subnets, and optional spoke VNets with peering
- **AWS**: Complete Terraform configuration with provider, VPC, subnets with AZ distribution
- **Others**: Planned for future implementation

### Other Formats

- **Bicep** (Azure): Planned
- **ARM** (Azure): Planned
- **PowerShell** (Azure): Planned
- **CloudFormation** (AWS): Planned
- **gcloud** (GCP): Planned
- **oci** (Oracle): Planned
- **aliyun** (AliCloud): Planned

## Testing

### Unit Test Suite

A comprehensive unit test suite is available at `scripts/test_ipcalc.py`.

#### Running Tests

```bash
# Run all tests with verbose output
python3 scripts/test_ipcalc.py -v

# Run with standard unittest
python3 -m unittest scripts/test_ipcalc.py

# Run specific test class
python3 -m unittest test_ipcalc.TestCloudProviderConfig

# Run specific test method
python3 -m unittest test_ipcalc.TestCalculateSubnets.test_basic_azure_subnets
```

#### Test Coverage

The test suite includes 33 tests covering:

1. **Cloud Provider Configuration** (6 tests)
   - Provider config validation
   - Reserved IP counts
   - Output format validation

2. **Subnet Calculation** (9 tests)
   - Basic subnet division
   - Custom prefix handling
   - Provider-specific calculations
   - Error handling

3. **Hub-Spoke Topology** (3 tests)
   - Azure hub-spoke generation
   - GCP hub-spoke generation
   - Spoke subnet allocation

4. **Network Information** (4 tests)
   - Network info calculation
   - Reserved IP allocation
   - Provider-specific details

5. **Output Formats** (2 tests)
   - Info format generation
   - JSON output structure

6. **Edge Cases** (4 tests)
   - Insufficient capacity
   - Invalid inputs
   - Boundary conditions

7. **Provider-Specific Behaviors** (4 tests)
   - Azure reserved IPs
   - AWS AZ distribution
   - Provider constraints

#### Expected Output

```
----------------------------------------------------------------------
Ran 33 tests in 0.003s

OK
```

## Best Practices

1. **Review allocations** carefully before deploying (validation is automatic)
2. **Use info output** for quick reviews and documentation
3. **Use JSON output** when piping to other tools or scripts
4. **Use Terraform output** for infrastructure deployment
5. **Test edge cases** before deploying to production environments
6. **Document assumptions** about network sizes and growth
7. **Consider future growth** when selecting base CIDR blocks
8. **Use custom prefix** (`--prefix`) to avoid filling entire network space

## Troubleshooting

### Error: "Cannot divide X into Y subnets"

**Problem:** Your base CIDR is too small for the requested number of subnets

**Solution:** Use a larger base CIDR or reduce the number of subnets

Example:
```bash
# Error: Cannot divide /24 into 16 subnets
python3 scripts/ipcalc.py --provider azure --cidr "10.0.0.0/24" --subnets 16

# Solution: Use larger CIDR
python3 scripts/ipcalc.py --provider azure --cidr "10.0.0.0/20" --subnets 16
```

### Error: "Invalid CIDR notation"

**Problem:** CIDR uses invalid IP address format or prefix length

**Solution:**
- Check IP address format (e.g., "10.0.0.0")
- Ensure prefix length is between 0 and 32
- Use proper CIDR notation (e.g., "10.0.0.0/16")

### Error: "Invalid output type for [provider]"

**Problem:** Requested output format is not supported for the provider

**Solution:** Check supported outputs for your provider (see Cloud Provider Support table above)

Example:
```bash
# Error: bicep not available for AWS
python3 scripts/ipcalc.py --provider aws --cidr "10.0.0.0/16" --subnets 4 --output bicep

# Solution: Use supported format
python3 scripts/ipcalc.py --provider aws --cidr "10.0.0.0/16" --subnets 4 --output terraform
```

### Error: "Template not available"

**Problem:** Template processor not implemented for the requested provider/format combination

**Solution:** Currently only Azure and AWS Terraform templates are fully implemented. Use `info` or `json` output, or switch to a supported combination.

## Integration Examples

### Save Output to File

```bash
python3 scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 4 \
  --output json \
  --file network_plan.json
```

### Process with jq

```bash
python3 scripts/ipcalc.py \
  --provider aws \
  --cidr "10.0.0.0/16" \
  --subnets 6 \
  --output json | jq '.subnets[].cidr'
```

### Use in Shell Scripts

```bash
#!/bin/bash
RESULT=$(python3 scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 4 \
  --output json)

if [ $? -eq 0 ]; then
    echo "Calculation successful"
    echo "$RESULT" | jq .
else
    echo "Calculation failed"
    exit 1
fi
```

### Generate Multiple Networks

```bash
#!/bin/bash
# Generate separate networks for different environments

python3 scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 4 \
  --output terraform \
  --file prod-network.tf

python3 scripts/ipcalc.py \
  --provider azure \
  --cidr "10.1.0.0/16" \
  --subnets 4 \
  --output terraform \
  --file dev-network.tf

python3 scripts/ipcalc.py \
  --provider azure \
  --cidr "10.2.0.0/16" \
  --subnets 4 \
  --output terraform \
  --file test-network.tf
```
