# Oracle Cloud OIDC Setup Guide for GitHub Actions

This guide walks you through setting up OpenID Connect (OIDC) authentication between GitHub Actions and Oracle Cloud Infrastructure (OCI). This allows GitHub Actions workflows to authenticate to OCI without using long-lived API keys.

## Overview

OIDC federation in OCI allows GitHub Actions to authenticate using short-lived tokens, eliminating the need to store and manage API keys as secrets. This is accomplished through OCI's Identity Provider and Dynamic Group features.

## Prerequisites

- An OCI tenancy with administrator access
- A compartment where resources will be managed
- GitHub repository with Actions enabled
- `oci` CLI installed (optional, for command-line setup)

## Setup Steps

### 1. Gather Required Information

Before starting, collect the following information:

```bash
# Your OCI Tenancy OCID
export TENANCY_OCID="ocid1.tenancy.oc1..aaaaaa..."

# Compartment where you'll manage resources
export COMPARTMENT_OCID="ocid1.compartment.oc1..aaaaaa..."

# Your GitHub organization and repository
export GITHUB_ORG="your-github-org"
export GITHUB_REPO="your-repo-name"

# Identity Provider and Dynamic Group names
export IDENTITY_PROVIDER_NAME="GitHubActionsProvider"
export DYNAMIC_GROUP_NAME="github-actions-dg"
```

### 2. Create Identity Provider

Create an OIDC Identity Provider for GitHub Actions:

```bash
oci iam identity-provider create-idp \
  --protocol SAML2 \
  --name "${IDENTITY_PROVIDER_NAME}" \
  --description "Identity Provider for GitHub Actions OIDC" \
  --product-type "OIDC" \
  --metadata-url "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
```

**Note:** The metadata URL points to GitHub's OIDC discovery endpoint.

Or via OCI Console:
1. Navigate to **Identity & Security > Federation**
2. Click **Add Identity Provider**
3. Name: `GitHubActionsProvider`
4. Type: **OpenID Connect (OIDC)**
5. Issuer URL: `https://token.actions.githubusercontent.com`
6. Discovery URL: `https://token.actions.githubusercontent.com/.well-known/openid-configuration`
7. Click **Add Identity Provider**

### 3. Get Identity Provider OCID

After creating the identity provider, get its OCID:

```bash
IDENTITY_PROVIDER_OCID=$(oci iam identity-provider list \
  --protocol SAML2 \
  --compartment-id "${TENANCY_OCID}" \
  --query "data[?name=='${IDENTITY_PROVIDER_NAME}'].id | [0]" \
  --raw-output)

echo "Identity Provider OCID: ${IDENTITY_PROVIDER_OCID}"
```

### 4. Create Dynamic Group

Create a Dynamic Group that matches GitHub Actions tokens from your repository:

```bash
# Matching rule for a specific repository
MATCHING_RULE="ALL {resource.type='workloadidentityprincipal', resource.compartment.id='${COMPARTMENT_OCID}', workload.iss='https://token.actions.githubusercontent.com', workload.repository='${GITHUB_ORG}/${GITHUB_REPO}'}"

# Or for all repositories in your organization
# MATCHING_RULE="ALL {resource.type='workloadidentityprincipal', resource.compartment.id='${COMPARTMENT_OCID}', workload.iss='https://token.actions.githubusercontent.com', workload.repository_owner='${GITHUB_ORG}'}"

oci iam dynamic-group create \
  --compartment-id "${TENANCY_OCID}" \
  --name "${DYNAMIC_GROUP_NAME}" \
  --description "Dynamic Group for GitHub Actions" \
  --matching-rule "${MATCHING_RULE}"
```

**Matching Rule Explanation:**
- `resource.type='workloadidentityprincipal'`: Identifies OIDC workload principals
- `workload.iss`: The token issuer (GitHub Actions)
- `workload.repository`: The specific GitHub repository (org/repo format)
- `workload.repository_owner`: Alternative to match all repos in an organization

Or via OCI Console:
1. Navigate to **Identity & Security > Dynamic Groups**
2. Click **Create Dynamic Group**
3. Name: `github-actions-dg`
4. Description: `Dynamic Group for GitHub Actions`
5. Matching Rules: Add the matching rule above
6. Click **Create**

### 5. Create Policy for Dynamic Group

Grant the Dynamic Group permissions to manage compute and network resources:

```bash
# Create policy for network and compute management
oci iam policy create \
  --compartment-id "${COMPARTMENT_OCID}" \
  --name "github-actions-policy" \
  --description "Policy for GitHub Actions Dynamic Group" \
  --statements '[
    "Allow dynamic-group '${DYNAMIC_GROUP_NAME}' to manage virtual-network-family in compartment id '${COMPARTMENT_OCID}'",
    "Allow dynamic-group '${DYNAMIC_GROUP_NAME}' to manage instance-family in compartment id '${COMPARTMENT_OCID}'",
    "Allow dynamic-group '${DYNAMIC_GROUP_NAME}' to manage volume-family in compartment id '${COMPARTMENT_OCID}'",
    "Allow dynamic-group '${DYNAMIC_GROUP_NAME}' to inspect compartments in compartment id '${COMPARTMENT_OCID}'"
  ]'
```

**Policy Statements Explanation:**
- `manage virtual-network-family`: Allows creating/managing VCNs, subnets, security lists, route tables
- `manage instance-family`: Allows creating/managing compute instances
- `manage volume-family`: Allows creating/managing block volumes
- `inspect compartments`: Allows viewing compartment details

For more restrictive permissions, you can use specific verbs like `use`, `read`, or `inspect` instead of `manage`.

Or via OCI Console:
1. Navigate to **Identity & Security > Policies**
2. Ensure you're in the correct compartment
3. Click **Create Policy**
4. Name: `github-actions-policy`
5. Description: `Policy for GitHub Actions Dynamic Group`
6. Policy Builder: Switch to **Manual Editor**
7. Add the policy statements above
8. Click **Create**

### 6. Configure GitHub Repository Secrets

Add the following secrets to your GitHub repository:

1. Navigate to your GitHub repository
2. Go to **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `OCI_TENANCY_OCID` | `ocid1.tenancy.oc1..aaaaaa...` | Your OCI tenancy OCID |
| `OCI_COMPARTMENT_OCID` | `ocid1.compartment.oc1..aaaaaa...` | Compartment OCID for resources |
| `OCI_REGION` | `us-phoenix-1` | OCI region identifier |
| `OCI_IDENTITY_PROVIDER_OCID` | `ocid1.identityprovider.oc1..aaaaaa...` | Identity Provider OCID |

**Note:** You do NOT need to store API keys or user credentials as secrets when using OIDC.

### 7. Update GitHub Actions Workflow

Configure your GitHub Actions workflow to use OIDC authentication:

```yaml
name: OCI Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write  # Required for OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Oracle Cloud
        uses: oracle-actions/configure-oci-cli@v1
        with:
          tenancy: ${{ secrets.OCI_TENANCY_OCID }}
          region: ${{ secrets.OCI_REGION }}
          auth-type: 'workload-identity'
          workload-identity-provider: ${{ secrets.OCI_IDENTITY_PROVIDER_OCID }}

      - name: Verify OCI authentication
        run: |
          oci os ns get
          oci iam compartment list --compartment-id ${{ secrets.OCI_TENANCY_OCID }} --limit 1

      - name: Deploy infrastructure
        run: |
          # Your deployment commands here
          echo "Deploying to OCI..."
```

**Important Workflow Configuration:**
- `permissions.id-token: write`: Required to request OIDC tokens
- `auth-type: 'workload-identity'`: Specifies OIDC authentication
- No API keys or credentials needed in the workflow

### 8. Test the Configuration

Run the workflow to test the OIDC authentication:

1. Go to **Actions** in your GitHub repository
2. Select your workflow
3. Click **Run workflow**
4. Monitor the execution and verify authentication succeeds

## Troubleshooting

### Common Issues

#### 1. "Authentication failed" errors

**Problem:** OIDC token not being accepted

**Solution:** Verify the Dynamic Group matching rule:
```bash
oci iam dynamic-group get --dynamic-group-id <dynamic-group-ocid>
```

Check that the matching rule includes the correct repository path and issuer URL.

#### 2. "Permission denied" errors

**Problem:** Dynamic Group lacks necessary permissions

**Solution:** Review the policy statements:
```bash
oci iam policy get --policy-id <policy-ocid>
```

Ensure the policy grants sufficient permissions for your use case.

#### 3. "Identity Provider not found"

**Problem:** Identity Provider OCID is incorrect or missing

**Solution:** List identity providers:
```bash
oci iam identity-provider list --protocol SAML2 --compartment-id "${TENANCY_OCID}"
```

Verify the OCID matches what's in GitHub secrets.

#### 4. "Invalid token" errors

**Problem:** GitHub Actions token claims don't match Dynamic Group rules

**Solution:** Review the token claims. The token from GitHub Actions includes:
- `iss`: `https://token.actions.githubusercontent.com`
- `repository`: `org/repo`
- `repository_owner`: `org`
- `workflow`: workflow name
- `ref`: git ref (branch/tag)

Ensure your matching rule aligns with these claims.

## Security Best Practices

1. **Least Privilege**: Grant only the minimum required permissions to the Dynamic Group
2. **Specific Matching Rules**: Use repository-specific matching rules rather than organization-wide when possible
3. **Compartment Isolation**: Use separate compartments for different environments (dev, staging, prod)
4. **Audit Logging**: Enable OCI Audit logging to monitor Dynamic Group usage
5. **Regular Reviews**: Periodically review and update policies and matching rules
6. **Token Scope**: Consider adding additional claims to matching rules (e.g., specific workflow names or git refs)

## Advanced Configuration

### Restricting to Specific Branches

You can restrict authentication to specific branches:

```bash
MATCHING_RULE="ALL {
  resource.type='workloadidentityprincipal',
  resource.compartment.id='${COMPARTMENT_OCID}',
  workload.iss='https://token.actions.githubusercontent.com',
  workload.repository='${GITHUB_ORG}/${GITHUB_REPO}',
  workload.ref='refs/heads/main'
}"
```

### Multiple Dynamic Groups for Different Environments

Create separate Dynamic Groups and policies for different environments:

```bash
# Production Dynamic Group - only main branch
oci iam dynamic-group create \
  --name "github-actions-prod-dg" \
  --matching-rule "ALL {resource.type='workloadidentityprincipal', workload.ref='refs/heads/main'}"

# Development Dynamic Group - all branches
oci iam dynamic-group create \
  --name "github-actions-dev-dg" \
  --matching-rule "ALL {resource.type='workloadidentityprincipal', workload.repository='${GITHUB_ORG}/${GITHUB_REPO}'}"
```

## Additional Resources

- [OCI Identity and Access Management Documentation](https://docs.oracle.com/en-us/iaas/Content/Identity/home.htm)
- [OCI Dynamic Groups](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingdynamicgroups.htm)
- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [oracle-actions/configure-oci-cli](https://github.com/oracle-actions/configure-oci-cli)

## Complete Setup Script

Here's a complete script to automate the entire setup:

```bash
#!/bin/bash
set -e

# Configuration
export TENANCY_OCID="ocid1.tenancy.oc1..your-tenancy-ocid"
export COMPARTMENT_OCID="ocid1.compartment.oc1..your-compartment-ocid"
export GITHUB_ORG="your-github-org"
export GITHUB_REPO="your-repo-name"
export IDENTITY_PROVIDER_NAME="GitHubActionsProvider"
export DYNAMIC_GROUP_NAME="github-actions-dg"
export POLICY_NAME="github-actions-policy"

echo "Setting up OCI OIDC for GitHub Actions..."
echo "Tenancy: ${TENANCY_OCID}"
echo "Compartment: ${COMPARTMENT_OCID}"
echo "GitHub Org: ${GITHUB_ORG}"
echo "GitHub Repo: ${GITHUB_REPO}"

# Create Identity Provider
echo "Creating Identity Provider..."
oci iam identity-provider create-idp \
  --protocol SAML2 \
  --name "${IDENTITY_PROVIDER_NAME}" \
  --description "Identity Provider for GitHub Actions OIDC" \
  --product-type "OIDC" \
  --metadata-url "https://token.actions.githubusercontent.com/.well-known/openid-configuration" \
  || echo "Identity Provider may already exist"

# Get Identity Provider OCID
IDENTITY_PROVIDER_OCID=$(oci iam identity-provider list \
  --protocol SAML2 \
  --compartment-id "${TENANCY_OCID}" \
  --query "data[?name=='${IDENTITY_PROVIDER_NAME}'].id | [0]" \
  --raw-output)

echo "Identity Provider OCID: ${IDENTITY_PROVIDER_OCID}"

# Create Dynamic Group
echo "Creating Dynamic Group..."
MATCHING_RULE="ALL {resource.type='workloadidentityprincipal', resource.compartment.id='${COMPARTMENT_OCID}', workload.iss='https://token.actions.githubusercontent.com', workload.repository='${GITHUB_ORG}/${GITHUB_REPO}'}"

oci iam dynamic-group create \
  --compartment-id "${TENANCY_OCID}" \
  --name "${DYNAMIC_GROUP_NAME}" \
  --description "Dynamic Group for GitHub Actions" \
  --matching-rule "${MATCHING_RULE}" \
  || echo "Dynamic Group may already exist"

# Create Policy
echo "Creating Policy..."
oci iam policy create \
  --compartment-id "${COMPARTMENT_OCID}" \
  --name "${POLICY_NAME}" \
  --description "Policy for GitHub Actions Dynamic Group" \
  --statements "[
    \"Allow dynamic-group ${DYNAMIC_GROUP_NAME} to manage virtual-network-family in compartment id ${COMPARTMENT_OCID}\",
    \"Allow dynamic-group ${DYNAMIC_GROUP_NAME} to manage instance-family in compartment id ${COMPARTMENT_OCID}\",
    \"Allow dynamic-group ${DYNAMIC_GROUP_NAME} to manage volume-family in compartment id ${COMPARTMENT_OCID}\",
    \"Allow dynamic-group ${DYNAMIC_GROUP_NAME} to inspect compartments in compartment id ${COMPARTMENT_OCID}\"
  ]" \
  || echo "Policy may already exist"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Add these secrets to your GitHub repository:"
echo ""
echo "OCI_TENANCY_OCID: ${TENANCY_OCID}"
echo "OCI_COMPARTMENT_OCID: ${COMPARTMENT_OCID}"
echo "OCI_REGION: us-phoenix-1  (or your preferred region)"
echo "OCI_IDENTITY_PROVIDER_OCID: ${IDENTITY_PROVIDER_OCID}"
echo ""
echo "Make sure to set 'permissions.id-token: write' in your GitHub workflow!"
```

Save this script as `setup-oci-oidc.sh`, make it executable (`chmod +x setup-oci-oidc.sh`), and run it after updating the configuration variables.
