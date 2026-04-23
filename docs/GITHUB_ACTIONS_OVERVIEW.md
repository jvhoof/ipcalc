# GitHub Actions Overview

This document provides a structured overview of all GitHub Actions workflows for the ipcalc project, grouped by category. Items marked **⚠️ Review** highlight issues worth addressing.

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

### CLI Issues to Review

- ~~**⚠️ Hardcoded region** (`cli-test-aws-vpc.yml` line 72): `configure-aws-credentials` uses hardcoded `eu-north-1` instead of `${{ env.AWS_REGION }}`. If a different region is passed via `workflow_dispatch`, credentials are obtained for the wrong region.~~ **Fixed** — `configure-aws-credentials` now uses `${{ env.AWS_REGION }}`.
- ~~**⚠️ Static resource naming** (`cli-test-azure-vnet.yml`): `RESOURCE_GROUP` and `VNET_NAME` are set from the prefix alone (no unique ID) in the workflow-level `env` block, while individual jobs generate their own unique IDs. Parallel runs could collide.~~ **Fixed** — names are now built with a per-run unique ID (`steps.unique-id.outputs.id`).

---

## Parity Tests

These workflows verify that the **TypeScript CLI** and the **Python skill** (`scripts/ipcalc.py`) produce identical output for every supported format. No cloud credentials are required.

| Workflow | Cloud | Formats | Topologies | Comparisons | Trigger |
|----------|-------|---------|------------|-------------|---------|
| `parity-test-aws.yml` | AWS | cli, terraform, cloudformation | single VPC | 3 | push `main`¹, dispatch |
| `parity-test-azure.yml` | Azure | cli, terraform, bicep, arm, powershell | single VNet + hub-spoke | 10 | push `main`¹, dispatch |
| `parity-test-gcp.yml` | GCP | gcloud, terraform | single VPC + hub-spoke | 4 | push `main`¹, dispatch |
| `parity-test-alicloud.yml` | AliCloud | aliyun, terraform | single VPC | 2 | push `main`¹, PR¹, dispatch |

¹ Path filters: `src/templates/<provider>/**`, `skills/ipcalc-for-cloud/templates/<provider>/**`, `skills/ipcalc-for-cloud/scripts/template_processor.py`, workflow file itself

### Parity Test Job Details

Each workflow has a single job with this pattern:
1. Checkout + install Node.js (TypeScript) + install Python via `uv`
2. Generate outputs with TypeScript CLI for all formats
3. Generate outputs with Python skill for all formats
4. `diff` each pair, build a Markdown report, write to job summary
5. Upload diff artifacts (retention: 14 days)
6. Fail if any format differs

### Parity Issues to Review

- ~~**⚠️ PR trigger asymmetry** (`parity-test-alicloud.yml`): AliCloud parity runs on PRs; AWS, Azure, and GCP parity do not. Consider adding PR triggers to the other three so regressions are caught before merge.~~ **Fixed** — `pull_request` trigger removed from `parity-test-alicloud.yml`.
- ~~**⚠️ AWS has no hub-spoke parity**: AWS parity only tests single-VPC formats. GCP and Azure test both topologies. If AWS supports spoke/peering output it should be included here.~~ **N/A** — the CLI does not support `--spoke-cidrs` for AWS; hub-spoke is only implemented for Azure and GCP.

---

## Skill Tests

These workflows test the **Python skill** (`skills/ipcalc-for-cloud/`). Split into unit tests (no cloud) and network tests (real cloud deployment).

### Unit Tests

| Workflow | What it tests | Trigger |
|----------|--------------|---------|
| `skill-unit-test.yml` | pytest + coverage for `scripts/test_ipcalc.py` | push `main`¹, dispatch |

¹ Paths: `skills/ipcalc-for-cloud/scripts/**`, `.github/workflows/test-ipcalc-skill.yml`

**Job**: `skill-unit-test`
- Installs `requirements-dev.txt` via `uv`
- Runs `pytest` with `--cov`, HTML report, XML coverage
- Uploads test report + coverage artifacts (retention: 30 days)
- Writes coverage percentage to job summary

~~**⚠️ Review: Wrong workflow filename in path trigger** — the path filter references `.github/workflows/test-ipcalc-skill.yml` but the actual file is `skill-unit-test.yml`. Changes to the workflow file itself will never retrigger a run.~~ **Fixed** — path trigger now correctly references `skill-unit-test.yml`.

### Network Tests

These deploy real infrastructure using Python-generated configs and then validate it.

| Workflow | Cloud | Jobs | Trigger | Auth |
|----------|-------|------|---------|------|
| `skill-network-test-aws.yml` | AWS | Terraform, AWS CLI, CloudFormation | push `main`¹, dispatch | OIDC role assume |
| `skill-network-test-azure.yml` | Azure | ARM, CLI, Terraform, PowerShell, Bicep + 4 peering variants | push `main`², dispatch | OIDC (azure/login) |
| `skill-network-test-gcp.yml` | GCP | Terraform, gcloud | push `main`¹, dispatch | Workload Identity |
| `skill-network-test-alicloud.yml` | AliCloud | Terraform, Aliyun CLI | push `main`¹, dispatch | OIDC role assume |
| `skill-network-test-oci.yml` | Oracle | Terraform, OCI CLI³ | push `main`¹, dispatch | API key (secret) |

¹ Paths: `skills/ipcalc-for-cloud/scripts/**`, `skills/ipcalc-for-cloud/templates/<provider>/**`, workflow file  
² Paths: `skills/ipcalc-for-cloud/**`, workflow file (broader than others)  
³ OCI CLI job depends on Terraform job (`needs: deploy-with-terraform`)

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

#### Oracle (`skill-network-test-oci.yml`) — 2 sequential jobs
- `deploy-with-terraform`: Python → Terraform → validate VCN
- `deploy-with-oci-cli` (needs terraform): Python → OCI CLI script → validate VCN

### Skill Network Issues to Review

- ~~**⚠️ OCI sequencing** (`skill-network-test-oci.yml`): OCI CLI job waits for Terraform to finish. This halves parallelism and means a Terraform failure skips the CLI test. Consider running them independently.~~ **Fixed** — `needs: deploy-with-terraform` removed; both jobs now run in parallel.
- ~~**⚠️ Azure path trigger is broader** (`skill-network-test-azure.yml`): Trigger uses `skills/ipcalc-for-cloud/**` (all skill files), while other clouds target only `scripts/**` and `templates/<provider>/**`. A Python change for any cloud retriggers the Azure network tests.~~ **Fixed** — path trigger now scoped to `scripts/**` and `templates/azure/**`.

---

## Web Tests

These workflows build the Vue.js frontend and deploy it to a server via rsync over SSH.

| Workflow | Branch | Analytics Injection | Deploy Path |
|----------|--------|---------------------|-------------|
| `web-deploy.yml` | `main` | Yes (`<!-- ANALYTICS -->` replaced from secret) | `vars.DEPLOY_PATH` |
| `web-beta-deploy.yml` | `beta` | **No** | `vars.BETA_DEPLOY_PATH` |

Both workflows:
1. Checkout → Node.js 24 → `npm ci` → `npm run build`
2. Setup SSH key from secret
3. `rsync -avz --delete` to server
4. Clean up SSH key (`if: always()`)

### Web Issues to Review

- Analytics injection is intentionally absent from `web-beta-deploy.yml` — monitoring runs on the main site only.

---

## Other Workflows

These are not CLI/Parity/Skill/Web tests but are part of the CI/CD setup.

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| `api-docker-build.yml` | Build + push multi-arch Docker image for the API to GHCR | push `main` (api/skills paths) |
| `forticnapp-code-security-daily.yml` | Daily SCA scan via Lacework CLI, uploads SARIF | schedule (midnight UTC), dispatch |
| `forticnapp-code-security-pr.yml` | PR code security diff analysis via Lacework | pull_request |
| `forticnapp-code-security-push.yml` | Push code security analysis + daily schedule | push `main`, schedule (07:00 UTC), dispatch |
| `test-oracle-oidc.yml` | OCI multi-account OIDC token exchange smoke test | push `main`, dispatch |

### Other Issues to Review

- ~~**⚠️ Stale action versions** — FortiCNAPP workflows use `actions/checkout@v3` while all other workflows use `@v6`. `test-oracle-oidc.yml` uses `actions/setup-node@v4.0.3`.~~ **Fixed** — all three FortiCNAPP workflows updated to `actions/checkout@v6`; `test-oracle-oidc.yml` updated to `actions/setup-node@v6`.
- **⚠️ `test-oracle-oidc.yml` triggers on every main push**: This appears to be an isolated OIDC smoke test. Consider whether it should run on every push or only on dispatch.

---

## Issues Summary

| # | Severity | Workflow | Issue |
|---|----------|----------|-------|
| ~~1~~ | ~~High~~ | ~~`cli-test-aws-vpc.yml`~~ | ~~Hardcoded `eu-north-1` in `configure-aws-credentials` ignores `${{ env.AWS_REGION }}`~~ **Fixed** |
| ~~2~~ | ~~High~~ | ~~`skill-unit-test.yml`~~ | ~~Path trigger references non-existent `test-ipcalc-skill.yml`; workflow changes never self-trigger~~ **Fixed** |
| ~~3~~ | ~~Medium~~ | ~~`cli-test-azure-vnet.yml`~~ | ~~Static `RESOURCE_GROUP`/`VNET_NAME` env vars (no unique ID) risk collisions on concurrent runs~~ **Fixed** |
| ~~4~~ | ~~Medium~~ | ~~`web-beta-deploy.yml`~~ | ~~Analytics snippet not injected (unlike production deploy)~~ **By design** — monitoring on main site only |
| ~~5~~ | ~~Medium~~ | ~~`parity-test-alicloud.yml`~~ | ~~Only parity test with PR trigger; AWS/Azure/GCP parity don't run on PRs~~ **Fixed** |
| ~~6~~ | ~~Low~~ | ~~`skill-network-test-azure.yml`~~ | ~~Broader path trigger (`skills/ipcalc-for-cloud/**`) than other skill network tests~~ **Fixed** |
| ~~7~~ | ~~Low~~ | ~~`skill-network-test-oci.yml`~~ | ~~OCI CLI job is sequential (needs Terraform); other clouds are parallel~~ **Fixed** |
| ~~8~~ | ~~Low~~ | ~~FortiCNAPP workflows~~ | ~~Using `actions/checkout@v3`; `test-oracle-oidc.yml` uses `actions/setup-node@v4.0.3`~~ **Fixed** |
| ~~9~~ | ~~Low~~ | ~~`test-oracle-oidc.yml`~~ | ~~Runs on every `main` push; consider dispatch-only~~ **Fixed** |
| ~~10~~ | ~~Low~~ | ~~`parity-test-aws.yml`~~ | ~~No hub-spoke parity test (other clouds test both single and hub-spoke)~~ **N/A** — AWS CLI does not support hub-spoke |
