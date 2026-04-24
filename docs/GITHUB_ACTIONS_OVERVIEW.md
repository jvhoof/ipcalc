# GitHub Actions Overview

This document provides a structured overview of all GitHub Actions workflows for the ipcalc project, grouped by category.

## Status Badges

### CLI Tests
[![AWS VPC](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-aws-vpc.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-aws-vpc.yml)
[![Azure VNET](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-azure-vnet.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-azure-vnet.yml)
[![GCP VPC](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-gcp-vpc.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-gcp-vpc.yml)
[![AliCloud VSwitch](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-alicloud-vswitch.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-alicloud-vswitch.yml)
[![OCI VCN](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-oci-vcn.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/cli-test-oci-vcn.yml)

### Parity Tests
[![Parity AWS](https://github.com/jvhoof/ipcalc/actions/workflows/parity-test-aws.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/parity-test-aws.yml)
[![Parity Azure](https://github.com/jvhoof/ipcalc/actions/workflows/parity-test-azure.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/parity-test-azure.yml)
[![Parity GCP](https://github.com/jvhoof/ipcalc/actions/workflows/parity-test-gcp.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/parity-test-gcp.yml)
[![Parity AliCloud](https://github.com/jvhoof/ipcalc/actions/workflows/parity-test-alicloud.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/parity-test-alicloud.yml)

### Skill Tests
[![Skill Unit Tests](https://github.com/jvhoof/ipcalc/actions/workflows/skill-unit-test.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/skill-unit-test.yml)
[![Skill AWS](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-aws.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-aws.yml)
[![Skill Azure](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-azure.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-azure.yml)
[![Skill GCP](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-gcp.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-gcp.yml)
[![Skill AliCloud](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-alicloud.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-alicloud.yml)
[![Skill OCI](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-oci.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/skill-network-test-oci.yml)

### Web Deploys
[![Web Deploy](https://github.com/jvhoof/ipcalc/actions/workflows/web-deploy.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/web-deploy.yml)
[![Web Beta Deploy](https://github.com/jvhoof/ipcalc/actions/workflows/web-beta-deploy.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/web-beta-deploy.yml)

### Other
[![API Docker Build](https://github.com/jvhoof/ipcalc/actions/workflows/api-docker-build.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/api-docker-build.yml)
[![FortiCNAPP Daily SCA](https://github.com/jvhoof/ipcalc/actions/workflows/forticnapp-code-security-daily.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/forticnapp-code-security-daily.yml)
[![FortiCNAPP PR](https://github.com/jvhoof/ipcalc/actions/workflows/forticnapp-code-security-pr.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/forticnapp-code-security-pr.yml)
[![FortiCNAPP Push](https://github.com/jvhoof/ipcalc/actions/workflows/forticnapp-code-security-push.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/forticnapp-code-security-push.yml)
[![OCI OIDC Test](https://github.com/jvhoof/ipcalc/actions/workflows/test-oracle-oidc.yml/badge.svg)](https://github.com/jvhoof/ipcalc/actions/workflows/test-oracle-oidc.yml)

---

## CLI Tests

These workflows test the **TypeScript CLI** (`npm run cli`) by generating cloud infrastructure configuration and deploying it to real cloud accounts.

| Workflow | Cloud | Jobs | Trigger | Auth |
|----------|-------|------|---------|------|
| `cli-test-aws-vpc.yml` | AWS | Terraform | push `main`¹, dispatch | OIDC role assume |
| `cli-test-azure-vnet.yml` | Azure | ARM, CLI, Terraform, PowerShell, Bicep + peering variants | push `main`¹, dispatch | OIDC (azure/login) |
| `cli-test-gcp-vpc.yml` | GCP | Terraform, gcloud peering, Terraform peering | push `main`¹, dispatch | Workload Identity |
| `cli-test-alicloud-vswitch.yml` | AliCloud | Terraform, Aliyun CLI² | push `main`¹, dispatch | OIDC role assume |
| `cli-test-oci-vcn.yml` | Oracle | Terraform | push `main`¹, dispatch | API key (secret) |

¹ Paths-ignore: `.github/workflows/**`, `skills/**`  
² Aliyun CLI job depends on Terraform job completing (`needs: deploy-with-terraform`)

### CLI Test Job Details

#### AWS (`cli-test-aws-vpc.yml`) — 1 job
- `deploy-with-terraform`: generates Terraform via CLI → init/plan/apply → validate VPC+subnets → cleanup

#### Azure (`cli-test-azure-vnet.yml`) — ~10 jobs
- Single VNET: `deploy-with-arm-template`, `deploy-with-azure-cli`, `deploy-with-terraform`, `deploy-with-powershell`, `deploy-with-bicep`
- Hub-Spoke peering: `deploy-peering-with-azure-cli`, `deploy-peering-with-terraform`, `deploy-peering-with-arm-template`, `deploy-peering-with-powershell`, `deploy-peering-with-bicep`

#### GCP (`cli-test-gcp-vpc.yml`) — 3 jobs
- `deploy-with-terraform`: single VPC via Terraform
- `deploy-peering-with-gcloud`: hub + 3 spokes via gcloud CLI, validates peering ACTIVE state
- `deploy-peering-with-terraform`: hub + 3 spokes via Terraform, validates peering ACTIVE state

#### AliCloud (`cli-test-alicloud-vswitch.yml`) — 2 jobs
- `deploy-with-terraform`: generates Terraform → deploy → validate vSwitches
- `deploy-with-aliyun-cli`: generates Aliyun CLI script → deploy → validate vSwitches

#### Oracle (`cli-test-oci-vcn.yml`) — 1 job
- `deploy-with-terraform`: generates Terraform → init/plan/apply → validate VCN+subnets

---

## Parity Tests

These workflows verify that the **TypeScript CLI** and the **Python skill** (`scripts/ipcalc.py`) produce identical output for every supported format. No cloud credentials are required.

| Workflow | Cloud | Formats | Topologies | Comparisons | Trigger |
|----------|-------|---------|------------|-------------|---------|
| `parity-test-aws.yml` | AWS | cli, terraform, cloudformation | single VPC | 3 | push `main`¹, dispatch |
| `parity-test-azure.yml` | Azure | cli, terraform, bicep, arm, powershell | single VNet + hub-spoke | 10 | push `main`¹, dispatch |
| `parity-test-gcp.yml` | GCP | gcloud, terraform | single VPC + hub-spoke | 4 | push `main`¹, dispatch |
| `parity-test-alicloud.yml` | AliCloud | aliyun, terraform | single VPC | 2 | push `main`¹, dispatch |

¹ Path filters: `src/templates/<provider>/**`, `skills/ipcalc-for-cloud/templates/<provider>/**`, `skills/ipcalc-for-cloud/scripts/template_processor.py`, workflow file itself

### Parity Test Job Details

Each workflow has a single job with this pattern:
1. Checkout + install Node.js (TypeScript) + install Python via `uv`
2. Generate outputs with TypeScript CLI for all formats
3. Generate outputs with Python skill for all formats
4. `diff` each pair, build a Markdown report, write to job summary
5. Upload diff artifacts (retention: 14 days)
6. Fail if any format differs

> **Note:** AWS parity tests only cover the single-VPC topology. The CLI does not support `--spoke-cidrs` for AWS; hub-spoke is only implemented for Azure and GCP.

---

## Skill Tests

These workflows test the **Python skill** (`skills/ipcalc-for-cloud/`). Split into unit tests (no cloud) and network tests (real cloud deployment).

### Unit Tests

| Workflow | What it tests | Trigger |
|----------|--------------|---------|
| `skill-unit-test.yml` | pytest + coverage for `scripts/test_ipcalc.py` | push `main`¹, dispatch |

¹ Paths: `skills/ipcalc-for-cloud/scripts/**`, `.github/workflows/skill-unit-test.yml`

**Job**: `skill-unit-test`
- Installs `requirements-dev.txt` via `uv`
- Runs `pytest` with `--cov`, HTML report, XML coverage
- Uploads test report + coverage artifacts (retention: 30 days)
- Writes coverage percentage to job summary

### Network Tests

These deploy real infrastructure using Python-generated configs and then validate it.

| Workflow | Cloud | Jobs | Trigger | Auth |
|----------|-------|------|---------|------|
| `skill-network-test-aws.yml` | AWS | Terraform, AWS CLI, CloudFormation | push `main`¹, dispatch | OIDC role assume |
| `skill-network-test-azure.yml` | Azure | ARM, CLI, Terraform, PowerShell, Bicep + 4 peering variants | push `main`², dispatch | OIDC (azure/login) |
| `skill-network-test-gcp.yml` | GCP | Terraform, gcloud | push `main`¹, dispatch | Workload Identity |
| `skill-network-test-alicloud.yml` | AliCloud | Terraform, Aliyun CLI | push `main`¹, dispatch | OIDC role assume |
| `skill-network-test-oci.yml` | Oracle | Terraform, OCI CLI | push `main`¹, dispatch | API key (secret) |

¹ Paths: `skills/ipcalc-for-cloud/scripts/**`, `skills/ipcalc-for-cloud/templates/<provider>/**`, workflow file  
² Paths: `skills/ipcalc-for-cloud/scripts/**`, `skills/ipcalc-for-cloud/templates/azure/**`, workflow file

#### AWS (`skill-network-test-aws.yml`) — 3 parallel jobs
- `deploy-with-terraform`: Python → Terraform → validate VPC
- `deploy-with-aws-cli`: Python → AWS CLI script → validate VPC
- `deploy-with-cloudformation`: Python → CloudFormation → validate VPC

#### Azure (`skill-network-test-azure.yml`) — 9 jobs
- Single VNET: ARM template, Azure CLI, Terraform, PowerShell, Bicep
- Hub-Spoke peering: Azure CLI, Terraform, ARM template, PowerShell, Bicep

#### GCP (`skill-network-test-gcp.yml`) — 2 parallel jobs
- `deploy-with-terraform`: Python → Terraform → validate VPC
- `deploy-with-gcloud`: Python → gcloud script → validate VPC

#### AliCloud (`skill-network-test-alicloud.yml`) — 2 parallel jobs
- `deploy-with-terraform`: Python → Terraform → validate VPC
- `deploy-with-aliyun-cli`: Python → Aliyun CLI script → validate VPC

#### Oracle (`skill-network-test-oci.yml`) — 2 parallel jobs
- `deploy-with-terraform`: Python → Terraform → validate VCN
- `deploy-with-oci-cli`: Python → OCI CLI script → validate VCN

---

## Web Tests

These workflows build the Vue.js frontend and deploy it to a server via rsync over SSH.

| Workflow | Branch | Analytics Injection | Deploy Path |
|----------|--------|---------------------|-------------|
| `web-deploy.yml` | `main` | Yes (`<!-- ANALYTICS -->` replaced from secret) | `vars.DEPLOY_PATH` |
| `web-beta-deploy.yml` | `beta` | No | `vars.BETA_DEPLOY_PATH` |

Both workflows:
1. Checkout → Node.js 24 → `npm ci` → `npm run build`
2. Setup SSH key from secret
3. `rsync -avz --delete` to server
4. Clean up SSH key (`if: always()`)

> Analytics injection is intentionally absent from `web-beta-deploy.yml` — monitoring runs on the main site only.

---

## Other Workflows

These are not CLI/Parity/Skill/Web tests but are part of the CI/CD setup.

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| `api-docker-build.yml` | Build + push multi-arch Docker image for the API to GHCR | push `main` (api/skills paths) |
| `forticnapp-code-security-daily.yml` | Daily SCA scan via Lacework CLI, uploads SARIF | schedule (midnight UTC), dispatch |
| `forticnapp-code-security-pr.yml` | PR code security diff analysis via Lacework | pull_request |
| `forticnapp-code-security-push.yml` | Push code security analysis + daily schedule | push `main`, schedule (07:00 UTC), dispatch |
| `test-oracle-oidc.yml` | OCI multi-account OIDC token exchange smoke test | dispatch |
