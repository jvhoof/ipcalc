# Feature Comparison: TypeScript CLI vs Python Implementation

## Status: Near Parity

The Python implementation now closely mirrors the TypeScript CLI. The main remaining gap is formal output parity validation.

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
| info (table) | ✅ | ✅ | |
| json | ✅ | ✅ | |
| terraform | ✅ | ✅ | All 5 cloud providers |
| bicep | ✅ | ✅ | Azure only |
| arm | ✅ | ✅ | Azure only |
| powershell | ✅ | ✅ | Azure only |
| cli | ✅ | ✅ | Azure, AWS |
| cloudformation | ✅ | ✅ | AWS only |
| gcloud | ✅ | ✅ | GCP only |
| oci | ✅ | ✅ | Oracle only |
| aliyun | ✅ | ✅ | AliCloud only |
| **Topology** | | | |
| Single VNet/VPC | ✅ | ✅ | |
| Hub-spoke | Azure + GCP | Azure + GCP | Matches TS |
| **Other** | | | |
| Custom subnet prefix (`--prefix`) | ✅ | ✅ | |
| AZ round-robin distribution | ✅ | ✅ | |
| Provider-specific reserved IPs | ✅ | ✅ | |

## Remaining Gaps

### Output Parity Validation (not yet tested)
Python outputs have not been diff'd against TypeScript CLI outputs for exact match. There may be minor formatting differences.

### Terraform Validation
`terraform validate` confirmed for Azure and AWS. GCP, Oracle, AliCloud not yet run.

## Architecture

Both implementations share the same design:
- **Single VNet/VPC** with N subnets (not N separate VNets)
- **Hub-spoke** via `--spoke-cidrs` / `--spoke-subnets` flags (Azure + GCP only)
- **Template-based** output with `{{placeholder}}` syntax
- **Provider-specific** reserved IP counts and AZ round-robin distribution

### Python-only differences
- `--base-cidr` legacy alias accepted (maps to `--cidr`)
- `onpremises` provider available (TS has no equivalent)
