# Feature Comparison: TypeScript CLI vs Python Implementation

## Status: Full Parity

Both implementations support all 6 cloud providers with identical output formats, topology options, and CLI flags.

## Feature Matrix

| Feature | TypeScript | Python | Notes |
|---------|-----------|--------|-------|
| **Cloud Providers** | | | |
| Azure | ✅ | ✅ | Full support |
| AWS | ✅ | ✅ | Full support |
| GCP | ✅ | ✅ | Full support |
| Oracle | ✅ | ✅ | Full support |
| AliCloud | ✅ | ✅ | Full support |
| On-Premises | ✅ | ✅ | info/json only |
| **Output Formats** | | | |
| info (table) | ✅ | ✅ | All providers |
| json | ✅ | ✅ | All providers |
| terraform | ✅ | ✅ | Azure, AWS, GCP, Oracle, AliCloud |
| bicep | ✅ | ✅ | Azure only |
| arm | ✅ | ✅ | Azure only |
| powershell | ✅ | ✅ | Azure only |
| cli | ✅ | ✅ | Azure, AWS |
| cloudformation | ✅ | ✅ | AWS only |
| gcloud | ✅ | ✅ | GCP only |
| oci | ✅ | ✅ | Oracle only |
| aliyun | ✅ | ✅ | AliCloud only |
| **Topology** | | | |
| Single VNet/VPC | ✅ | ✅ | All providers |
| Hub-spoke | Azure + GCP | Azure + GCP | Bidirectional peering |
| **CLI Flags** | | | |
| `--provider` / `-p` | ✅ | ✅ | |
| `--cidr` / `-c` | ✅ | ✅ | |
| `--subnets` / `-s` | ✅ | ✅ | |
| `--subnet-prefix` | ✅ | ✅ | Custom subnet CIDR prefix |
| `--prefix` | ✅ | ✅ | Resource naming prefix (default: `ipcalc`) |
| `--output` / `-o` | ✅ | ✅ | Default: `info` |
| `--file` / `-f` | ✅ | ✅ | Write output to file |
| `--spoke-cidrs` | ✅ | ✅ | Hub-spoke: comma-separated CIDRs |
| `--spoke-subnets` | ✅ | ✅ | Hub-spoke: subnet counts per spoke |
| **Other** | | | |
| Custom subnet prefix (`--subnet-prefix`) | ✅ | ✅ | Override auto-calculated size |
| AZ round-robin distribution | ✅ | ✅ | Provider-specific zone lists |
| Provider-specific reserved IPs | ✅ | ✅ | Azure/AWS: 5, GCP: 4, Oracle: 3, AliCloud: 4 |

## CI/CD Validation Coverage

| Provider | CLI Test Workflow | Skill Test Workflow | Terraform Validated |
|----------|------------------|---------------------|---------------------|
| Azure | `cli-test-azure-vnet.yml` | `skill-network-test-azure.yml` | ✅ |
| AWS | `cli-test-aws-vpc.yml` | `skill-network-test-aws.yml` | ✅ |
| GCP | `cli-test-gcp-vpc.yml` | `skill-network-test-gcp.yml` | ✅ |
| Oracle | `cli-test-oci-vcn.yml` | `skill-network-test-oci.yml` | ✅ |
| AliCloud | `cli-test-alicloud-vswitch.yml` | `skill-network-test-alicloud.yml` | ✅ |

All five cloud provider CLI and skill workflows include `terraform init`, `terraform validate`, and full deploy/destroy cycles.

## Remaining Gaps

### Output Parity Validation
Python outputs have not been formally diff'd against TypeScript CLI outputs for exact match. Minor formatting differences may exist.

## Architecture

Both implementations share the same design:
- **Single VNet/VPC** with N subnets (not N separate VNets)
- **Hub-spoke** via `--spoke-cidrs` / `--spoke-subnets` flags (Azure + GCP only, up to 10 spokes, bidirectional peering)
- **Template-based** output with `{{placeholder}}` syntax
- **Provider-specific** reserved IP counts and AZ round-robin distribution

### Python-only differences
- `--base-cidr` legacy alias accepted (maps to `--cidr`)
