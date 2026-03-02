# Alibaba Cloud RAM OIDC Setup Guide

This guide walks you through setting up OpenID Connect (OIDC) authentication between GitHub Actions and Alibaba Cloud using RAM (Resource Access Management). This allows GitHub Actions workflows to authenticate to Alibaba Cloud without using long-lived static access keys.

## Overview

OIDC authentication allows GitHub Actions to assume a RAM role using short-lived STS tokens, eliminating the need to store and rotate access key/secret pairs as GitHub secrets.

## Prerequisites

- An Alibaba Cloud account with RAM administrative access
- GitHub repository with Actions enabled
- Aliyun CLI installed (optional, for command-line setup)
- Your Alibaba Cloud Account ID (visible in the top-right of the RAM console)

## Setup Steps

### 1. Create an OIDC Provider

**Via RAM Console:**
1. Log in to the [RAM Console](https://ram.console.aliyun.com)
2. Navigate to **Identities > SSO > OIDC Providers**
3. Click **Create OIDC Provider**
4. Fill in the details:
   - **Provider Name:** `github-actions`
   - **Issuer URL:** `https://token.actions.githubusercontent.com`
   - **Audience:** `sts.aliyuncs.com`
   - **Fingerprint:** click **Get Fingerprint** to auto-fetch it from the issuer URL
5. Click **OK**

**Via Aliyun CLI:**
```bash
aliyun ram CreateOIDCProvider \
  --OIDCProviderName github-actions \
  --IssuerURL https://token.actions.githubusercontent.com \
  --ClientIdList sts.aliyuncs.com \
  --Fingerprints "$(curl -s https://token.actions.githubusercontent.com | openssl x509 -fingerprint -noout -sha1 | sed 's/SHA1 Fingerprint=//' | tr -d ':')"
```

Note the OIDC Provider ARN — it will be in the format:
```
acs:ram::ACCOUNT_ID:oidc-provider/github-actions
```

### 2. Create a RAM Role

The RAM role defines what GitHub Actions is allowed to do. You configure a trust policy that restricts which repositories can assume the role.

**Via RAM Console:**
1. Navigate to **Identities > Roles**
2. Click **Create Role**
3. Select **Identity Provider** as the trusted entity type
4. Configure the role:
   - **Role Name:** `github-actions`
   - **Trusted IdP:** select `github-actions` (the provider you created above)
   - **Condition:** tick the sub condition checkbox and use `repo:YOUR_ORG/YOUR_REPO:*` to restrict to your specific repository
5. Click **OK**

**Via Aliyun CLI (with a trust policy file):**

Create a file called `trust-policy.json`:
```json
{
  "Statement": [
    {
      "Action": "sts:AssumeRoleWithOIDC",
      "Effect": "Allow",
      "Principal": {
        "Federated": "acs:ram::ACCOUNT_ID:oidc-provider/github-actions"
      },
      "Condition": {
        "StringLike": {
          "oidc:aud": "sts.aliyuncs.com",
          "oidc:sub": "repo:YOUR_ORG/YOUR_REPO:*"
        }
      }
    }
  ],
  "Version": "1"
}
```

Replace `ACCOUNT_ID`, `YOUR_ORG`, and `YOUR_REPO` with your actual values, then create the role:
```bash
aliyun ram CreateRole \
  --RoleName github-actions \
  --Description "Role assumed by GitHub Actions via OIDC" \
  --AssumeRolePolicyDocument "$(cat trust-policy.json)"
```

Note the Role ARN from the output — it will be in the format:
```
acs:ram::ACCOUNT_ID:role/github-actions
```

### 3. Attach Required Permissions

Grant the role the permissions it needs to manage VPC resources.

**Option A — Attach a managed policy (quick):**

```bash
# VPC full access
aliyun ram AttachPolicyToRole \
  --PolicyType System \
  --PolicyName AliyunVPCFullAccess \
  --RoleName github-actions

# ECS network (needed for security groups)
aliyun ram AttachPolicyToRole \
  --PolicyType System \
  --PolicyName AliyunECSNetworkInterfaceManagementAccess \
  --RoleName github-actions
```

**Option B — Create a custom policy (recommended for production):**

Create a file called `vpc-policy.json` with minimal required permissions:
```json
{
  "Statement": [
    {
      "Action": [
        "vpc:CreateVpc",
        "vpc:DeleteVpc",
        "vpc:DescribeVpcs",
        "vpc:CreateVSwitch",
        "vpc:DeleteVSwitch",
        "vpc:DescribeVSwitches",
        "ecs:DescribeSecurityGroups",
        "ecs:DeleteSecurityGroup"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ],
  "Version": "1"
}
```

Create and attach it:
```bash
aliyun ram CreatePolicy \
  --PolicyName GitHubActionsVpcDeployer \
  --Description "Minimal permissions for deploying VPCs via GitHub Actions" \
  --PolicyDocument "$(cat vpc-policy.json)"

aliyun ram AttachPolicyToRole \
  --PolicyType Custom \
  --PolicyName GitHubActionsVpcDeployer \
  --RoleName github-actions
```

### 4. Configure GitHub Repository Secrets

Add the following secrets to your GitHub repository:

1. Navigate to your GitHub repository
2. Go to **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `ALICLOUD_ROLE_ARN` | `acs:ram::ACCOUNT_ID:role/github-actions` | The RAM role to assume |
| `ALICLOUD_OIDC_PROVIDER_ARN` | `acs:ram::ACCOUNT_ID:oidc-provider/github-actions` | The OIDC provider ARN |

Replace `ACCOUNT_ID` with your 16-digit Alibaba Cloud account ID.

### 5. Test the Configuration

The GitHub workflow is already configured to use OIDC. The key steps in the workflow are:

```yaml
permissions:
  contents: read
  id-token: write  # Required for OIDC

- name: Configure Alibaba Cloud Credentials (OIDC)
  uses: aliyun/configure-aliyun-credentials-action@v1
  with:
    role-to-assume: ${{ secrets.ALICLOUD_ROLE_ARN }}
    oidc-provider-arn: ${{ secrets.ALICLOUD_OIDC_PROVIDER_ARN }}
    role-session-name: 'github-action-session'
    role-session-expiration: 3600
```

The `audience` parameter defaults to `sts.aliyuncs.com`, which matches the `ClientIdList` value configured in the Alibaba Cloud OIDC provider. You do not need to set it explicitly unless you used a different value during provider setup.

The action exports three environment variables automatically used by the Aliyun CLI and Alibaba Cloud SDKs:
- `ALIBABACLOUD_ACCESS_KEY_ID`
- `ALIBABACLOUD_ACCESS_KEY_SECRET`
- `ALIBABACLOUD_SECURITY_TOKEN`

For Terraform's alicloud provider (which uses different variable names), an additional mapping step is included in the workflow:
```yaml
- name: Export credentials for Terraform
  run: |
    echo "ALICLOUD_ACCESS_KEY=$ALIBABACLOUD_ACCESS_KEY_ID" >> $GITHUB_ENV
    echo "ALICLOUD_SECRET_KEY=$ALIBABACLOUD_ACCESS_KEY_SECRET" >> $GITHUB_ENV
    echo "ALICLOUD_SECURITY_TOKEN=$ALIBABACLOUD_SECURITY_TOKEN" >> $GITHUB_ENV
```

Run the workflow to test:
1. Go to **Actions** in your GitHub repository
2. Select **[Skill] Alibaba Cloud VPC Deployment Test**
3. Click **Run workflow**
4. Monitor the execution

## Troubleshooting

### Common Issues

#### 1. "AuthMissingParameter" or "InvalidParameter"

**Problem:** The OIDC provider or role ARN is incorrect.

**Solution:** Verify the ARNs:
```bash
# List OIDC providers
aliyun ram ListOIDCProviders

# List roles
aliyun ram ListRoles
```

Check that the ARNs in your GitHub secrets exactly match what is returned.

#### 2. "EntityNotExist.Role"

**Problem:** The role name in `role-to-assume` doesn't exist.

**Solution:**
```bash
aliyun ram GetRole --RoleName github-actions
```

If it doesn't exist, re-run step 2 of this guide.

#### 3. "NoPermission" when creating VPC resources

**Problem:** The RAM role lacks the required VPC permissions.

**Solution:** Check the attached policies:
```bash
aliyun ram ListPoliciesForRole --RoleName github-actions
```

Then verify the policy document contains the required VPC actions (see step 3).

#### 4. "Forbidden.SubAccountNotAllow" or token exchange fails

**Problem:** The trust policy's `oidc:sub` condition doesn't match the GitHub Actions subject claim.

The subject claim for GitHub Actions follows this format:
- Branch push: `repo:ORG/REPO:ref:refs/heads/BRANCH`
- Pull request: `repo:ORG/REPO:pull_request`
- Manual dispatch: `repo:ORG/REPO:ref:refs/heads/BRANCH`

Ensure your condition uses a wildcard to match all these cases:
```json
"oidc:sub": "repo:YOUR_ORG/YOUR_REPO:*"
```

**Solution:** Update the trust policy:
```bash
aliyun ram UpdateRole \
  --RoleName github-actions \
  --NewAssumeRolePolicyDocument "$(cat trust-policy.json)"
```

#### 5. "id-token: write permission is missing"

**Problem:** The GitHub Actions job is missing the `id-token: write` permission.

**Solution:** Ensure both jobs in the workflow have:
```yaml
permissions:
  contents: read
  id-token: write
```

#### 6. Terraform fails with "InvalidAccessKeyId"

**Problem:** Terraform uses different environment variable names than those exported by the OIDC action.

**Solution:** The workflow includes a mapping step — verify it is present and runs before Terraform:
```yaml
- name: Export credentials for Terraform
  run: |
    echo "ALICLOUD_ACCESS_KEY=$ALIBABACLOUD_ACCESS_KEY_ID" >> $GITHUB_ENV
    echo "ALICLOUD_SECRET_KEY=$ALIBABACLOUD_ACCESS_KEY_SECRET" >> $GITHUB_ENV
    echo "ALICLOUD_SECURITY_TOKEN=$ALIBABACLOUD_SECURITY_TOKEN" >> $GITHUB_ENV
```

#### 7. Aliyun CLI returns "InvalidSecurityToken.Malformed"

**Problem:** The Aliyun CLI is not configured with the STS token alongside the temporary credentials.

**Solution:** Ensure the CLI configure step includes `--sts-token`:
```bash
aliyun configure set \
  --access-key-id "$ALIBABACLOUD_ACCESS_KEY_ID" \
  --access-key-secret "$ALIBABACLOUD_ACCESS_KEY_SECRET" \
  --sts-token "$ALIBABACLOUD_SECURITY_TOKEN" \
  --region "cn-hangzhou" \
  --language en
```

### Verification Checklist

- [ ] **OIDC Provider exists**
  ```bash
  aliyun ram GetOIDCProvider --OIDCProviderName github-actions
  ```

- [ ] **RAM Role exists**
  ```bash
  aliyun ram GetRole --RoleName github-actions
  ```

- [ ] **Trust policy allows GitHub OIDC with correct subject condition**
  ```bash
  aliyun ram GetRole --RoleName github-actions --query 'Role.AssumeRolePolicyDocument'
  ```

- [ ] **Role has VPC permissions attached**
  ```bash
  aliyun ram ListPoliciesForRole --RoleName github-actions
  ```

- [ ] **GitHub Secrets are configured**
  - `ALICLOUD_ROLE_ARN`
  - `ALICLOUD_OIDC_PROVIDER_ARN`

- [ ] **Both jobs have `id-token: write` permission**

### Quick Debug Commands Summary

```bash
# Set your variables
export ACCOUNT_ID="your-16-digit-account-id"
export ROLE_NAME="github-actions"
export PROVIDER_NAME="github-actions"

# 1. Check OIDC provider exists
aliyun ram GetOIDCProvider --OIDCProviderName ${PROVIDER_NAME}

# 2. Check role exists and review trust policy
aliyun ram GetRole --RoleName ${ROLE_NAME}

# 3. List policies attached to the role
aliyun ram ListPoliciesForRole --RoleName ${ROLE_NAME}

# 4. Verify ARNs
echo "Role ARN: acs:ram::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo "OIDC Provider ARN: acs:ram::${ACCOUNT_ID}:oidc-provider/${PROVIDER_NAME}"
```

## Security Best Practices

1. **Least Privilege:** Use a custom policy with only the required VPC/ECS permissions rather than the broad `AliyunVPCFullAccess` managed policy.
2. **Restrict by Repository:** Always include an `oidc:sub` condition in the trust policy scoped to your specific repository (`repo:ORG/REPO:*`), not just the organisation.
3. **Short Session Duration:** The workflow uses a 3600-second (1 hour) session. Reduce this if your workflow typically completes faster.
4. **No Static Keys:** Once OIDC is working, remove the old `ALICLOUD_ACCESS_KEY` and `ALICLOUD_SECRET_KEY` secrets from the repository.
5. **Audit Logging:** Enable ActionTrail in Alibaba Cloud to monitor role assumption events and API calls made during workflow runs.

## Complete Setup Script

Save this script as `setup-alicloud-oidc.sh`, update the configuration variables, and run it with the Aliyun CLI configured under an account with RAM administrative access:

```bash
#!/bin/bash
set -e

# Configuration — update these values
export ACCOUNT_ID="your-16-digit-account-id"
export GITHUB_ORG="your-github-org"
export GITHUB_REPO="your-repo-name"
export ROLE_NAME="github-actions"
export PROVIDER_NAME="github-actions"

echo "Setting up Alibaba Cloud OIDC for GitHub Actions..."
echo "Account ID:  ${ACCOUNT_ID}"
echo "GitHub Repo: ${GITHUB_ORG}/${GITHUB_REPO}"
echo ""

# Step 1: Create OIDC provider
echo "Creating OIDC provider..."
aliyun ram CreateOIDCProvider \
  --OIDCProviderName ${PROVIDER_NAME} \
  --IssuerURL https://token.actions.githubusercontent.com \
  --ClientIdList sts.aliyuncs.com || echo "OIDC provider already exists, skipping"

# Step 2: Create trust policy
cat > /tmp/trust-policy.json <<EOF
{
  "Statement": [
    {
      "Action": "sts:AssumeRoleWithOIDC",
      "Effect": "Allow",
      "Principal": {
        "Federated": "acs:ram::${ACCOUNT_ID}:oidc-provider/${PROVIDER_NAME}"
      },
      "Condition": {
        "StringLike": {
          "oidc:aud": "sts.aliyuncs.com",
          "oidc:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
        }
      }
    }
  ],
  "Version": "1"
}
EOF

# Step 3: Create RAM role
echo "Creating RAM role..."
aliyun ram CreateRole \
  --RoleName ${ROLE_NAME} \
  --Description "Role assumed by GitHub Actions via OIDC" \
  --AssumeRolePolicyDocument "$(cat /tmp/trust-policy.json)" || echo "Role already exists, skipping"

# Step 4: Create custom policy
cat > /tmp/vpc-policy.json <<EOF
{
  "Statement": [
    {
      "Action": [
        "vpc:CreateVpc",
        "vpc:DeleteVpc",
        "vpc:DescribeVpcs",
        "vpc:CreateVSwitch",
        "vpc:DeleteVSwitch",
        "vpc:DescribeVSwitches",
        "ecs:DescribeSecurityGroups",
        "ecs:DeleteSecurityGroup"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ],
  "Version": "1"
}
EOF

echo "Creating custom policy..."
aliyun ram CreatePolicy \
  --PolicyName GitHubActionsVpcDeployer \
  --Description "Minimal permissions for deploying VPCs via GitHub Actions" \
  --PolicyDocument "$(cat /tmp/vpc-policy.json)" || echo "Policy already exists, skipping"

# Step 5: Attach policy to role
echo "Attaching policy to role..."
aliyun ram AttachPolicyToRole \
  --PolicyType Custom \
  --PolicyName GitHubActionsVpcDeployer \
  --RoleName ${ROLE_NAME} || echo "Policy already attached, skipping"

# Cleanup temp files
rm -f /tmp/trust-policy.json /tmp/vpc-policy.json

echo ""
echo "Setup complete!"
echo ""
echo "Add these secrets to your GitHub repository (Settings > Secrets > Actions):"
echo ""
echo "  ALICLOUD_ROLE_ARN:          acs:ram::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo "  ALICLOUD_OIDC_PROVIDER_ARN: acs:ram::${ACCOUNT_ID}:oidc-provider/${PROVIDER_NAME}"
echo ""
echo "Then run the GitHub Actions workflow to verify the configuration."
```

## Additional Resources

- [Alibaba Cloud RAM OIDC Documentation](https://www.alibabacloud.com/help/en/ram/user-guide/overview-of-oidc-based-sso)
- [configure-aliyun-credentials-action](https://github.com/aliyun/configure-aliyun-credentials-action)
- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Alibaba Cloud RAM Policy Reference](https://www.alibabacloud.com/help/en/ram/user-guide/policy-elements)
- [Alibaba Cloud ActionTrail](https://www.alibabacloud.com/help/en/actiontrail)
