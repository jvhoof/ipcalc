# IPCalc Diagram API

A Python REST API that generates network diagrams based on IP subnet calculations. Uses the [diagrams](https://diagrams.mingrammer.com/) library to create visual representations of cloud network architectures.

## Features

- **Same calculations as CLI**: Supports Azure, AWS, GCP, Oracle, Alibaba Cloud, and On-Premises networks
- **Multiple output formats**: PNG, SVG, PDF, DOT, and draw.io
- **Provider-specific diagrams**: Each cloud provider gets appropriate icons and layout
- **REST API**: Easy to integrate with other tools and workflows

## Requirements

- Python 3.9+
- Graphviz (for rendering diagrams)

### Installing Graphviz

```bash
# macOS
brew install graphviz

# Ubuntu/Debian
apt-get install graphviz

# Windows (Chocolatey)
choco install graphviz

# CentOS/RHEL
yum install graphviz
```

## Installation

```bash
cd api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Running the API

```bash
# Development mode
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at `http://localhost:8000`

- API documentation: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## API Endpoints

### GET /providers
List all supported cloud providers and their configurations.

### GET /providers/{provider}
Get configuration for a specific provider.

### GET /calculate
Calculate network subnets without generating a diagram.

**Parameters:**
- `provider` (required): Cloud provider (azure, aws, gcp, oracle, alicloud, onpremises)
- `cidr` (required): VPC/VNet CIDR (e.g., 10.0.0.0/16)
- `subnets` (required): Number of subnets (1-256)
- `prefix` (optional): Custom subnet prefix length

### POST /diagram
Generate a network diagram and return as base64-encoded data.

**Request Body:**
```json
{
  "provider": "azure",
  "cidr": "10.0.0.0/16",
  "subnets": 4,
  "prefix": null,
  "output_format": "png"
}
```

### GET /diagram/download
Generate and download a network diagram directly as a file.

**Parameters:**
- `provider` (required): Cloud provider
- `cidr` (required): VPC/VNet CIDR
- `subnets` (required): Number of subnets
- `prefix` (optional): Custom subnet prefix
- `format` (optional): Output format (png, svg, pdf, dot, drawio)

## Examples

### List Providers

```bash
curl http://localhost:8000/providers
```

### Calculate Network

```bash
curl "http://localhost:8000/calculate?provider=aws&cidr=10.0.0.0/16&subnets=4"
```

### Generate PNG Diagram

```bash
curl "http://localhost:8000/diagram/download?provider=azure&cidr=10.0.0.0/16&subnets=3&format=png" \
  -o azure_network.png
```

### Generate SVG Diagram

```bash
curl "http://localhost:8000/diagram/download?provider=gcp&cidr=192.168.0.0/20&subnets=4&format=svg" \
  -o gcp_network.svg
```

### Generate draw.io Diagram

```bash
curl "http://localhost:8000/diagram/download?provider=aws&cidr=10.0.0.0/16&subnets=6&format=drawio" \
  -o aws_network.drawio
```

### Get Diagram as Base64 (POST)

```bash
curl -X POST http://localhost:8000/diagram \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "oracle",
    "cidr": "10.0.0.0/16",
    "subnets": 3,
    "output_format": "svg"
  }'
```

### Python Client Example

```python
import requests
import base64

# Generate diagram
response = requests.post(
    "http://localhost:8000/diagram",
    json={
        "provider": "azure",
        "cidr": "10.0.0.0/16",
        "subnets": 4,
        "output_format": "png"
    }
)

data = response.json()

# Save diagram
diagram_bytes = base64.b64decode(data["diagram_base64"])
with open("network.png", "wb") as f:
    f.write(diagram_bytes)

# Print calculation details
print(f"VPC CIDR: {data['calculation']['vpc_cidr']}")
print(f"Total IPs: {data['calculation']['vpc_total_ips']}")
for subnet in data["calculation"]["subnets"]:
    print(f"  {subnet['name']}: {subnet['cidr']} ({subnet['usable_ips']} usable)")
```

## Supported Providers

| Provider | Reserved IPs | Min Subnet | Max CIDR | Description |
|----------|-------------|------------|----------|-------------|
| Azure | 5 | /29 | /8 | Azure VNet |
| AWS | 5 | /28 | /16 | AWS VPC |
| GCP | 4 | /29 | /8 | Google Cloud VPC |
| Oracle | 3 | /30 | /16 | Oracle Cloud VCN |
| Alicloud | 4 | /29 | /8 | Alibaba Cloud VPC |
| On-Premises | 2 | /30 | /8 | Standard network |

## Output Formats

- **PNG**: Raster image format (default)
- **SVG**: Scalable vector graphics
- **PDF**: PDF document
- **DOT**: Graphviz DOT source
- **draw.io**: draw.io/diagrams.net compatible XML

## Docker

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y graphviz && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ src/

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t ipcalc-api .
docker run -p 8000:8000 ipcalc-api
```

## License

MIT License
