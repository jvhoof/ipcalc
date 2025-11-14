# AliCloud VPC Deployment Test Workflow

## Overview

This GitHub Actions workflow (`alicloud-vpc-test.yml`) automatically deploys, validates, and cleans up Alibaba Cloud (AliCloud) Virtual Private Clouds (VPCs) and vSwitches using OpenID Connect (OIDC) authentication. It uses Terraform for infrastructure deployment and validates the resources using the AliCloud CLI.

## Features

- **OIDC Authentication** - Secure authentication without storing long-lived credentials
- **Dynamic Template Generation** - Uses ipcalc CLI to generate Terraform configurations on-the-fly
- **Configurable Parameters** - CIDR blocks, vSwitch counts, regions, and resource naming
- **Comprehensive Validation** - Verifies VPC and vSwitch deployment correctness
- **Detailed Test Reports** - GitHub Actions summary with deployment results
- **Automatic Cleanup** - Removes all resources after testing to prevent charges
- **Multiple Trigger Options** - Manual workflow dispatch or automatic on pull requests

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [OIDC Setup Guide](#oidc-setup-guide)
3. [Usage](#usage)
4. [Workflow Details](#workflow-details)
5. [Validation Checks](#validation-checks)
6. [Troubleshooting](#troubleshooting)
7. [Documentation Links](#documentation-links)

---

## Prerequisites

Before using this workflow, you need:

1. An AliCloud account with appropriate permissions
2. A GitHub repository with Actions enabled
3. Basic understanding of AliCloud RAM (Resource Access Management)
4. Basic understanding of OpenID Connect (OIDC)

---

## OIDC Setup Guide

### What is OIDC and Why Use It?

**OpenID Connect (OIDC)** is an authentication protocol that allows GitHub Actions to authenticate with cloud providers without storing long-lived credentials as secrets. This provides several benefits:

- **Enhanced Security** - No long-lived access keys stored in GitHub
- **Automatic Rotation** - Credentials are short-lived and automatically rotated
- **Reduced Attack Surface** - Stolen secrets are useless after expiration
- **Audit Trail** - Better tracking of which workflows accessed which resources

### Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  GitHub Actions │         │  AliCloud RAM    │         │  AliCloud VPC   │
│   Workflow      │────────▶│  OIDC Provider   │────────▶│   Resources     │
│                 │  OIDC   │  + RAM Role      │  STS    │                 │
└─────────────────┘  Token  └──────────────────┘  Token  └─────────────────┘
```

1. GitHub Actions generates an OIDC token for the workflow
2. The workflow sends the token to AliCloud RAM
3. AliCloud RAM validates the token against the OIDC provider configuration
4. If valid, AliCloud issues temporary credentials (STS token)
5. The workflow uses these credentials to manage AliCloud resources

---

## Step-by-Step OIDC Setup

### Step 1: Create a RAM Role for OIDC

First, you need to create a RAM role that trusts GitHub's OIDC provider.

#### 1.1 Log in to AliCloud Console

1. Go to [AliCloud Console](https://homenew.console.aliyun.com/)
2. Navigate to **RAM (Resource Access Management)**
   - Or directly visit: https://ram.console.aliyun.com/

#### 1.2 Create an OIDC Identity Provider

1. In the RAM console, click **Identities** → **OIDC Providers** in the left menu
2. Click **Create OIDC Provider**
3. Configure the OIDC provider:
   - **Provider Name**: `github-actions-oidc` (or your preferred name)
   - **Issuer URL**: `https://token.actions.githubusercontent.com`
   - **Client IDs**: `sts.aliyuncs.com`
   - **Fingerprint**: Leave blank (AliCloud will fetch it automatically)

4. Click **OK** to create the provider

#### 1.3 Create a RAM Role

1. In the RAM console, click **Identities** → **Roles**
2. Click **Create Role**
3. Select **Trusted entity type**: **OIDC Provider**
4. Select the OIDC provider you created: `github-actions-oidc`
5. Configure the trust policy:

```json
{
  "Statement": [
    {
      "Action": "sts:AssumeRoleWithOIDC",
      "Condition": {
        "StringEquals": {
          "oidc:aud": "sts.aliyuncs.com"
        },
        "StringLike": {
          "oidc:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:*"
        }
      },
      "Effect": "Allow",
      "Principal": {
        "Federated": [
          "acs:ram::YOUR_ACCOUNT_ID:oidc-provider/github-actions-oidc"
        ]
      }
    }
  ],
  "Version": "1"
}
```

**Important**: Replace the following:
- `YOUR_GITHUB_ORG/YOUR_REPO` - Your GitHub organization and repository (e.g., `octocat/my-repo`)
- `YOUR_ACCOUNT_ID` - Your AliCloud account ID (found in Account Management)

**For more restrictive access**, you can limit to specific branches or environments:
```json
"oidc:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
```

6. Click **Next**
7. Enter a **Role Name**: `github-actions-vpc-deployment` (or your preferred name)
8. Add a **Description**: `Role for GitHub Actions to deploy VPC resources via OIDC`
9. Click **OK**

#### 1.4 Attach Permissions to the Role

1. Find the role you just created in the **Roles** list
2. Click the role name to open its details
3. Click the **Permissions** tab
4. Click **Grant Permission**
5. Select **System Policy** and add the following policies:
   - `AliyunVPCFullAccess` - Full access to VPC resources
   - `AliyunECSReadOnlyAccess` - Read access to ECS (needed for zone information)

**For production**, create a custom policy with minimal required permissions:

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "vpc:CreateVpc",
        "vpc:DeleteVpc",
        "vpc:DescribeVpcs",
        "vpc:CreateVSwitch",
        "vpc:DeleteVSwitch",
        "vpc:DescribeVSwitches",
        "vpc:ModifyVpcAttribute",
        "ecs:DescribeZones"
      ],
      "Resource": "*"
    }
  ]
}
```

6. Click **OK** to attach the policy

#### 1.5 Note the ARNs

After creating the OIDC provider and role, note these values:

1. **OIDC Provider ARN**: Found in **OIDC Providers** list
   - Format: `acs:ram::YOUR_ACCOUNT_ID:oidc-provider/github-actions-oidc`

2. **RAM Role ARN**: Found in **Roles** list, click the role and copy the ARN
   - Format: `acs:ram::YOUR_ACCOUNT_ID:role/github-actions-vpc-deployment`

---

### Step 2: Configure GitHub Repository Secrets

Now you need to add the ARNs to your GitHub repository as secrets.

#### 2.1 Add Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `ALICLOUD_OIDC_PROVIDER_ARN` | The OIDC provider ARN from Step 1.5 | `acs:ram::1234567890:oidc-provider/github-actions-oidc` |
| `ALICLOUD_OIDC_ROLE_ARN` | The RAM role ARN from Step 1.5 | `acs:ram::1234567890:role/github-actions-vpc-deployment` |

---

### Step 3: (Optional) Configure Repository Variables

You can set default values for workflow parameters using repository variables.

#### 3.1 Add Repository Variables

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
3. Click **New repository variable**
4. Add any of the following variables:

| Variable Name | Description | Default if not set |
|--------------|-------------|-------------------|
| `ALICLOUD_RESOURCE_PREFIX` | Prefix for resource names | `ipcalc-test` |
| `ALICLOUD_REGION` | AliCloud region (e.g., `cn-hangzhou`, `us-west-1`) | `cn-hangzhou` |
| `ALICLOUD_VPC_CIDR` | VPC CIDR block (e.g., `172.16.0.0/16`) | `172.16.1.0/24` |
| `ALICLOUD_VSWITCH_COUNT` | Number of vSwitches to create (1-256) | `4` |

**Precedence Order:**
1. Manual workflow_dispatch inputs (highest priority)
2. Repository variables
3. Hard-coded defaults in workflow file (lowest priority)

---

### Step 4: Test the Setup

#### 4.1 Manual Test Run

1. Go to **Actions** tab in your GitHub repository
2. Select **[Network] AliCloud VPC Deployment Test** workflow
3. Click **Run workflow**
4. Use default parameters or customize them
5. Click **Run workflow**

#### 4.2 Verify Authentication

Check the workflow run logs:
1. The **Authenticate to AliCloud using OIDC** step should succeed
2. You should see temporary credentials being issued
3. The **Validate Deployment** step should successfully query AliCloud resources

---

## Usage

### Manual Trigger (Recommended for Testing)

1. Go to **Actions** tab in your GitHub repository
2. Select **[Network] AliCloud VPC Deployment Test** workflow
3. Click **Run workflow**
4. Configure parameters:
   - **Resource prefix**: Custom prefix for resource names (default: `ipcalc-qa`)
   - **Region**: AliCloud region (default: `cn-hangzhou`)
   - **VPC CIDR**: IP address range (default: `172.16.1.0/24`)
   - **vSwitch count**: Number of vSwitches to create (default: `4`)
5. Click **Run workflow**

### Automatic Trigger

The workflow automatically runs on pull requests that modify:
- `src/templates/alicloud/**` files
- `.github/workflows/alicloud-vpc-test.yml`

Or on push to the `beta` branch.

---

## Workflow Details

### Architecture

The workflow performs the following steps:

```
1. Generate unique ID for resources
2. Checkout repository code
3. Setup Node.js and install dependencies
4. Authenticate with AliCloud using OIDC
5. Setup Terraform
6. Generate Terraform config using ipcalc CLI
7. Initialize and validate Terraform
8. Plan and apply deployment
9. Install AliCloud CLI
10. Validate deployment
11. Generate test report
12. Cleanup all resources (always runs)
```

### Key Steps Explained

#### OIDC Authentication Step

```yaml
- name: Authenticate to AliCloud using OIDC
  uses: aliyun/configure-aliyun-credentials-action@v1
  with:
    oidc-provider-arn: ${{ secrets.ALICLOUD_OIDC_PROVIDER_ARN }}
    oidc-role-arn: ${{ secrets.ALICLOUD_OIDC_ROLE_ARN }}
    region-id: ${{ env.ALICLOUD_REGION }}
```

This step:
1. Requests an OIDC token from GitHub
2. Exchanges the token for temporary AliCloud credentials
3. Sets environment variables with the credentials
4. These credentials are valid for the duration of the job

#### Terraform Deployment

The workflow generates Terraform configuration dynamically:

```bash
npm run cli -- \
  --provider alicloud \
  --cidr 172.16.1.0/24 \
  --subnets 4 \
  --output terraform \
  --file /tmp/test-terraform.tf
```

This creates a complete Terraform file with:
- VPC definition with the specified CIDR
- vSwitch definitions in different availability zones
- Proper resource naming and dependencies

---

## Validation Checks

The workflow performs comprehensive validation:

✅ **VPC Existence Check**
- Verifies the VPC was created successfully using AliCloud CLI

✅ **VPC CIDR Validation**
- Confirms the CIDR block matches the specified value

✅ **vSwitch Discovery**
- Lists all vSwitches and their CIDR blocks

✅ **vSwitch Count Validation**
- Ensures at least one vSwitch exists

✅ **Availability Check**
- Verifies all vSwitches have `Available` status

✅ **Zone Distribution**
- Shows which availability zone each vSwitch is in

---

## Troubleshooting

### OIDC Authentication Fails

**Problem:** `Error: Failed to assume role with OIDC`

**Solutions:**

1. **Verify OIDC Provider Configuration**
   - Check the issuer URL is exactly: `https://token.actions.githubusercontent.com`
   - Check the client ID is: `sts.aliyuncs.com`

2. **Verify Trust Policy**
   - Ensure the repository path in the trust policy matches your repo
   - Format: `repo:owner/repo-name:*`
   - Check for typos in organization/repository name

3. **Verify ARNs in Secrets**
   - Go to RAM console and copy the ARNs again
   - Ensure there are no extra spaces or line breaks in the secrets

4. **Check Role Permissions**
   - Verify the role has `sts:AssumeRoleWithOIDC` permission
   - This is granted by the trust policy, not attached policies

### Terraform Deployment Fails

**Problem:** `Error creating VPC` or `Error creating vSwitch`

**Solutions:**

1. **Check Region Availability**
   - Some regions may have quota limits
   - Try a different region (e.g., `cn-shanghai`, `ap-southeast-1`)

2. **Verify Role Permissions**
   - Ensure the role has `AliyunVPCFullAccess` or equivalent custom policy
   - Check the attached policies in RAM console

3. **Check CIDR Conflicts**
   - Ensure the CIDR block doesn't conflict with existing VPCs
   - Use a different CIDR range if needed

### Validation Fails

**Problem:** VPC or vSwitches not found during validation

**Solutions:**

1. **Wait for Resource Propagation**
   - Add a short delay between deployment and validation
   - AliCloud resources may take a few seconds to appear in queries

2. **Check AliCloud CLI Configuration**
   - Verify the CLI is using the correct region
   - Check that credentials are properly set

3. **Verify Resource IDs**
   - Check the Terraform output for correct VPC/vSwitch IDs
   - Ensure IDs are properly passed to validation commands

### Cleanup Fails

**Problem:** Resources remain after workflow completes

**Solutions:**

1. **Manual Cleanup via Console**
   - Log in to [AliCloud VPC Console](https://vpc.console.aliyun.com/)
   - Delete vSwitches first (dependencies)
   - Then delete the VPC

2. **Manual Cleanup via CLI**
   ```bash
   # List VPCs
   aliyun vpc DescribeVpcs --region cn-hangzhou

   # List vSwitches in a VPC
   aliyun vpc DescribeVSwitches --VpcId vpc-xxxxx --region cn-hangzhou

   # Delete vSwitch
   aliyun vpc DeleteVSwitch --VSwitchId vsw-xxxxx --region cn-hangzhou

   # Delete VPC
   aliyun vpc DeleteVpc --VpcId vpc-xxxxx --region cn-hangzhou
   ```

### Permission Errors

**Problem:** `Error: You are not authorized to do this action`

**Solutions:**

1. **Check Attached Policies**
   - Go to RAM console → Roles → Your role → Permissions tab
   - Verify `AliyunVPCFullAccess` is attached
   - Or create a custom policy with required permissions

2. **Check Resource ARN**
   - Some policies may restrict resources by ARN
   - Use `"Resource": "*"` for testing
   - Restrict to specific resources in production

3. **Check Region Restrictions**
   - Some policies may restrict regions
   - Verify the region is allowed in the policy

---

## Documentation Links

### GitHub OIDC Documentation

- **GitHub OIDC Overview**: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- **Configuring OIDC for Cloud Providers**: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-cloud-providers
- **GitHub OIDC Token Format**: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#understanding-the-oidc-token

### AliCloud OIDC Documentation

- **AliCloud RAM OIDC Provider**: https://www.alibabacloud.com/help/en/ram/user-guide/oidc-overview
- **Creating OIDC Providers**: https://www.alibabacloud.com/help/en/ram/user-guide/create-an-oidc-idp
- **RAM Role for OIDC**: https://www.alibabacloud.com/help/en/ram/user-guide/use-oidc-for-single-sign-on
- **AssumeRoleWithOIDC API**: https://www.alibabacloud.com/help/en/ram/developer-reference/api-sts-2015-04-01-assumerolewithoidc

### AliCloud VPC Documentation

- **VPC Overview**: https://www.alibabacloud.com/help/en/vpc/product-overview/what-is-a-vpc
- **Create VPC**: https://www.alibabacloud.com/help/en/vpc/user-guide/work-with-vpcs
- **vSwitch Overview**: https://www.alibabacloud.com/help/en/vpc/user-guide/work-with-vswitches
- **VPC API Reference**: https://www.alibabacloud.com/help/en/vpc/developer-reference/api-vpc-2016-04-28-createvpc

### AliCloud CLI Documentation

- **CLI Installation**: https://www.alibabacloud.com/help/en/alibaba-cloud-cli/latest/installation-guide
- **CLI Configuration**: https://www.alibabacloud.com/help/en/alibaba-cloud-cli/latest/configure-credentials
- **VPC CLI Commands**: https://www.alibabacloud.com/help/en/vpc/developer-reference/use-alibaba-cloud-cli-to-call-vpc-api-operations

### Terraform AliCloud Provider

- **Terraform AliCloud Provider**: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs
- **VPC Resource**: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/vpc
- **vSwitch Resource**: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/vswitch
- **Authentication Methods**: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs#authentication

### Third-Party Resources

- **OIDC Explained**: https://openid.net/connect/
- **JWT Token Debugger**: https://jwt.io/ (useful for inspecting OIDC tokens during debugging)
- **OIDC Best Practices**: https://auth0.com/docs/authenticate/protocols/openid-connect-protocol
- **GitHub Actions + OIDC Blog**: https://github.blog/changelog/2021-10-27-github-actions-secure-cloud-deployments-with-openid-connect/

### Community Resources

- **GitHub Actions OIDC Examples**: https://github.com/github/roadmap/issues/249
- **AliCloud GitHub Action**: https://github.com/aliyun/configure-aliyun-credentials-action
- **Stack Overflow - OIDC**: https://stackoverflow.com/questions/tagged/openid-connect
- **Stack Overflow - AliCloud**: https://stackoverflow.com/questions/tagged/alibaba-cloud

---

## Advanced Configuration

### Restricting OIDC Access by Branch

To allow only specific branches to use the OIDC role, modify the trust policy:

```json
{
  "StringLike": {
    "oidc:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
  }
}
```

Or for multiple branches:

```json
{
  "StringLike": {
    "oidc:sub": [
      "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main",
      "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/beta"
    ]
  }
}
```

### Restricting by Environment

To allow only deployments from specific GitHub environments:

```json
{
  "StringLike": {
    "oidc:sub": "repo:YOUR_ORG/YOUR_REPO:environment:production"
  }
}
```

### Custom Policy for Minimal Permissions

Create a custom RAM policy with only required permissions:

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "vpc:CreateVpc",
        "vpc:DeleteVpc",
        "vpc:DescribeVpcs",
        "vpc:ModifyVpcAttribute",
        "vpc:CreateVSwitch",
        "vpc:DeleteVSwitch",
        "vpc:DescribeVSwitches",
        "vpc:ModifyVSwitchAttribute",
        "ecs:DescribeZones"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "acs:RequestedRegion": [
            "cn-hangzhou",
            "cn-shanghai"
          ]
        }
      }
    }
  ]
}
```

This policy:
- Grants only VPC and vSwitch management permissions
- Restricts to specific regions
- Allows ECS zone queries (needed for vSwitch placement)

---

## Security Best Practices

1. **Use Short-Lived Tokens**
   - OIDC tokens are automatically short-lived (typically 1 hour)
   - Much better than long-lived access keys

2. **Principle of Least Privilege**
   - Grant only the minimum required permissions
   - Use custom policies instead of `FullAccess` policies in production

3. **Restrict by Repository**
   - Trust policy should specify exact repository
   - Never use wildcards for the entire organization without careful consideration

4. **Restrict by Branch/Environment**
   - Limit production deployments to specific branches
   - Use GitHub environments for additional protection

5. **Monitor and Audit**
   - Enable AliCloud ActionTrail to log all API calls
   - Review logs regularly for suspicious activity
   - Set up alerts for unexpected actions

6. **Rotate Regularly**
   - While OIDC doesn't use long-lived credentials, periodically review and update trust policies
   - Remove access for decommissioned repositories

7. **Use Resource Tags**
   - Tag all created resources with workflow information
   - Makes it easier to track and audit resource usage

---

## Cost Considerations

- **VPC Resources**: VPCs are generally free in AliCloud
- **vSwitches**: vSwitches themselves are free
- **Testing Costs**: Should be minimal (effectively $0 per run)
- **Automatic Cleanup**: Resources are deleted after each run to prevent costs
- **Data Transfer**: If you add instances to test, data transfer may incur charges

---

## Future Enhancements

Possible improvements to this workflow:

- [ ] Add support for NAT Gateway testing
- [ ] Test VPC peering scenarios
- [ ] Add Security Group configuration and validation
- [ ] Add SLB (Server Load Balancer) deployment
- [ ] Multi-region deployment testing
- [ ] Cost estimation before deployment
- [ ] Notification integration (Slack, DingTalk, etc.)
- [ ] Parallel testing across multiple regions

---

## Support

For issues or questions:

1. **Check Workflow Logs**: GitHub Actions logs contain detailed error messages
2. **Check AliCloud ActionTrail**: Review API call logs in AliCloud console
3. **GitHub Issues**: Open an issue in this repository
4. **AliCloud Support**: Contact AliCloud technical support for platform-specific issues

---

## Comparison with Other Cloud Providers

This workflow is similar to the GCP and AWS VPC test workflows in this repository. Here's how AliCloud OIDC compares:

| Feature | AliCloud OIDC | AWS OIDC | GCP Workload Identity | Azure OIDC |
|---------|--------------|----------|---------------------|------------|
| **Setup Complexity** | Medium | Low | Medium | Low |
| **Token Lifetime** | ~1 hour | ~1 hour | ~1 hour | ~1 hour |
| **Custom Claims** | Limited | Yes | Yes | Yes |
| **Multi-Region** | Yes | Yes | Yes | Yes |
| **Documentation** | Good | Excellent | Excellent | Excellent |
| **Community Support** | Growing | Extensive | Extensive | Extensive |

**Key Differences for AliCloud:**
- Uses RAM (Resource Access Management) instead of IAM
- OIDC provider must be created manually in RAM console
- Uses `sts.aliyuncs.com` as the audience (client ID)
- Trust policy syntax is similar to AWS but with AliCloud-specific ARN format
- Region-specific endpoints (e.g., `sts.cn-hangzhou.aliyuncs.com`)

---

## License

This workflow is part of the ipcalc project. Please refer to the project's LICENSE file for details.
