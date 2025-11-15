# IP Calculator API

A Python-based REST API for calculating IP subnets and generating network diagrams for cloud providers.

## Features

- **Multi-cloud subnet calculations** for Azure, AWS, GCP, Oracle Cloud, Alibaba Cloud, and On-Premises networks
- **Network diagram generation** as executable Python code using the [diagrams](https://diagrams.mingrammer.com/) library
- **Cloud-aware calculations** that respect provider-specific reserved IPs and CIDR constraints
- **RESTful API** with OpenAPI/Swagger documentation
- **FastAPI framework** for high performance and automatic API documentation

## Quick Start

### Installation

1. Install Python 3.9 or higher

2. Install dependencies:
```bash
cd api
pip install -r requirements.txt
```

3. Run the API server:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

4. Access the API:
- API root: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Using Docker

Build and run with Docker:
```bash
docker build -t ipcalc-api .
docker run -p 8000:8000 ipcalc-api
```

Or use Docker Compose:
```bash
docker-compose up
```

## API Endpoints

### Calculate Subnets

**POST** `/api/calculate`

Calculate subnets for a given network configuration.

**Request:**
```json
{
  "provider": "azure",
  "cidr": "10.0.0.0/16",
  "subnets": 4,
  "prefix": 24
}
```

**Response:**
```json
{
  "provider": "azure",
  "network": {
    "network": "10.0.0.0",
    "totalIPs": 65536,
    "firstIP": "10.0.0.0",
    "lastIP": "10.0.255.255"
  },
  "subnets": [
    {
      "network": "10.0.0.0",
      "cidr": "10.0.0.0/24",
      "mask": "255.255.255.0",
      "totalIPs": 256,
      "usableIPs": 251,
      "reserved": ["10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.255"],
      "usableRange": "10.0.0.4 - 10.0.0.254"
    }
  ],
  "diagram_available": true
}
```

### List Providers

**GET** `/api/providers`

Get list of supported cloud providers.

**Response:**
```json
{
  "providers": ["azure", "aws", "gcp", "oracle", "alicloud", "onpremises"]
}
```

### Generate Diagram Code

**POST** `/api/diagram/code`

Generate Python code for network diagram visualization.

**Request:**
```json
{
  "provider": "azure",
  "cidr": "10.0.0.0/16",
  "subnets": 4,
  "prefix": 24,
  "diagram_type": "simple"
}
```

**Response:**
```json
{
  "python_code": "#!/usr/bin/env python3\n# Generated diagram code...",
  "description": "Azure Virtual Network (10.0.0.0/16) with 4 subnet(s)",
  "execution_instructions": "Save as diagram.py and run: python diagram.py",
  "provider": "azure"
}
```

## Usage Examples

### Calculate Azure Subnets

```bash
curl -X POST "http://localhost:8000/api/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "azure",
    "cidr": "10.0.0.0/16",
    "subnets": 4
  }'
```

### Generate Network Diagram

```bash
curl -X POST "http://localhost:8000/api/diagram/code" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "azure",
    "cidr": "10.0.0.0/16",
    "subnets": 4,
    "diagram_type": "detailed"
  }' | jq -r '.python_code' > network_diagram.py

# Install diagrams library and Graphviz
pip install diagrams
# For Ubuntu/Debian: sudo apt-get install graphviz
# For macOS: brew install graphviz

# Run the generated diagram code
python network_diagram.py
```

### Python Client Example

```python
import requests

# Calculate subnets
response = requests.post(
    "http://localhost:8000/api/calculate",
    json={
        "provider": "azure",
        "cidr": "10.0.0.0/16",
        "subnets": 4,
        "prefix": 24
    }
)

data = response.json()
print(f"Network: {data['network']['network']}")
print(f"Total subnets: {len(data['subnets'])}")

for subnet in data['subnets']:
    print(f"  - {subnet['cidr']}: {subnet['usableIPs']} usable IPs")

# Generate diagram code
diagram_response = requests.post(
    "http://localhost:8000/api/diagram/code",
    json={
        "provider": "azure",
        "cidr": "10.0.0.0/16",
        "subnets": 4,
        "diagram_type": "simple"
    }
)

diagram_data = diagram_response.json()

# Save and execute diagram code
with open('network_diagram.py', 'w') as f:
    f.write(diagram_data['python_code'])

print(diagram_data['description'])
print(diagram_data['execution_instructions'])
```

## Cloud Provider Configurations

Each cloud provider has specific constraints:

| Provider | Reserved IPs | Min CIDR | Max CIDR | Availability Zones |
|----------|--------------|----------|----------|--------------------|
| Azure | 5 (first 4 + last) | /29 | /8 | Configurable |
| AWS | 5 (first 4 + last) | /28 | /16 | us-east-1a-f |
| GCP | 4 (first 2 + last 2) | /29 | /8 | 6 regions |
| Oracle | 3 (first 2 + last) | /30 | /16 | AD-1, AD-2, AD-3 |
| Alibaba Cloud | 4 | /29 | /8 | cn-hangzhou-a-f |
| On-Premises | 2 (first + last) | /30 | /8 | None |

## Diagram Types

### Simple Diagram
Basic network visualization showing:
- Virtual Network/VPC
- Subnets with CIDR blocks
- Usable IP counts

### Detailed Diagram
Enhanced visualization including:
- Network Security Groups
- Route Tables
- Availability Zones (where applicable)
- Security group associations

## Development

### Project Structure

```
api/
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Container configuration
├── README.md                  # This file
├── core/
│   └── ip_calculator.py       # IP calculation logic
├── models/
│   ├── subnet.py              # Data models
│   └── requests.py            # API request/response models
├── config/
│   └── cloud_providers.py     # Provider configurations
├── diagrams/
│   ├── generator.py           # Diagram code generator
│   └── templates/
│       └── azure.py           # Azure diagram templates
├── routers/
│   ├── calculate.py           # Calculation endpoints
│   └── diagrams.py            # Diagram endpoints
└── tests/
    └── test_calculator.py     # Unit tests
```

### Running Tests

```bash
pytest tests/
```

### API Documentation

When the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## License

MIT License

## Related Projects

- [diagrams](https://diagrams.mingrammer.com/) - Diagram as Code library
- [ipcalc CLI](../src/cli/) - Command-line IP calculator
- [ipcalc Web UI](../src/components/) - Web interface
