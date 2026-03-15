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

| Parameter | Required | Description |
|-----------|----------|-------------|
| `cidr` | Yes | Hub VNet CIDR block, e.g. `10.0.0.0/16` |
| `subnets` | Yes | Number of subnets (1–256) |
| `format` | Yes | Output format — see table below |
| `prefix` | No | Desired subnet prefix, e.g. `26` for `/26` |
| `spoke-cidrs` | No | Comma-separated spoke VNet CIDRs (hub-spoke topology) |
| `spoke-subnets` | No | Comma-separated subnet counts per spoke (defaults to `2` each) |

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

| Parameter | Required | Description |
|-----------|----------|-------------|
| `cidr` | Yes | VPC CIDR block, e.g. `10.0.0.0/16` |
| `subnets` | Yes | Number of subnets (1–256) |
| `format` | Yes | Output format — see table below |
| `prefix` | No | Desired subnet prefix, e.g. `24` for `/24` |

#### Output formats

| `format` | File | Content-Type |
|----------|------|--------------|
| `terraform` | `main.tf` | `text/plain` |
| `cli` | `deploy.sh` | `text/x-shellscript` |
| `cloudformation` | `template.yaml` | `text/plain` |

---

## Examples

### Azure: Download and apply Terraform in one command

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

### AWS: Download and apply Terraform in one command

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

### AWS: Custom subnet prefix

```bash
curl "https://ipcalc.example.com/api/aws?cidr=10.0.0.0/8&subnets=4&format=terraform&prefix=24" > main.tf
```

---

## Error responses

The server returns HTTP 400 with a JSON `detail` field on invalid input:

```bash
$ curl "https://ipcalc.example.com/api/azure?cidr=invalid&subnets=4&format=terraform"
{"detail":"Invalid CIDR notation. Use format: 10.0.0.0/16. ..."}

$ curl "https://ipcalc.example.com/api/azure?cidr=10.0.0.0/16&subnets=4&format=unknown"
{"detail":"Invalid format 'unknown'. Must be one of: terraform, cli, bicep, arm, powershell"}

$ curl "https://ipcalc.example.com/api/aws?cidr=10.0.0.0/16&subnets=4&format=unknown"
{"detail":"Invalid format 'unknown'. Must be one of: terraform, cli, cloudformation"}
```

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
    └── reads templates from skills/ipcalc-for-cloud/templates/{azure,aws}/
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
