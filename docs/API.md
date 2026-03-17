# ipcalc HTTP API

A lightweight FastAPI server that exposes the ipcalc IaC generation engine over HTTP, allowing you to download generated code directly from a shell without opening a browser.

## Quick start

```bash
cd api
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

The server proxies through nginx at `/api/` in production. In development it listens directly on port 8000.

Interactive API docs are available at `/api/docs`.

---

## Endpoints

### Azure

```
GET /api/azure
```

#### Parameters

| Parameter | Required | Type | Constraints | Description |
|-----------|----------|------|-------------|-------------|
| `cidr` | Yes | string | Valid IPv4 CIDR, max 18 chars | Hub VNet CIDR block, e.g. `10.0.0.0/16` |
| `subnets` | Yes | integer | 1–256 | Number of subnets |
| `format` | Yes | string | See table below | Output format |
| `prefix` | No | integer | 1–32 | Desired subnet prefix, e.g. `26` for `/26` |
| `spoke-cidrs` | No | string | Comma-separated, max 10 CIDRs | Spoke VNet CIDRs for hub-spoke topology |
| `spoke-subnets` | No | string | Comma-separated integers 1–256 | Subnet counts per spoke (defaults to `2` each) |

#### Output formats

| `format` | File | Content-Type |
|----------|------|--------------|
| `terraform` | `main.tf` | `text/plain` |
| `cli` | `deploy.sh` | `text/x-shellscript` |
| `bicep` | `main.bicep` | `text/plain` |
| `arm` | `azuredeploy.json` | `application/json` |
| `powershell` | `deploy.ps1` | `text/plain` |

---

### AWS

```
GET /api/aws
```

#### Parameters

| Parameter | Required | Type | Constraints | Description |
|-----------|----------|------|-------------|-------------|
| `cidr` | Yes | string | Valid IPv4 CIDR, max 18 chars | VPC CIDR block, e.g. `10.0.0.0/16` |
| `subnets` | Yes | integer | 1–256 | Number of subnets |
| `format` | Yes | string | See table below | Output format |
| `prefix` | No | integer | 1–32 | Desired subnet prefix, e.g. `24` for `/24` |

#### Output formats

| `format` | File | Content-Type |
|----------|------|--------------|
| `terraform` | `main.tf` | `text/plain` |
| `cli` | `deploy.sh` | `text/x-shellscript` |
| `cloudformation` | `template.yaml` | `text/plain` |

---

### GCP

```
GET /api/gcp
```

#### Parameters

| Parameter | Required | Type | Constraints | Description |
|-----------|----------|------|-------------|-------------|
| `cidr` | Yes | string | Valid IPv4 CIDR, max 18 chars | Hub VPC CIDR block, e.g. `10.0.0.0/16` |
| `subnets` | Yes | integer | 1–256 | Number of subnets |
| `format` | Yes | string | See table below | Output format |
| `prefix` | No | integer | 1–32 | Desired subnet prefix, e.g. `24` for `/24` |
| `spoke-cidrs` | No | string | Comma-separated, max 10 CIDRs | Spoke VPC CIDRs for hub-spoke topology |
| `spoke-subnets` | No | string | Comma-separated integers 1–256 | Subnet counts per spoke (defaults to `2` each) |

#### Output formats

| `format` | File | Content-Type |
|----------|------|--------------|
| `terraform` | `main.tf` | `text/plain` |
| `gcloud` | `deploy.sh` | `text/x-shellscript` |

---

## Examples

### Azure: Download and apply Terraform

```bash
curl "https://ipcalc.example.com/api/azure?cidr=10.0.0.0/16&subnets=4&format=terraform" > main.tf
terraform init && terraform apply
```

### Azure: Run an Azure CLI deployment script directly

```bash
curl "https://ipcalc.example.com/api/azure?cidr=172.16.0.0/24&subnets=4&format=cli" | bash
```

### Azure: Save a Bicep template

```bash
curl "https://ipcalc.example.com/api/azure?cidr=10.0.0.0/16&subnets=4&format=bicep" > main.bicep
```

### Azure: Custom subnet prefix

```bash
curl "https://ipcalc.example.com/api/azure?cidr=10.0.0.0/8&subnets=4&format=terraform&prefix=24" > main.tf
```

### Azure: Hub-spoke topology

```bash
curl "https://ipcalc.example.com/api/azure?cidr=10.0.0.0/16&subnets=2&format=terraform&spoke-cidrs=10.1.0.0/24,10.2.0.0/24&spoke-subnets=2,2" > main.tf
```

### AWS: Download and apply Terraform

```bash
curl "https://ipcalc.example.com/api/aws?cidr=10.0.0.0/16&subnets=4&format=terraform" > main.tf
terraform init && terraform apply
```

### AWS: Run an AWS CLI deployment script directly

```bash
curl "https://ipcalc.example.com/api/aws?cidr=172.16.0.0/24&subnets=4&format=cli" | bash
```

### AWS: Save a CloudFormation template

```bash
curl "https://ipcalc.example.com/api/aws?cidr=10.0.0.0/16&subnets=4&format=cloudformation" > template.yaml
```

### GCP: Download and apply Terraform

```bash
curl "https://ipcalc.example.com/api/gcp?cidr=10.0.0.0/16&subnets=4&format=terraform" > main.tf
terraform init && terraform apply
```

### GCP: Run a gcloud deployment script directly

```bash
curl "https://ipcalc.example.com/api/gcp?cidr=10.0.0.0/16&subnets=4&format=gcloud" | bash
```

### GCP: Hub-spoke topology

```bash
curl "https://ipcalc.example.com/api/gcp?cidr=10.0.0.0/16&subnets=2&format=terraform&spoke-cidrs=10.1.0.0/16,10.2.0.0/16&spoke-subnets=2,2" > main.tf
```

---

## Error responses

All errors return JSON with a `detail` field explaining what went wrong. The HTTP status code indicates the error category.

### HTTP 400 — Invalid input

Returned when a parameter value is not acceptable.

```bash
# Invalid CIDR notation
$ curl "https://ipcalc.example.com/api/azure?cidr=not-a-cidr&subnets=4&format=terraform"
{"detail":"'cidr' value 'not-a-cidr' is not a valid CIDR block. Expected an IPv4 network in CIDR notation, e.g. 10.0.0.0/16."}

# IPv6 CIDR (not supported)
$ curl "https://ipcalc.example.com/api/aws?cidr=2001:db8::/32&subnets=4&format=terraform"
{"detail":"'cidr' value '2001:db8::/32' is IPv6. Only IPv4 CIDR blocks are supported."}

# Unknown output format
$ curl "https://ipcalc.example.com/api/azure?cidr=10.0.0.0/16&subnets=4&format=unknown"
{"detail":"Invalid format 'unknown'. Supported formats: terraform, cli, bicep, arm, powershell."}

# Network too small for the requested subnet count
$ curl "https://ipcalc.example.com/api/aws?cidr=10.0.0.0/30&subnets=100&format=terraform"
{"detail":"Cannot divide /30 into 100 subnets. ..."}

# Spoke CIDR count exceeds maximum
$ curl "https://ipcalc.example.com/api/gcp?cidr=10.0.0.0/8&subnets=2&format=terraform&spoke-cidrs=10.1.0.0/16,10.2.0.0/16,...(11 entries)"
{"detail":"Too many spoke networks: 11 provided, maximum is 10."}

# Mismatched spoke-subnets count
$ curl "https://ipcalc.example.com/api/azure?...&spoke-cidrs=10.1.0.0/16,10.2.0.0/16&spoke-subnets=2"
{"detail":"'spoke-subnets' has 1 value(s) but 'spoke-cidrs' has 2. Counts must match."}
```

### HTTP 422 — Missing or wrong-type parameter

Returned when a required parameter is absent or has the wrong type (e.g. a string where an integer is expected).

```bash
# Missing required parameter
$ curl "https://ipcalc.example.com/api/aws?subnets=4&format=terraform"
{"detail":"cidr: Field required"}

# subnets out of range
$ curl "https://ipcalc.example.com/api/aws?cidr=10.0.0.0/16&subnets=0&format=terraform"
{"detail":"subnets: Input should be greater than or equal to 1"}

# prefix out of range
$ curl "https://ipcalc.example.com/api/aws?cidr=10.0.0.0/16&subnets=4&format=terraform&prefix=33"
{"detail":"prefix: Input should be less than or equal to 32"}
```

### HTTP 500 — Server error

Returned only when an unexpected internal error occurs. The response does not include stack traces or internal details.

```json
{"detail": "An unexpected error occurred. Please verify your input and try again."}
```

---

## Security

### Input validation

Every string input is validated before any processing occurs:

- **CIDR values** are parsed and normalized by Python's `ipaddress.ip_network()`. This rejects anything that is not a valid IPv4 CIDR (including IPv6, hostnames, and strings containing shell metacharacters). The normalized form — which can only contain digits, dots, and a slash — is what gets embedded in generated files.
- **Format** is checked against a strict allowlist before template selection.
- **`prefix`** is constrained to the integer range 1–32 by the query parameter definition.
- **`subnets`** is constrained to 1–256.
- **`spoke-cidrs`** is limited to a maximum of 10 entries, each independently validated as a CIDR.
- **`spoke-subnets`** values must each be in the range 1–256.
- All string parameters have a maximum length enforced at the HTTP layer.

### Response headers

Every response includes the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents framing of API responses |
| `Cache-Control` | `no-store` | Prevents caching of generated IaC files |

---

## Web UI URL parameters

The same parameters work in the browser to pre-populate the form and auto-open the output dialog — useful for sharing a pre-configured link.

```
https://ipcalc.example.com/?provider=azure&cidr=10.0.0.0/16&subnets=4&format=terraform
```

| Parameter | Description |
|-----------|-------------|
| `provider` | Tab to activate: `azure`, `aws`, `gcp`, `oracle`, `alicloud`, `on-premises` |
| `cidr` | Pre-fill the CIDR field |
| `subnets` | Pre-fill the subnet count |
| `format` | Auto-open this output format's dialog |
| `prefix` | Pre-fill the desired subnet prefix |
| `spoke-cidrs` | Pre-fill spoke CIDRs (enables hub-spoke mode) |
| `spoke-subnets` | Pre-fill spoke subnet counts |

---

## Architecture

The API reuses the existing Python skill code without moving any files:

```
api/main.py
    └── imports from skills/ipcalc-for-cloud/scripts/
            ├── ipcalc.py            (subnet calculation)
            ├── template_processor.py (IaC template rendering)
            └── cloud_provider_config.py (provider config)
    └── reads templates from skills/ipcalc-for-cloud/templates/{azure,aws,gcp}/
```

nginx routes `/api/` requests to the FastAPI server (port 8000) and serves all other traffic as the static Vue SPA.

## Deployment

After deploying the static site, start the API server on the production host:

```bash
cd api
uv sync
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

Run it as a systemd service or with a process manager to keep it alive across reboots.

A Docker image is also available from the GitHub Container Registry:

```bash
docker pull ghcr.io/jvhoof/ipcalc-api:latest
docker run -p 8000:8000 ghcr.io/jvhoof/ipcalc-api:latest
```
