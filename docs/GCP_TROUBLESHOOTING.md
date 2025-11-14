# GCP Permissions Troubleshooting Guide

## Common Error: "Required 'compute.networks.create' permission" (Error 403)

This error occurs when the service account used by GitHub Actions doesn't have sufficient permissions to create network resources.

## Quick Fix

### Option 1: Grant Compute Admin Role (Recommended for Testing)

```bash
export PROJECT_ID="your-project-id"
export SERVICE_ACCOUNT_EMAIL="github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/compute.admin"
```

### Option 2: Grant Compute Network Admin Role (More Restrictive)

```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/compute.networkAdmin"
```

**Wait 60-120 seconds** for IAM changes to propagate before retrying the workflow.

---

## Debugging Steps

### 1. Verify Service Account Exists

```bash
export PROJECT_ID="your-project-id"
export SERVICE_ACCOUNT_EMAIL="github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} \
  --project=${PROJECT_ID}
```

**Expected Output:** Service account details with email and unique ID

**If fails:** The service account doesn't exist. Create it:
```bash
gcloud iam service-accounts create github-actions-sa \
  --project=${PROJECT_ID} \
  --display-name="GitHub Actions Service Account"
```

---

### 2. Check Current IAM Permissions

Check what roles are currently assigned to your service account:

```bash
# Method 1: Check project-level IAM policy
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --format="table(bindings.role)"
```

**Expected Output:** Should show at least one of:
- `roles/compute.admin`
- `roles/compute.networkAdmin`

**If empty or missing roles:** The service account has no permissions. Proceed to grant them.

```bash
# Method 2: Check specific service account IAM policy
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --format="json" | jq -r ".[] | select(.members[] | contains(\"${SERVICE_ACCOUNT_EMAIL}\"))"
```

---

### 3. Verify Workload Identity Federation Binding

Check if the Workload Identity binding is correctly configured:

```bash
export PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
export WORKLOAD_IDENTITY_POOL="github-actions-pool"
export GITHUB_ORG="your-github-org"
export GITHUB_REPO="your-repo-name"

# Check service account IAM policy for workload identity bindings
gcloud iam service-accounts get-iam-policy ${SERVICE_ACCOUNT_EMAIL} \
  --project=${PROJECT_ID} \
  --format=json
```

**Expected Output:** Should contain a binding with:
- `role: roles/iam.workloadIdentityUser`
- `members` containing `principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}/...`

**If missing:** Grant the Workload Identity User role:
```bash
WORKLOAD_IDENTITY_POOL_ID="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}"

gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT_EMAIL} \
  --project=${PROJECT_ID} \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"
```

---

### 4. Test Service Account Impersonation (Advanced)

Test if you can impersonate the service account locally:

```bash
gcloud auth print-access-token --impersonate-service-account=${SERVICE_ACCOUNT_EMAIL}
```

**If successful:** Permissions are working at the GCP level
**If fails:** There's an issue with the service account configuration

---

### 5. Check Which Permissions Are Needed

Verify what specific permissions the `compute.networks.create` requires:

```bash
# Get details about the compute.networkAdmin role
gcloud iam roles describe roles/compute.networkAdmin

# Get details about the compute.admin role
gcloud iam roles describe roles/compute.admin
```

The `compute.networks.create` permission is included in:
- ✅ `roles/compute.admin` (Full compute access)
- ✅ `roles/compute.networkAdmin` (Network-specific access)
- ✅ `roles/editor` (Project editor - not recommended for service accounts)

---

## Checking GCP Audit Logs

### Via Cloud Console

1. Navigate to: **Logging > Logs Explorer**
2. Use this query to see permission-denied errors:

```
protoPayload.authorizationInfo.permission="compute.networks.create"
protoPayload.status.code=7
resource.type="gce_network"
severity="ERROR"
```

3. Or filter for your service account:

```
protoPayload.authenticationInfo.principalEmail="${SERVICE_ACCOUNT_EMAIL}"
protoPayload.status.code=7
```

### Via gcloud CLI

```bash
# View recent permission denied errors for your service account
gcloud logging read "protoPayload.authenticationInfo.principalEmail=\"${SERVICE_ACCOUNT_EMAIL}\" AND protoPayload.status.code=7" \
  --limit 10 \
  --format json \
  --project=${PROJECT_ID}
```

```bash
# View all activities from your service account (last 1 hour)
gcloud logging read "protoPayload.authenticationInfo.principalEmail=\"${SERVICE_ACCOUNT_EMAIL}\"" \
  --limit 50 \
  --format json \
  --freshness=1h \
  --project=${PROJECT_ID}
```

---

## Complete Permission Grant Script

Run this script to grant all necessary permissions:

```bash
#!/bin/bash
set -e

# Configuration
export PROJECT_ID="your-project-id"
export SERVICE_ACCOUNT_NAME="github-actions-sa"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Granting permissions to ${SERVICE_ACCOUNT_EMAIL}..."

# Grant Compute Admin role (includes all compute permissions)
echo "Granting Compute Admin role..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/compute.admin" \
  --condition=None

echo "Verifying permissions..."
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --format="table(bindings.role)"

echo ""
echo "✅ Permissions granted successfully!"
echo "⏳ Wait 60-120 seconds for IAM propagation, then retry your GitHub workflow"
```

---

## Verification Checklist

Use this checklist to verify your setup:

- [ ] **Service Account Exists**
  ```bash
  gcloud iam service-accounts describe github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com
  ```

- [ ] **Service Account Has Compute Permissions**
  ```bash
  gcloud projects get-iam-policy ${PROJECT_ID} \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com AND bindings.role:roles/compute.*"
  ```

- [ ] **Workload Identity Pool Exists**
  ```bash
  gcloud iam workload-identity-pools describe github-actions-pool \
    --location=global --project=${PROJECT_ID}
  ```

- [ ] **Workload Identity Provider Exists**
  ```bash
  gcloud iam workload-identity-pools providers describe github-provider \
    --workload-identity-pool=github-actions-pool \
    --location=global --project=${PROJECT_ID}
  ```

- [ ] **Workload Identity Binding Is Configured**
  ```bash
  gcloud iam service-accounts get-iam-policy github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com \
    --format=json | jq '.bindings[] | select(.role=="roles/iam.workloadIdentityUser")'
  ```

- [ ] **GitHub Secrets Are Configured**
  - `GCP_PROJECT_ID`
  - `GCP_SERVICE_ACCOUNT`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`

- [ ] **Required APIs Are Enabled**
  ```bash
  gcloud services list --enabled --filter="name:(compute.googleapis.com OR iam.googleapis.com OR iamcredentials.googleapis.com OR sts.googleapis.com)"
  ```

---

## Common Issues and Solutions

### Issue 1: "Permission denied after granting role"

**Cause:** IAM changes can take up to 120 seconds to propagate

**Solution:**
- Wait 2-3 minutes after granting permissions
- Retry the GitHub Actions workflow

### Issue 2: "Service account not found"

**Cause:** The service account email in GitHub secrets doesn't match the actual service account

**Solution:**
```bash
# List all service accounts in your project
gcloud iam service-accounts list --project=${PROJECT_ID}

# Update GitHub secret with correct email
# Go to: Settings > Secrets and variables > Actions > GCP_SERVICE_ACCOUNT
```

### Issue 3: "Workload identity pool not found"

**Cause:** The workload identity provider resource name in GitHub secrets is incorrect

**Solution:**
```bash
# Get the correct provider resource name
gcloud iam workload-identity-pools providers describe github-provider \
  --workload-identity-pool=github-actions-pool \
  --location=global \
  --project=${PROJECT_ID} \
  --format="value(name)"

# Update GitHub secret: GCP_WORKLOAD_IDENTITY_PROVIDER
```

### Issue 4: "Attribute condition not met"

**Cause:** The workload identity provider's attribute condition doesn't match your repository

**Solution:**
```bash
# Check current attribute condition
gcloud iam workload-identity-pools providers describe github-provider \
  --workload-identity-pool=github-actions-pool \
  --location=global \
  --project=${PROJECT_ID} \
  --format="value(attributeCondition)"

# If incorrect, update or recreate the provider
# For a specific repository:
gcloud iam workload-identity-pools providers update-oidc github-provider \
  --workload-identity-pool=github-actions-pool \
  --location=global \
  --project=${PROJECT_ID} \
  --attribute-condition="assertion.repository == 'your-org/your-repo'"

# Or for all repos in org:
gcloud iam workload-identity-pools providers update-oidc github-provider \
  --workload-identity-pool=github-actions-pool \
  --location=global \
  --project=${PROJECT_ID} \
  --attribute-condition="assertion.repository_owner == 'your-org'"
```

### Issue 5: "Organization policy constraint violation"

**Cause:** Your GCP organization has policies restricting certain operations

**Solution:**
```bash
# Check organization policies
gcloud resource-manager org-policies list --project=${PROJECT_ID}

# Check specific constraint (if you get an organization policy error)
gcloud resource-manager org-policies describe compute.restrictVpcPeering \
  --project=${PROJECT_ID}
```

Contact your GCP organization administrator to review and adjust policies if needed.

---

## Alternative: Create Custom Role with Minimal Permissions

For production environments, create a custom role with only the required permissions:

```bash
export PROJECT_ID="your-project-id"
export CUSTOM_ROLE_ID="githubActionsVpcDeployer"

# Create custom role
gcloud iam roles create ${CUSTOM_ROLE_ID} \
  --project=${PROJECT_ID} \
  --title="GitHub Actions VPC Deployer" \
  --description="Minimal permissions for deploying VPCs via GitHub Actions" \
  --permissions="compute.networks.create,compute.networks.delete,compute.networks.get,compute.networks.list,compute.subnetworks.create,compute.subnetworks.delete,compute.subnetworks.get,compute.subnetworks.list,compute.firewalls.create,compute.firewalls.delete,compute.firewalls.get,compute.firewalls.list" \
  --stage=GA

# Grant custom role to service account
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="projects/${PROJECT_ID}/roles/${CUSTOM_ROLE_ID}"
```

---

## Additional Resources

- [GCP IAM Roles Reference](https://cloud.google.com/iam/docs/understanding-roles)
- [Compute Engine IAM Permissions](https://cloud.google.com/compute/docs/access/iam-permissions)
- [Troubleshooting Workload Identity Federation](https://cloud.google.com/iam/docs/troubleshooting-workload-identity-federation)
- [GCP Audit Logs](https://cloud.google.com/logging/docs/audit)

---

## Quick Debug Commands Summary

```bash
# Set your variables
export PROJECT_ID="your-project-id"
export SERVICE_ACCOUNT_EMAIL="github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# 1. Check service account exists
gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL}

# 2. Check current permissions
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --format="table(bindings.role)"

# 3. Grant required permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/compute.admin"

# 4. Check audit logs for errors
gcloud logging read "protoPayload.authenticationInfo.principalEmail=\"${SERVICE_ACCOUNT_EMAIL}\" AND protoPayload.status.code=7" \
  --limit 5 \
  --format json

# 5. Verify APIs are enabled
gcloud services list --enabled --project=${PROJECT_ID} | grep compute
```
