# Oracle Cloud API Key Authentication Setup Guide

This guide provides step-by-step instructions for setting up API key authentication between GitHub Actions and Oracle Cloud Infrastructure (OCI), with a focus on limiting permissions to network resources only.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Overview of OCI Authentication](#overview-of-oci-authentication)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Creating Network-Only Policies](#creating-network-only-policies)
5. [Configuring GitHub Secrets](#configuring-github-secrets)
6. [Testing Your Setup](#testing-your-setup)
7. [Troubleshooting](#troubleshooting)
8. [Additional Resources](#additional-resources)

---

## Prerequisites

Before starting, ensure you have:

- **Oracle Cloud Infrastructure (OCI) account** with administrative access
- **GitHub repository** with Actions enabled
- Access to create users and policies in OCI
- Basic understanding of cloud identity and access management concepts

---

## Overview of OCI Authentication

### What is API Key Authentication?

Oracle Cloud Infrastructure uses API signing keys for secure API access. This method uses:
- **RSA key pair**: A private key (kept secret) and a public key (uploaded to OCI)
- **API request signing**: Each API request is cryptographically signed with the private key
- **User-based authentication**: Each API key is associated with a specific OCI user

### How It Works

```
┌─────────────────┐
│  GitHub Actions │
│   Workflow      │
│                 │
│  - User OCID    │
│  - Private Key  │
│  - Fingerprint  │
└────────┬────────┘
         │
         │ Signs API requests
         │ with private key
         ↓
┌─────────────────┐
│  Oracle Cloud   │
│  Identity (IAM) │
│                 │
│  - Verifies     │
│    signature    │
│  - Checks       │
│    permissions  │
└─────────────────┘
```

**Security Considerations:**
- ✅ Use dedicated service accounts for automation
- ✅ Apply principle of least privilege
- ✅ Rotate keys regularly
- ✅ Store private keys as GitHub encrypted secrets
- ✅ Limit permissions to only required resources

---

## Step-by-Step Setup

### Step 1: Create a Dedicated OCI User for GitHub Actions

It's a best practice to create a dedicated user for automation rather than using your personal account.

#### 1.1 Create the User

1. Log in to the [Oracle Cloud Console](https://cloud.oracle.com)
2. Navigate to **Identity & Security** → **Domains** → **Default Domain** (or your custom domain)
3. Click on **Users**
4. Click **Create User**
5. Fill in the details:
   - **First name**: `GitHub`
   - **Last name**: `Actions`
   - **Username/Email**: `github-actions@yourdomain.com` (or `github.actions`)
   - **Use the email address as the username**: Uncheck if you want a different username
6. Click **Create**

#### 1.2 Note the User OCID

1. Click on the newly created user
2. Copy the **OCID** (looks like: `ocid1.user.oc1..aaaaaaaxxxxx`)
3. Save this value - you'll need it later as `OCI_USER_OCID`

### Step 2: Generate API Key Pair

#### 2.1 Generate Keys Using OpenSSL (Recommended)

On your local machine (Linux, macOS, or WSL on Windows):

```bash
# Create a directory for the keys
mkdir ~/.oci
cd ~/.oci

# Generate private key (2048-bit RSA)
openssl genrsa -out oci_api_key.pem 2048

# Set proper permissions
chmod 600 oci_api_key.pem

# Generate public key from private key
openssl rsa -pubout -in oci_api_key.pem -out oci_api_key_public.pem

# Display the private key (you'll add this to GitHub Secrets)
cat oci_api_key.pem

# Display the public key (you'll upload this to OCI)
cat oci_api_key_public.pem
```

#### 2.2 Alternative: Generate Keys Using OCI Console

1. In the OCI Console, navigate to your user profile
2. Click **API Keys** in the left menu
3. Click **Add API Key**
4. Select **Generate API Key Pair**
5. Click **Download Private Key** and **Download Public Key**
6. Save both files securely

### Step 3: Add Public Key to OCI User

1. In OCI Console, navigate to **Identity & Security** → **Domains** → **Users**
2. Click on the `github-actions` user you created
3. In the **Resources** section on the left, click **API Keys**
4. Click **Add API Key**
5. Select **Paste Public Key**
6. Paste the contents of `oci_api_key_public.pem` (including the `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` lines)
7. Click **Add**

#### 3.1 Note the Fingerprint

After adding the key, OCI will display the fingerprint (looks like: `aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99`)

**Save this value** - you'll need it later as `OCI_FINGERPRINT`

### Step 4: Identify Your Tenancy and Compartment

#### 4.1 Get Tenancy OCID

1. In OCI Console, click the **Profile** icon (top right)
2. Click **Tenancy: [your-tenancy-name]**
3. Copy the **OCID** value
4. Save this as `OCI_TENANCY_OCID`

#### 4.2 Get Compartment OCID

1. Navigate to **Identity & Security** → **Compartments**
2. Find the compartment where you want to create VCN resources
3. Click on the compartment name
4. Copy the **OCID**
5. Save this as `OCI_COMPARTMENT_OCID`

**Tip**: You can use the root compartment (same as tenancy OCID) or create a dedicated compartment for testing.

---

## Creating Network-Only Policies

To follow the principle of least privilege, create policies that grant only network-related permissions.

### Step 1: Create a Group for GitHub Actions

1. Navigate to **Identity & Security** → **Domains** → **Default Domain** → **Groups**
2. Click **Create Group**
3. Enter details:
   - **Name**: `GitHubActionsNetworkAdmins`
   - **Description**: `Group for GitHub Actions with network-only permissions`
4. Click **Create**

### Step 2: Add User to Group

1. Click on the newly created group
2. Click **Add User to Group**
3. Select the `github-actions` user
4. Click **Add**

### Step 3: Create Network-Only Policy

1. Navigate to **Identity & Security** → **Policies**
2. Select the **compartment** where you want to apply the policy (usually root compartment for compartment-level policies)
3. Click **Create Policy**
4. Enter policy details:
   - **Name**: `github-actions-network-policy`
   - **Description**: `Network-only permissions for GitHub Actions`
   - **Compartment**: Select root compartment or your target compartment

5. Add the following policy statements:

#### Option A: Full Network Management (Recommended for Testing)

```
Allow group GitHubActionsNetworkAdmins to manage virtual-network-family in compartment <compartment-name>
```

This grants complete control over all networking resources including:
- VCNs (Virtual Cloud Networks)
- Subnets
- Route Tables
- Security Lists
- Network Security Groups
- Internet Gateways
- NAT Gateways
- Service Gateways
- DRGs (Dynamic Routing Gateways)
- VLANs
- IP addresses

#### Option B: Granular Network Permissions (Most Restrictive)

If you want fine-grained control, use individual permissions:

```
Allow group GitHubActionsNetworkAdmins to manage vcns in compartment <compartment-name>
Allow group GitHubActionsNetworkAdmins to manage subnets in compartment <compartment-name>
Allow group GitHubActionsNetworkAdmins to manage route-tables in compartment <compartment-name>
Allow group GitHubActionsNetworkAdmins to manage security-lists in compartment <compartment-name>
Allow group GitHubActionsNetworkAdmins to manage network-security-groups in compartment <compartment-name>
Allow group GitHubActionsNetworkAdmins to manage internet-gateways in compartment <compartment-name>
Allow group GitHubActionsNetworkAdmins to manage nat-gateways in compartment <compartment-name>
Allow group GitHubActionsNetworkAdmins to manage service-gateways in compartment <compartment-name>
```

#### Option C: Read-Only Network Access

For validation-only workflows:

```
Allow group GitHubActionsNetworkAdmins to inspect virtual-network-family in compartment <compartment-name>
Allow group GitHubActionsNetworkAdmins to read virtual-network-family in compartment <compartment-name>
```

#### Additional Useful Permissions

If your workflow needs to work across compartments:

```
Allow group GitHubActionsNetworkAdmins to read compartments in tenancy
Allow group GitHubActionsNetworkAdmins to read tenancies in tenancy
```

For DNS integration:

```
Allow group GitHubActionsNetworkAdmins to manage dns in compartment <compartment-name>
```

For load balancers (if needed):

```
Allow group GitHubActionsNetworkAdmins to manage load-balancers in compartment <compartment-name>
```

6. Click **Create**

### Understanding Policy Verbs

| Verb | Permissions |
|------|-------------|
| `inspect` | List resources (no details) |
| `read` | List and view resource details |
| `use` | Read + ability to interact with resources |
| `manage` | Full control (create, update, delete) |

### Policy Best Practices

1. **Use compartments** to isolate resources and limit blast radius
2. **Start restrictive** and add permissions as needed
3. **Use conditions** for time-based or IP-based restrictions (advanced)
4. **Regular audits** of permissions and access logs
5. **Separate policies** for different environments (dev, staging, prod)

Example with conditions (advanced):

```
Allow group GitHubActionsNetworkAdmins to manage virtual-network-family in compartment test-environment where request.region = 'eu-frankfurt-1'
```

---

## Configuring GitHub Secrets

### Required Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

| Secret Name | Description | Example Value | How to Obtain |
|-------------|-------------|---------------|---------------|
| `OCI_USER_OCID` | User OCID for authentication | `ocid1.user.oc1..aaaaaa...` | Step 1.2 above |
| `OCI_FINGERPRINT` | API key fingerprint | `aa:bb:cc:dd:ee:ff:00:11:22:33...` | Step 3.1 above |
| `OCI_TENANCY_OCID` | Tenancy OCID | `ocid1.tenancy.oc1..aaaaaa...` | Step 4.1 above |
| `OCI_COMPARTMENT_OCID` | Compartment where resources will be created | `ocid1.compartment.oc1..aaaaaa...` | Step 4.2 above |
| `OCI_PRIVATE_KEY` | Private key content (entire file) | `-----BEGIN RSA PRIVATE KEY-----\n...` | Step 2.1 above |

### How to Add OCI_PRIVATE_KEY Secret

1. Copy the **entire content** of your private key file:
   ```bash
   cat ~/.oci/oci_api_key.pem
   ```

2. In GitHub:
   - Click **New repository secret**
   - Name: `OCI_PRIVATE_KEY`
   - Value: Paste the entire key including:
     ```
     -----BEGIN RSA PRIVATE KEY-----
     MIIEpAIBAAKCAQEA...
     ...
     -----END RSA PRIVATE KEY-----
     ```
   - Click **Add secret**

**Important**: Make sure to include the header (`-----BEGIN RSA PRIVATE KEY-----`) and footer (`-----END RSA PRIVATE KEY-----`) lines.

### Optional: Repository Variables

For non-sensitive configuration, you can use repository variables:

Navigate to **Settings** → **Secrets and variables** → **Actions** → **Variables** tab

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `OCI_REGION` | Default OCI region | `eu-frankfurt-1` |
| `OCI_RESOURCE_PREFIX` | Default resource prefix | `ipcalc-prod` |

---

## Testing Your Setup

### Test 1: Validate Configuration Locally (Optional)

If you have OCI CLI installed locally:

```bash
# Create config file
cat > ~/.oci/config << EOF
[DEFAULT]
user=<OCI_USER_OCID>
fingerprint=<OCI_FINGERPRINT>
tenancy=<OCI_TENANCY_OCID>
region=eu-frankfurt-1
key_file=~/.oci/oci_api_key.pem
EOF

# Test authentication
oci iam region list

# Test network permissions
oci network vcn list --compartment-id <OCI_COMPARTMENT_OCID>
```

### Test 2: Run GitHub Workflow

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Oracle Cloud VCN Deployment Test** workflow
4. Click **Run workflow**
5. Optionally customize parameters
6. Click **Run workflow**

The workflow will:
1. Configure authentication using your secrets
2. Generate Terraform configuration
3. Deploy a VCN with subnets
4. Validate the deployment
5. Clean up all resources

### Test 3: Verify Permissions

Create a simple test workflow to verify your permissions:

```yaml
name: Test OCI Permissions

on: workflow_dispatch

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Configure OCI
        run: |
          mkdir -p ~/.oci
          echo "${{ secrets.OCI_PRIVATE_KEY }}" > ~/.oci/key.pem
          chmod 600 ~/.oci/key.pem
          cat > ~/.oci/config << EOF
          [DEFAULT]
          user=${{ secrets.OCI_USER_OCID }}
          fingerprint=${{ secrets.OCI_FINGERPRINT }}
          tenancy=${{ secrets.OCI_TENANCY_OCID }}
          region=eu-frankfurt-1
          key_file=~/.oci/key.pem
          EOF

      - name: Install OCI CLI
        run: |
          bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults
          echo "$HOME/bin" >> $GITHUB_PATH

      - name: Test Network Access
        run: |
          export PATH="$HOME/bin:$PATH"

          echo "Testing region list..."
          oci iam region list

          echo "Testing VCN list..."
          oci network vcn list --compartment-id ${{ secrets.OCI_COMPARTMENT_OCID }}

          echo "✅ All tests passed!"
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "NotAuthenticated: Authentication failed"

**Possible Causes:**
- Incorrect user OCID
- Wrong fingerprint
- Private key doesn't match public key
- Private key format issue

**Solutions:**
1. Verify user OCID is correct
2. Re-check fingerprint in OCI console (user → API Keys)
3. Ensure you uploaded the correct public key
4. Regenerate key pair if needed
5. Make sure private key includes header/footer lines

#### Issue 2: "Authorization failed or requested resource not found"

**Possible Causes:**
- User lacks required permissions
- Policy not applied to correct compartment
- User not in the required group
- Compartment OCID is wrong

**Solutions:**
1. Verify user is member of correct group
2. Check policy statements include correct compartment
3. Verify compartment OCID
4. Wait a few minutes for policy changes to propagate
5. Check policy syntax:
   ```
   # Correct
   Allow group GitHubActionsNetworkAdmins to manage virtual-network-family in compartment MyCompartment

   # Incorrect (missing 'in')
   Allow group GitHubActionsNetworkAdmins to manage virtual-network-family compartment MyCompartment
   ```

#### Issue 3: "Service error: InvalidParameter"

**Possible Causes:**
- Invalid region name
- Malformed OCID
- Invalid CIDR block

**Solutions:**
1. Verify region name (e.g., `eu-frankfurt-1`, not `eu-frankfurt`)
2. Check all OCIDs are complete and properly formatted
3. Validate CIDR blocks don't overlap with existing VCNs

#### Issue 4: "Private key format error"

**Possible Causes:**
- Missing newlines in private key
- GitHub secret truncated
- Extra spaces or characters

**Solutions:**
1. When pasting private key to GitHub, ensure it's exactly as generated
2. Use `cat` command to display key and copy-paste entire output
3. Verify key format:
   ```bash
   # Valid private key should start with
   -----BEGIN RSA PRIVATE KEY-----
   # And end with
   -----END RSA PRIVATE KEY-----
   ```

#### Issue 5: Rate limiting errors

**Possible Causes:**
- Too many API calls in short time
- Workflow running too frequently

**Solutions:**
1. Add delays between API calls
2. Use pagination for list operations
3. Implement exponential backoff
4. Consider OCI service limits

### Enable Debug Logging

Add to your workflow for detailed logs:

```yaml
env:
  OCI_CLI_DEBUG: "true"
  ACTIONS_STEP_DEBUG: "true"
```

### Verify API Key Configuration

```bash
# Check key format
openssl rsa -in ~/.oci/oci_api_key.pem -check

# Get fingerprint locally to compare
openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key.pem | openssl md5 -c
```

---

## Additional Resources

### Official Oracle Documentation

#### OCI Authentication
- **OCI Documentation - API Key Authentication**
  https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm

- **OCI Documentation - Required Keys and OCIDs**
  https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm#Required_Keys_and_OCIDs

- **OCI Documentation - SDK and CLI Configuration**
  https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm

#### IAM and Policies
- **OCI Documentation - Policy Reference**
  https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/policyreference.htm

- **OCI Documentation - Common Policies**
  https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/commonpolicies.htm

- **OCI Documentation - Policy Syntax**
  https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policysyntax.htm

- **OCI Documentation - Network Policy Details**
  https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/corepolicyreference.htm

#### Networking
- **OCI Documentation - VCN Overview**
  https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/overview.htm

- **OCI Documentation - VCN and Subnets**
  https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingVCNs.htm

- **OCI Documentation - Security Lists**
  https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm

#### CLI and Tools
- **OCI CLI Documentation**
  https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/

- **OCI CLI GitHub Repository**
  https://github.com/oracle/oci-cli

- **OCI CLI Installation Guide**
  https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm

#### Terraform
- **Terraform OCI Provider Documentation**
  https://registry.terraform.io/providers/oracle/oci/latest/docs

- **Terraform OCI Provider - Authentication**
  https://registry.terraform.io/providers/oracle/oci/latest/docs#authentication

- **OCI Terraform Examples**
  https://github.com/oracle/terraform-provider-oci/tree/master/examples

### GitHub Actions
- **GitHub Docs - Encrypted Secrets**
  https://docs.github.com/en/actions/security-guides/encrypted-secrets

- **GitHub Docs - Using Secrets in Workflows**
  https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions

- **GitHub Docs - Security Hardening**
  https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions

### Community Resources
- **OCI Community Forums**
  https://community.oracle.com/customerconnect/categories/oci

- **Oracle DevRel Blog**
  https://blogs.oracle.com/developers/

- **Oracle Architecture Center**
  https://docs.oracle.com/solutions/

### Best Practices and Security
- **CIS Oracle Cloud Infrastructure Foundations Benchmark**
  https://www.cisecurity.org/benchmark/oracle_cloud

- **OCI Security Best Practices**
  https://docs.oracle.com/en-us/iaas/Content/Security/Reference/configuration_security.htm

- **OCI Well-Architected Framework**
  https://docs.oracle.com/en-us/iaas/Content/cloud-adoption-framework/home.htm

### Video Tutorials
- **Oracle Learning Library**
  https://www.oracle.com/goto/oll

- **OCI YouTube Channel**
  https://www.youtube.com/c/OracleCloudInfrastructure

### Example Code
- **Oracle QuickStart GitHub**
  https://github.com/oracle-quickstart

- **OCI Landing Zones**
  https://github.com/oracle-quickstart/oci-landing-zones

- **OCI Terraform Modules**
  https://github.com/oracle-terraform-modules

---

## Summary

This guide covered how to set up API key authentication for Oracle Cloud Infrastructure in GitHub Actions with network-only permissions.

### Key Steps Completed

1. ✅ Created dedicated OCI user for GitHub Actions
2. ✅ Generated and configured API key pair
3. ✅ Created group with network-only permissions
4. ✅ Configured restrictive IAM policies
5. ✅ Set up GitHub repository secrets
6. ✅ Tested the configuration

### Security Best Practices Applied

| Practice | Implementation |
|----------|----------------|
| Least Privilege | Network-only permissions via IAM policies |
| Dedicated Service Account | Separate user for automation |
| Secure Secret Storage | GitHub encrypted secrets |
| Key Rotation | Regular API key regeneration |
| Compartment Isolation | Resources in dedicated compartment |
| Audit Trail | OCI audit logs track all API calls |

### GitHub Secrets Summary

| Secret | Contains |
|--------|----------|
| `OCI_USER_OCID` | User identifier |
| `OCI_FINGERPRINT` | API key fingerprint |
| `OCI_TENANCY_OCID` | Tenancy identifier |
| `OCI_COMPARTMENT_OCID` | Target compartment |
| `OCI_PRIVATE_KEY` | RSA private key (PEM format) |

### Network Permissions Granted

Using the recommended policy, the GitHub Actions user can:
- ✅ Create, read, update, delete VCNs
- ✅ Manage subnets and route tables
- ✅ Configure security lists and NSGs
- ✅ Manage internet, NAT, and service gateways
- ❌ **Cannot** access compute instances
- ❌ **Cannot** access storage or databases
- ❌ **Cannot** modify IAM settings
- ❌ **Cannot** access other compartments (unless explicitly granted)

---

## Support and Maintenance

### Regular Maintenance Tasks

1. **Rotate API keys** every 90 days
2. **Review audit logs** monthly for unusual activity
3. **Update policies** as requirements change
4. **Test workflows** after making changes
5. **Monitor OCI service limits**

### Getting Help

- **OCI Support**: Submit a ticket through OCI Console
- **GitHub Support**: For Actions-related issues
- **Community**: OCI forums and Stack Overflow
- **Documentation**: Always refer to official OCI docs for latest information

---

**Last Updated**: 2025-11-16

**Version**: 2.0.0 (Updated from OIDC to API Key authentication)
