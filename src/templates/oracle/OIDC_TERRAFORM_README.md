# Oracle Cloud OIDC Terraform Setup

This directory contains Terraform configuration for setting up OpenID Connect (OIDC) authentication between GitHub Actions and Oracle Cloud Infrastructure (OCI).

## Files

- `oidc-setup.tf` - Main Terraform configuration for OIDC setup
- `oidc-setup.tfvars.example` - Example variables file
- `OIDC_TERRAFORM_README.md` - This file

## Prerequisites

1. **Terraform** installed (version 1.0 or later)
2. **OCI CLI** configured with administrator credentials
3. **Tenancy OCID** and **Compartment OCID**
4. **GitHub organization and repository** information

## Quick Start

### 1. Set up your variables file

Copy the example variables file and customize it:

```bash
cp oidc-setup.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
tenancy_ocid     = "ocid1.tenancy.oc1..your-tenancy-ocid"
compartment_ocid = "ocid1.compartment.oc1..your-compartment-ocid"
github_org       = "your-github-org"
github_repo      = "your-repo-name"
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review the plan

```bash
terraform plan
```

### 4. Apply the configuration

```bash
terraform apply
```

### 5. Note the outputs

After successful apply, Terraform will output the important values you need:

```
Outputs:

identity_provider_id = "ocid1.identityprovider.oc1..xxxxx"
dynamic_group_name = "github-actions-dg"
github_secrets_summary = {
  OCI_TENANCY_OCID = "ocid1.tenancy.oc1..xxxxx"
  OCI_COMPARTMENT_OCID = "ocid1.compartment.oc1..xxxxx"
  OCI_IDENTITY_PROVIDER_OCID = "ocid1.identityprovider.oc1..xxxxx"
  OCI_REGION = "Set your preferred region (e.g., us-phoenix-1)"
}
```

### 6. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

- `OCI_TENANCY_OCID`
- `OCI_COMPARTMENT_OCID`
- `OCI_IDENTITY_PROVIDER_OCID`
- `OCI_REGION` (e.g., `us-phoenix-1`)

## Configuration Options

### Repository-Specific Access (Recommended)

Grant access to a specific repository:

```hcl
github_org          = "myorg"
github_repo         = "myrepo"
use_org_wide_access = false
```

### Organization-Wide Access

Grant access to all repositories in an organization:

```hcl
github_org          = "myorg"
use_org_wide_access = true
```

### Branch Restriction

Restrict access to a specific branch (e.g., only production deployments from main):

```hcl
restrict_to_branch = "refs/heads/main"
```

### Additional Permissions

Grant additional OCI permissions beyond the defaults:

```hcl
additional_policy_statements = [
  "Allow dynamic-group github-actions-dg to manage object-family in compartment id ${var.compartment_ocid}",
  "Allow dynamic-group github-actions-dg to use secret-family in compartment id ${var.compartment_ocid}",
  "Allow dynamic-group github-actions-dg to manage database-family in compartment id ${var.compartment_ocid}"
]
```

### Custom Resource Names

Customize the names of created resources:

```hcl
identity_provider_name = "MyGitHubProvider"
dynamic_group_name     = "my-github-dg"
policy_name            = "my-github-policy"
```

## Default Permissions

By default, the Dynamic Group is granted the following permissions in the specified compartment:

- **Virtual Network Management**: Create and manage VCNs, subnets, security lists, route tables
- **Compute Management**: Create and manage compute instances
- **Volume Management**: Create and manage block volumes
- **Compartment Inspection**: View compartment details

These permissions are suitable for infrastructure deployment workflows.

## Security Best Practices

1. **Use Repository-Specific Access**: Set `use_org_wide_access = false` and specify `github_repo`
2. **Restrict to Production Branches**: Use `restrict_to_branch = "refs/heads/main"` for production
3. **Separate Environments**: Create different Dynamic Groups for dev, staging, and production
4. **Least Privilege**: Only grant necessary permissions via `additional_policy_statements`
5. **Use Separate Compartments**: Deploy to isolated compartments per environment

## Example: Multi-Environment Setup

Create separate OIDC configurations for different environments:

**production.tfvars:**
```hcl
tenancy_ocid          = "ocid1.tenancy.oc1..xxxxx"
compartment_ocid      = "ocid1.compartment.oc1..prod-compartment"
github_org            = "myorg"
github_repo           = "myrepo"
restrict_to_branch    = "refs/heads/main"
dynamic_group_name    = "github-actions-prod-dg"
policy_name           = "github-actions-prod-policy"
```

**development.tfvars:**
```hcl
tenancy_ocid          = "ocid1.tenancy.oc1..xxxxx"
compartment_ocid      = "ocid1.compartment.oc1..dev-compartment"
github_org            = "myorg"
github_repo           = "myrepo"
dynamic_group_name    = "github-actions-dev-dg"
policy_name           = "github-actions-dev-policy"
```

Apply each separately:
```bash
terraform apply -var-file="production.tfvars"
terraform apply -var-file="development.tfvars"
```

## GitHub Actions Workflow Example

After applying the Terraform and configuring GitHub secrets, use this workflow:

```yaml
name: Deploy to OCI

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Authenticate to Oracle Cloud
        uses: oracle-actions/configure-oci-cli@v1
        with:
          tenancy: ${{ secrets.OCI_TENANCY_OCID }}
          region: ${{ secrets.OCI_REGION }}
          auth-type: 'workload-identity'
          workload-identity-provider: ${{ secrets.OCI_IDENTITY_PROVIDER_OCID }}

      - name: Verify Authentication
        run: |
          oci os ns get
          echo "Successfully authenticated to OCI!"

      - name: Deploy Infrastructure
        run: |
          # Your deployment commands here
          terraform init
          terraform apply -auto-approve
```

## Troubleshooting

### Authentication Failures

If GitHub Actions cannot authenticate:

1. Verify the Identity Provider OCID in GitHub secrets
2. Check the Dynamic Group matching rule:
   ```bash
   terraform output dynamic_group_matching_rule
   ```
3. Ensure the repository path matches exactly (org/repo format)

### Permission Denied Errors

If authenticated but lacking permissions:

1. Review the policy statements:
   ```bash
   terraform show | grep -A 20 oci_identity_policy
   ```
2. Add required permissions via `additional_policy_statements`
3. Ensure you're operating in the correct compartment

### Identity Provider Issues

If the Identity Provider creation fails:

1. Check if one already exists with the same name
2. Verify your OCI credentials have tenancy-level permissions
3. Ensure the GitHub OIDC discovery URL is accessible

## Cleanup

To remove all created resources:

```bash
terraform destroy
```

**Warning:** This will delete the Identity Provider, Dynamic Group, and Policy. Make sure no workflows are actively using this OIDC configuration.

## Additional Resources

- [Oracle Cloud OIDC Setup Guide](../../../docs/ORACLE_CLOUD_OIDC_SETUP.md) - Detailed manual setup guide
- [OCI Terraform Provider Documentation](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [oracle-actions/configure-oci-cli](https://github.com/oracle-actions/configure-oci-cli)

## Support

For issues or questions:
- Review the [ORACLE_CLOUD_OIDC_SETUP.md](../../../docs/ORACLE_CLOUD_OIDC_SETUP.md) documentation
- Check OCI Audit Logs for authentication attempts
- Verify Dynamic Group matching rules match your workflow's token claims
