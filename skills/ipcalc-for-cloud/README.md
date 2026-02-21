# ipcalc-for-cloud

IP Calculator for Cloud Network Generation - Skill implementation

## Overview

A Python implementation of the ipcalc IP calculator for cloud networks. This skill calculates IP ranges, CIDR blocks, and subnet allocations for cloud network planning.

### Key Features

- **CIDR Subnet Calculations**: Performs subnet splitting and allocation
- **Multi-Provider Support**: Azure, AWS, GCP, Oracle Cloud, AliCloud, and on-premises
- **Hub-Spoke Topologies**: Optional hub-spoke network architecture with peering
- **Availability Zone Distribution**: Automatic AZ distribution for AWS and GCP
- **Provider-Specific Configuration**: Handles reserved IPs and constraints per provider
- **Multiple Output Formats**: Info tables, JSON, and Infrastructure-as-Code templates

### Supported Output Formats

- **Info**: Human-readable formatted tables
- **JSON**: Structured data for integration
- **Terraform**: HCL infrastructure code
- **CloudFormation**: AWS-specific templates
- **Bicep**: Azure Resource Manager templates
- **ARM**: Azure Resource Manager JSON
- **PowerShell**: Azure PowerShell scripts
- **CLI Scripts**: Provider-specific CLI commands (az, aws, gcloud, oci, aliyun)

## Requirements

- Python 3.9+
- No external runtime dependencies (uses Python standard library only)

## Development

### Install Dependencies

```bash
pip install -r requirements-dev.txt
```

### Run Tests

```bash
pytest scripts/test_ipcalc.py -v --cov=scripts
```

## Usage

### Basic Example

```bash
python scripts/ipcalc.py --provider azure --cidr "10.0.0.0/16" --subnets 4
```

### Custom Subnet Prefix

```bash
python scripts/ipcalc.py --provider azure --cidr "172.16.1.0/24" --subnets 4 --prefix 26
```

### Hub-Spoke Topology

```bash
python scripts/ipcalc.py \
  --provider azure \
  --cidr "10.0.0.0/16" \
  --subnets 2 \
  --spoke-cidrs "10.1.0.0/16,10.2.0.0/16" \
  --spoke-subnets "2,2" \
  --output terraform
```

### Output to File

```bash
python scripts/ipcalc.py --provider aws --cidr "10.0.0.0/16" --subnets 3 --output terraform --file main.tf
```

## Architecture

### Main Components

- **ipcalc.py**: Core IP calculation engine
- **cloud_provider_config.py**: Provider-specific configurations and constraints
- **template_processor.py**: Infrastructure-as-Code template rendering
- **test_ipcalc.py**: Comprehensive test suite

## Documentation

For detailed usage information, see [USAGE.md](./USAGE.md)

For implementation details, see [SKILL.md](./SKILL.md)

For feature comparison with other tools, see [FEATURE_COMPARISON.md](./FEATURE_COMPARISON.md)
