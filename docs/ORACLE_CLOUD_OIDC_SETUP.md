# Oracle Cloud OpenID Connect (OIDC) Authentication Setup Guide

This guide provides step-by-step instructions for setting up OpenID Connect (OIDC) authentication between GitHub Actions and Oracle Cloud Infrastructure (OCI), allowing your GitHub workflows to securely authenticate without using long-lived credentials.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Overview of OIDC Authentication](#overview-of-oidc-authentication)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Testing Your Setup](#testing-your-setup)
5. [Troubleshooting](#troubleshooting)
6. [Additional Resources](#additional-resources)

---

## Prerequisites

Before starting, ensure you have:

- **Oracle Cloud Infrastructure (OCI) account** with administrative access
- **GitHub repository** with Actions enabled
- **OCI CLI installed** (optional, for local testing)
- Basic understanding of cloud identity and access management concepts

---

## Overview of OIDC Authentication

### What is OIDC?

OpenID Connect (OIDC) is an authentication layer built on top of OAuth 2.0 that allows secure authentication without storing long-lived credentials. Instead of using static API keys or passwords, OIDC uses short-lived tokens that are automatically generated and rotated.

### How GitHub Actions OIDC Works with Oracle Cloud

```
┌─────────────────┐      1. Request token     ┌─────────────────┐
│                 │ ────────────────────────> │                 │
│  GitHub Actions │                           │  GitHub OIDC    │
│   Workflow      │ <──────────────────────── │   Provider      │
│                 │      2. Return OIDC token │                 │
└─────────────────┘                           └─────────────────┘
         │
         │ 3. Exchange token
         │    for OCI credentials
         ↓
┌─────────────────┐
│                 │
│  Oracle Cloud   │
│  Identity (IAM) │
│                 │
└─────────────────┘
```

**Benefits:**
- ✅ No long-lived credentials stored in GitHub Secrets
- ✅ Automatic token rotation
- ✅ Fine-grained access control
- ✅ Enhanced security and compliance
- ✅ Audit trail for authentication events

---

## Step-by-Step Setup

### Step 1: Configure Oracle Cloud Identity Domain

#### 1.1 Create an Identity Domain (if not already exists)

1. Log in to the [Oracle Cloud Console](https://cloud.oracle.com)
2. Navigate to **Identity & Security** → **Domains**
3. If you don't have a domain, create one:
   - Click **Create Domain**
   - Enter a name (e.g., `github-actions-domain`)
   - Choose **Free** tier or **Oracle Apps** depending on your needs
   - Click **Create**

#### 1.2 Configure OAuth/OIDC Application

1. Navigate to **Identity & Security** → **Domains** → Select your domain
2. Click on **Integrated applications** (or **Applications**)
3. Click **Add application**
4. Select **Confidential Application**
5. Configure the application:
   - **Name**: `github-actions-oidc`
   - **Description**: `OIDC integration for GitHub Actions`

6. In the **Client Configuration** section:
   - **Allowed Grant Types**: Select `JWT Assertion`
   - **Client Type**: `Confidential`
   - **Redirect URLs**: Add `https://token.actions.githubusercontent.com`

7. In the **Token Issuance Policy** section:
   - **Grant the client access to Identity Cloud Service Admin APIs**: Enable this
   - **Add resources**: Grant necessary API access

8. Click **Next** and then **Finish**

9. **Important**: Save the **Client ID** and **Client Secret** (you'll need these later)

### Step 2: Create OCI Identity Provider for GitHub

#### 2.1 Create Identity Provider

1. In Oracle Cloud Console, navigate to **Identity & Security** → **Federation**
2. Click **Add Identity Provider**
3. Configure the provider:
   - **Name**: `github-actions-idp`
   - **Description**: `GitHub Actions OIDC Provider`
   - **Type**: Select `Microsoft` (or `Generic OIDC`)
   - **Metadata URL**: `https://token.actions.githubusercontent.com/.well-known/openid-configuration`

4. Click **Continue** and map attributes:
   - **Identity Provider Username**: `sub` (subject claim)
   - Map other attributes as needed

5. Click **Create**

### Step 3: Configure OCI IAM Policies

#### 3.1 Create a Dynamic Group

Dynamic groups allow you to group OCI resources based on matching rules.

1. Navigate to **Identity & Security** → **Dynamic Groups**
2. Click **Create Dynamic Group**
3. Configure:
   - **Name**: `github-actions-runners`
   - **Description**: `Dynamic group for GitHub Actions runners`
   - **Matching Rules**:
   ```
   ALL {request.principal.type='federateduser',
        request.principal.claims.aud='sts.oracle.com',
        request.principal.claims.iss='https://token.actions.githubusercontent.com'}
   ```

4. Click **Create**

#### 3.2 Create IAM Policy

1. Navigate to **Identity & Security** → **Policies**
2. Click **Create Policy**
3. Configure:
   - **Name**: `github-actions-policy`
   - **Description**: `Permissions for GitHub Actions workflows`
   - **Compartment**: Select your target compartment

4. Add policy statements (customize based on your needs):

```
Allow dynamic-group github-actions-runners to manage virtual-network-family in compartment <your-compartment-name>
Allow dynamic-group github-actions-runners to manage instance-family in compartment <your-compartment-name>
Allow dynamic-group github-actions-runners to use cloud-shell in tenancy
Allow dynamic-group github-actions-runners to read all-resources in compartment <your-compartment-name>
```

**Example for VCN management:**
```
Allow dynamic-group github-actions-runners to manage vcns in compartment <your-compartment-name>
Allow dynamic-group github-actions-runners to manage subnets in compartment <your-compartment-name>
Allow dynamic-group github-actions-runners to manage internet-gateways in compartment <your-compartment-name>
Allow dynamic-group github-actions-runners to manage route-tables in compartment <your-compartment-name>
Allow dynamic-group github-actions-runners to manage security-lists in compartment <your-compartment-name>
```

5. Click **Create**

### Step 4: Configure Workload Identity Pool (Alternative Method)

Oracle Cloud also supports Resource Principal authentication for GitHub Actions. Here's an alternative setup:

#### 4.1 Create Federation Provider

```bash
# Using OCI CLI
oci iam identity-provider create-saml2-identity-provider \
  --compartment-id <tenancy-ocid> \
  --name "github-actions" \
  --description "GitHub Actions OIDC" \
  --metadata-url "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
```

### Step 5: Configure GitHub Repository Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add the following secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `OCI_TENANCY_OCID` | Your OCI Tenancy OCID | `ocid1.tenancy.oc1..aaaa...` |
| `OCI_COMPARTMENT_OCID` | Target compartment OCID | `ocid1.compartment.oc1..aaaa...` |
| `OCI_REGION` | OCI region identifier | `eu-frankfurt-1` |
| `OCI_IDENTITY_DOMAIN_URL` | Identity domain endpoint | `https://idcs-xxx.identity.oraclecloud.com` |

**Note**: With OIDC, you do NOT need to store:
- ❌ User OCID
- ❌ API key fingerprint
- ❌ Private key content

### Step 6: Update Your GitHub Workflow

Here's an example workflow that uses OIDC authentication:

```yaml
name: Deploy to Oracle Cloud

on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Authenticate to Oracle Cloud using OIDC
        id: oci-auth
        run: |
          # Get GitHub OIDC token
          OIDC_TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
            "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.oracle.com" | jq -r '.value')

          # Exchange for OCI security token
          OCI_TOKEN_RESPONSE=$(curl -s -X POST \
            "https://auth.${{ secrets.OCI_REGION }}.oraclecloud.com/v1/token" \
            -H "Content-Type: application/json" \
            -d "{
              \"idToken\": \"$OIDC_TOKEN\",
              \"idTokenProvider\": \"github\",
              \"resourcePrincipalVersion\": \"2.2\"
            }")

          SECURITY_TOKEN=$(echo "$OCI_TOKEN_RESPONSE" | jq -r '.token')

          # Configure OCI CLI
          mkdir -p ~/.oci
          cat > ~/.oci/config << EOF
          [DEFAULT]
          region=${{ secrets.OCI_REGION }}
          tenancy=${{ secrets.OCI_TENANCY_OCID }}
          security_token_file=~/.oci/token
          EOF

          echo "$SECURITY_TOKEN" > ~/.oci/token

      - name: Install OCI CLI
        run: |
          bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults
          echo "$HOME/bin" >> $GITHUB_PATH

      - name: Test OCI Connection
        run: |
          oci iam region list --output table
```

---

## Testing Your Setup

### 1. Test OIDC Token Exchange Locally

You can test the OIDC flow using curl:

```bash
# This will only work from a GitHub Actions runner
curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.oracle.com"
```

### 2. Test with a Simple Workflow

Create a test workflow:

```yaml
name: Test OCI OIDC

on: workflow_dispatch

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Get OIDC Token
        run: |
          TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
            "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.oracle.com" | jq -r '.value')

          echo "Token received: ${TOKEN:0:20}..."

          # Decode and display claims
          echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

### 3. Verify IAM Permissions

Test that your dynamic group and policies work:

```bash
oci iam compartment list --compartment-id $OCI_TENANCY_OCID
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Invalid token" error

**Cause**: Token audience mismatch or expired token

**Solution**:
- Ensure audience is set to `sts.oracle.com`
- Check that tokens are used immediately after generation
- Verify GitHub Actions has `id-token: write` permission

#### Issue 2: "Unauthorized" when calling OCI APIs

**Cause**: IAM policy missing or incorrect dynamic group rules

**Solution**:
- Review dynamic group matching rules
- Check policy statements match your compartment/resources
- Verify tenancy OCID is correct

#### Issue 3: "Failed to get OIDC token"

**Cause**: Missing GitHub Actions environment variables

**Solution**:
- Ensure workflow has `permissions: id-token: write`
- Check `ACTIONS_ID_TOKEN_REQUEST_TOKEN` and `ACTIONS_ID_TOKEN_REQUEST_URL` are available
- This only works in GitHub Actions runners, not locally

#### Issue 4: Token exchange fails

**Cause**: OCI region or authentication endpoint incorrect

**Solution**:
- Verify the region in the auth URL: `https://auth.{region}.oraclecloud.com`
- Check identity domain is properly configured
- Ensure federation provider is active

### Debug Mode

Enable debug output in your workflow:

```yaml
env:
  OCI_CLI_DEBUG: "true"
  ACTIONS_STEP_DEBUG: "true"
```

---

## Additional Resources

### Official Documentation

#### GitHub Actions OIDC
- **GitHub Docs - About security hardening with OpenID Connect**
  https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect

- **GitHub Docs - Configuring OpenID Connect in cloud providers**
  https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-cloud-providers

- **GitHub Blog - Secure cloud deployments with OpenID Connect**
  https://github.blog/changelog/2021-10-27-github-actions-secure-cloud-deployments-with-openid-connect/

#### Oracle Cloud Infrastructure
- **OCI Documentation - Federation**
  https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/federating.htm

- **OCI Documentation - Managing Identity Providers**
  https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/federation.htm

- **OCI Documentation - Resource Principal Authentication**
  https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_authentication_methods.htm#sdk_authentication_methods_resource_principal

- **OCI CLI Authentication Methods**
  https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/clitoken.htm

- **OCI Terraform Provider - Authentication**
  https://registry.terraform.io/providers/oracle/oci/latest/docs#authentication

#### Oracle Identity Cloud Service (IDCS)
- **IDCS Documentation - OAuth and OpenID Connect**
  https://docs.oracle.com/en/cloud/paas/identity-cloud/uaids/oauth-openid-connect.html

- **IDCS Documentation - Configuring Federation**
  https://docs.oracle.com/en/cloud/paas/identity-cloud/uaids/configure-federation.html

### Third-Party Resources & Tutorials

#### Community Guides
- **Medium - GitHub Actions OIDC with Oracle Cloud**
  https://medium.com/oracledevs/github-actions-with-oci-using-oidc-authentication

- **Oracle DevRel Blog - Secure CI/CD with OIDC**
  https://blogs.oracle.com/developers/

- **GitHub Actions Marketplace - OCI Actions**
  https://github.com/marketplace?type=actions&query=oracle+cloud

#### Video Tutorials
- **Oracle Learning Library - OCI IAM and Federation**
  https://www.oracle.com/goto/oll

- **GitHub Actions OIDC Tutorial**
  https://www.youtube.com/results?search_query=github+actions+oidc+tutorial

#### Related Tools
- **Terraform OCI Provider GitHub**
  https://github.com/oracle/terraform-provider-oci

- **OCI CLI GitHub Repository**
  https://github.com/oracle/oci-cli

- **GitHub Actions Toolkit**
  https://github.com/actions/toolkit

### Security Best Practices

- **CIS Oracle Cloud Infrastructure Foundations Benchmark**
  https://www.cisecurity.org/benchmark/oracle_cloud

- **NIST Cybersecurity Framework**
  https://www.nist.gov/cyberframework

- **OWASP Top 10 CI/CD Security Risks**
  https://owasp.org/www-project-top-10-ci-cd-security-risks/

### Example Repositories

- **Oracle QuickStart - Terraform Examples**
  https://github.com/oracle-quickstart

- **OCI Landing Zone**
  https://github.com/oracle-quickstart/oci-landing-zones

---

## Summary

Setting up OIDC authentication between GitHub Actions and Oracle Cloud provides:

1. ✅ **Enhanced Security**: No long-lived credentials in your repository
2. ✅ **Simplified Management**: Automatic token rotation
3. ✅ **Better Compliance**: Audit trail and fine-grained access control
4. ✅ **Cost Effective**: No additional services required

### Key Configuration Elements

| Component | Purpose |
|-----------|---------|
| Identity Provider | Establishes trust between GitHub and OCI |
| Dynamic Group | Groups authenticated principals |
| IAM Policy | Defines permissions for the dynamic group |
| GitHub Secrets | Store OCI tenancy/compartment identifiers |
| Workflow Permissions | Enable `id-token: write` for OIDC |

---

## Support and Contributions

If you encounter issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Oracle Cloud [Service Limits](https://docs.oracle.com/en-us/iaas/Content/General/Concepts/servicelimits.htm)
3. Consult the [OCI Community Forums](https://community.oracle.com/customerconnect/categories/oci)
4. Open an issue in this repository

---

**Last Updated**: 2025-11-06

**Version**: 1.0.0
