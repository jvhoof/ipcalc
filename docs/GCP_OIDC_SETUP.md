# GCP Workload Identity Federation (OIDC) Setup Guide

This guide walks you through setting up OpenID Connect (OIDC) authentication between GitHub Actions and Google Cloud Platform using Workload Identity Federation. This allows GitHub Actions workflows to authenticate to GCP without using long-lived service account keys.

## Overview

Workload Identity Federation allows GitHub Actions to impersonate a GCP service account using short-lived tokens, eliminating the need to store and manage service account keys as secrets.

## Prerequisites

- A GCP project with billing enabled
- Owner or Editor role on the GCP project
- GitHub repository with Actions enabled
- `gcloud` CLI installed (optional, for command-line setup)

## Setup Steps

### 1. Enable Required APIs

First, enable the necessary GCP APIs:

```bash
gcloud services enable iamcredentials.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable sts.googleapis.com
gcloud services enable compute.googleapis.com
```

Or via the Cloud Console:
- Navigate to **APIs & Services > Library**
- Search for and enable:
  - IAM Service Account Credentials API
  - Cloud Resource Manager API
  - Security Token Service API
  - Compute Engine API

### 2. Create a Service Account

Create a dedicated service account for GitHub Actions:

```bash
export PROJECT_ID="your-project-id"
export SERVICE_ACCOUNT_NAME="github-actions-sa"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
  --project=${PROJECT_ID} \
  --description="Service account for GitHub Actions" \
  --display-name="GitHub Actions Service Account"
```

Or via Cloud Console:
- Navigate to **IAM & Admin > Service Accounts**
- Click **+ CREATE SERVICE ACCOUNT**
- Name: `github-actions-sa`
- Description: `Service account for GitHub Actions`
- Click **CREATE AND CONTINUE**

### 3. Grant Required Permissions

Grant the service account permissions to manage compute resources:

```bash
# Compute Admin role (for creating VPCs, subnets, etc.)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/compute.admin"

# Optional: Additional roles based on your needs
# Network Admin
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/compute.networkAdmin"

# Service Account User (if creating instances)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/iam.serviceAccountUser"
```

Or via Cloud Console:
- Navigate to **IAM & Admin > IAM**
- Click **+ GRANT ACCESS**
- Add the service account email
- Assign roles:
  - `Compute Admin` or
  - `Compute Network Admin` (more restrictive)

### 4. Create Workload Identity Pool

Create a Workload Identity Pool for GitHub Actions:

```bash
export WORKLOAD_IDENTITY_POOL="github-actions-pool"
export WORKLOAD_IDENTITY_POOL_ID="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}"

# Get project number
export PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")

# Create the pool
gcloud iam workload-identity-pools create ${WORKLOAD_IDENTITY_POOL} \
  --project=${PROJECT_ID} \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --description="Workload Identity Pool for GitHub Actions"
```

Or via Cloud Console:
- Navigate to **IAM & Admin > Workload Identity Federation**
- Click **+ CREATE POOL**
- Pool name: `github-actions-pool`
- Description: `Workload Identity Pool for GitHub Actions`
- Click **CONTINUE**

### 5. Create Workload Identity Provider

Create a provider for GitHub within the pool:

```bash
export WORKLOAD_IDENTITY_PROVIDER="github-provider"
export GITHUB_ORG="your-github-org"
export GITHUB_REPO="your-repo-name"

gcloud iam workload-identity-pools providers create-oidc ${WORKLOAD_IDENTITY_PROVIDER} \
  --project=${PROJECT_ID} \
  --location="global" \
  --workload-identity-pool=${WORKLOAD_IDENTITY_POOL} \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

**Attribute Mapping Explanation:**
- `google.subject`: Maps to the GitHub Actions subject claim
- `attribute.actor`: The GitHub user who triggered the workflow
- `attribute.repository`: The repository name (org/repo)
- `attribute.repository_owner`: The GitHub organization or user

**Attribute Condition:**
- Restricts access to repositories owned by your organization
- For personal repos, use your GitHub username instead

Or via Cloud Console:
- In the Workload Identity Pool creation wizard, click **ADD PROVIDER**
- Provider type: **OpenID Connect (OIDC)**
- Provider name: `github-provider`
- Issuer URL: `https://token.actions.githubusercontent.com`
- Audiences: `Default audience`
- Attribute mapping:
  ```
  google.subject = assertion.sub
  attribute.actor = assertion.actor
  attribute.repository = assertion.repository
  attribute.repository_owner = assertion.repository_owner
  ```
- Attribute conditions (optional):
  ```
  assertion.repository_owner == 'your-github-org'
  ```

### 6. Grant Service Account Access to Workload Identity

Allow the Workload Identity Pool to impersonate the service account:

```bash
# For a specific repository
gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT_EMAIL} \
  --project=${PROJECT_ID} \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"

# Or for all repositories in your organization
gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT_EMAIL} \
  --project=${PROJECT_ID} \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository_owner/${GITHUB_ORG}"
```

### 7. Get the Workload Identity Provider Resource Name

Get the full provider resource name for GitHub Actions:

```bash
gcloud iam workload-identity-pools providers describe ${WORKLOAD_IDENTITY_PROVIDER} \
  --project=${PROJECT_ID} \
  --location="global" \
  --workload-identity-pool=${WORKLOAD_IDENTITY_POOL} \
  --format="value(name)"
```

This will output something like:
```
projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
```

### 8. Configure GitHub Repository Secrets

Add the following secrets to your GitHub repository:

1. Navigate to your GitHub repository
2. Go to **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `GCP_PROJECT_ID` | `your-project-id` | Your GCP project ID |
| `GCP_SERVICE_ACCOUNT` | `github-actions-sa@your-project-id.iam.gserviceaccount.com` | Service account email |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider` | Full provider resource name |

### 9. Test the Configuration

The GitHub workflow is already configured to use Workload Identity Federation. The key step in the workflow is:

```yaml
- name: Authenticate to Google Cloud
  id: auth
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
```

Run the workflow to test:
1. Go to **Actions** in your GitHub repository
2. Select **GCP VPC Deployment Test**
3. Click **Run workflow**
4. Monitor the execution

## Troubleshooting

### Common Issues

#### 1. "Permission denied" errors

**Problem:** Service account lacks necessary permissions

**Solution:** Verify IAM roles:
```bash
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}"
```

#### 2. "Workload Identity Pool does not exist"

**Problem:** Pool name or provider name is incorrect

**Solution:** List pools and providers:
```bash
gcloud iam workload-identity-pools list --location=global --project=${PROJECT_ID}
gcloud iam workload-identity-pools providers list \
  --workload-identity-pool=${WORKLOAD_IDENTITY_POOL} \
  --location=global \
  --project=${PROJECT_ID}
```

#### 3. "Token exchange failed"

**Problem:** Attribute condition may be too restrictive or incorrect

**Solution:** Check attribute condition:
```bash
gcloud iam workload-identity-pools providers describe ${WORKLOAD_IDENTITY_PROVIDER} \
  --workload-identity-pool=${WORKLOAD_IDENTITY_POOL} \
  --location=global \
  --project=${PROJECT_ID} \
  --format="yaml(attributeCondition)"
```

#### 4. API not enabled

**Problem:** Required APIs are not enabled

**Solution:** Enable all required APIs:
```bash
gcloud services enable \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  sts.googleapis.com \
  compute.googleapis.com \
  --project=${PROJECT_ID}
```

## Security Best Practices

1. **Least Privilege**: Grant only the minimum required permissions to the service account
2. **Attribute Conditions**: Use restrictive attribute conditions to limit which repositories can authenticate
3. **Audit Logging**: Enable Cloud Audit Logs to monitor service account usage
4. **Rotation**: While OIDC tokens are short-lived, regularly review and update permissions
5. **Repository-Specific Access**: Consider creating separate service accounts for different repositories or purposes

## Additional Resources

- [GCP Workload Identity Federation Documentation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [google-github-actions/auth](https://github.com/google-github-actions/auth)

## Complete Setup Script

Here's a complete script to automate the entire setup:

```bash
#!/bin/bash
set -e

# Configuration
export PROJECT_ID="your-project-id"
export GITHUB_ORG="your-github-org"
export GITHUB_REPO="your-repo-name"
export SERVICE_ACCOUNT_NAME="github-actions-sa"
export WORKLOAD_IDENTITY_POOL="github-actions-pool"
export WORKLOAD_IDENTITY_PROVIDER="github-provider"

# Derived values
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
export PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
export WORKLOAD_IDENTITY_POOL_ID="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}"

echo "Setting up Workload Identity Federation for GitHub Actions..."
echo "Project ID: ${PROJECT_ID}"
echo "GitHub Org: ${GITHUB_ORG}"
echo "GitHub Repo: ${GITHUB_REPO}"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  sts.googleapis.com \
  compute.googleapis.com \
  --project=${PROJECT_ID}

# Create service account
echo "Creating service account..."
gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
  --project=${PROJECT_ID} \
  --description="Service account for GitHub Actions" \
  --display-name="GitHub Actions Service Account" || echo "Service account already exists"

# Grant permissions
echo "Granting permissions..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/compute.admin"

# Create workload identity pool
echo "Creating Workload Identity Pool..."
gcloud iam workload-identity-pools create ${WORKLOAD_IDENTITY_POOL} \
  --project=${PROJECT_ID} \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --description="Workload Identity Pool for GitHub Actions" || echo "Pool already exists"

# Create provider
echo "Creating Workload Identity Provider..."
gcloud iam workload-identity-pools providers create-oidc ${WORKLOAD_IDENTITY_PROVIDER} \
  --project=${PROJECT_ID} \
  --location="global" \
  --workload-identity-pool=${WORKLOAD_IDENTITY_POOL} \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" || echo "Provider already exists"

# Grant workload identity user role
echo "Granting Workload Identity User role..."
gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT_EMAIL} \
  --project=${PROJECT_ID} \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"

# Get provider resource name
echo ""
echo "✅ Setup complete!"
echo ""
echo "Add these secrets to your GitHub repository:"
echo ""
echo "GCP_PROJECT_ID: ${PROJECT_ID}"
echo "GCP_SERVICE_ACCOUNT: ${SERVICE_ACCOUNT_EMAIL}"
echo ""
echo "GCP_WORKLOAD_IDENTITY_PROVIDER:"
gcloud iam workload-identity-pools providers describe ${WORKLOAD_IDENTITY_PROVIDER} \
  --project=${PROJECT_ID} \
  --location="global" \
  --workload-identity-pool=${WORKLOAD_IDENTITY_POOL} \
  --format="value(name)"
```

Save this script as `setup-gcp-oidc.sh`, make it executable (`chmod +x setup-gcp-oidc.sh`), and run it after updating the configuration variables.
