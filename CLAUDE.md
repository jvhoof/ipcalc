# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Web UI
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build → dist/
npm run typecheck    # TypeScript type checking (vue-tsc --noEmit)

# CLI
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 4
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 2 --output terraform

# Python skill / API
cd skills/ipcalc-for-cloud/scripts
uv run python -m pytest test_ipcalc.py -v        # All unit tests
uv run python -m pytest test_ipcalc.py -v -k "azure"  # Single test class

# API server
cd api && uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

## Architecture

This project has **three parallel implementations** of the same IP calculation + IaC generation logic that must stay in sync:

### 1. TypeScript Web UI + CLI (`src/`)
- Vue 3 / Vuetify 3 SPA (`src/components/*.vue`, entry: `src/App.vue`)
- CLI shares the core IP math via `src/cli/ipCalculator.ts` (imported by both the web components and `src/cli/index.ts`)
- Templates for IaC output live in `src/templates/{provider}/` and are loaded differently per runtime:
  - **Web:** `src/utils/templateLoader.ts` (browser `fetch()`)
  - **CLI:** `src/cli/templateLoaderNode.ts` (Node `fs.readFileSync`)

### 2. Python Skill (`skills/ipcalc-for-cloud/scripts/`)
- Standalone Python re-implementation that must produce identical output to the TypeScript CLI
- `ipcalc.py` — subnet calculation, mirrors `src/cli/ipCalculator.ts`
- `cloud_provider_config.py` — provider constants, mirrors `src/config/cloudProviderConfig.ts`
- `template_processor.py` — IaC rendering (~1400 lines), mirrors template output from the TS side
- `diagram_generator.py` — Azure D2 diagram generation (Azure-only, no TS equivalent)
- Templates are in `skills/ipcalc-for-cloud/templates/` — a separate copy from `src/templates/`

### 3. FastAPI HTTP API (`api/main.py`)
- Imports the Python skill scripts directly via `sys.path.insert` (no file duplication)
- Serves the SPA static files (`dist/`) alongside the `/api/{provider}` endpoints
- Returns RFC 9457 Problem Details for all errors

### Adding a New Cloud Provider

Seven files must all be updated together to maintain parity:
1. `src/config/cloudProviderConfig.ts` — reserved IPs, CIDR limits, AZ list
2. `src/config/cloudThemes.ts` — UI color scheme
3. `src/components/{Provider}Calculator.vue` — new calculator component
4. `src/utils/templateLoader.ts` + `src/cli/templateLoaderNode.ts` — template loaders
5. `src/cli/index.ts` — route new `--output` formats
6. `skills/ipcalc-for-cloud/scripts/cloud_provider_config.py` — Python equivalent of step 1
7. `skills/ipcalc-for-cloud/scripts/template_processor.py` — Python IaC rendering functions
8. Templates in **both** `src/templates/{provider}/` and `skills/ipcalc-for-cloud/templates/{provider}/`

### IP Reservation Rules by Provider

| Provider    | Reserved IPs | First N | Last N |
|-------------|-------------|---------|--------|
| Azure       | 5           | 4       | 1      |
| AWS         | 5           | 4       | 1      |
| GCP         | 4           | 2       | 2      |
| Oracle      | 3           | 2       | 1      |
| Alibaba     | 4           | 1       | 3      |
| On-Premises | 2           | 1       | 1      |

### Hub-Spoke Topology

Azure and GCP support hub-spoke peering via `--spoke-cidrs` / `--spoke-subnets` CLI flags. The Python skill and TypeScript CLI must both handle `generate_hub_spoke_topology()` / the spoke rendering path in templates.

### CI/CD

23 GitHub Actions workflows:
- `cli-test-{provider}-*.yml` — deploy real cloud infra, validate, destroy
- `parity-test-*.yml` — diff TypeScript vs Python output for identical inputs (critical: keeps implementations in sync)
- `skill-unit-test.yml` — runs `pytest` on the Python skill
- `web-{prod,beta}.yml` — build and deploy the SPA
- `api-docker-build.yml` — build and push the API Docker image
- `forticnapp-*.yml` — security scanning (daily + PR)
