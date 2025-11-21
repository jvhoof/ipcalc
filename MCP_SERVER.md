# IP Calculator MCP Server

This project includes a Model Context Protocol (MCP) server that exposes IP calculation and Infrastructure-as-Code template generation capabilities to AI assistants and other MCP clients.

## What is MCP?

The Model Context Protocol (MCP) is an open protocol that enables AI applications to securely access external data sources and tools. The ipcalc MCP server allows Claude and other AI assistants to perform subnet calculations and generate cloud infrastructure templates directly.

## Installation

### As a Global Tool

```bash
npm install -g ipcalc
```

Then run the MCP server:

```bash
ipcalc-mcp
```

### Local Development

```bash
npm install
npm run mcp
```

## Configuration

To use this MCP server with Claude Desktop or other MCP clients, add it to your MCP configuration file.

### Claude Desktop Configuration

Edit your Claude Desktop config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the ipcalc MCP server:

```json
{
  "mcpServers": {
    "ipcalc": {
      "command": "npx",
      "args": ["-y", "ipcalc-mcp"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "ipcalc": {
      "command": "ipcalc-mcp"
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "ipcalc": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/ipcalc"
    }
  }
}
```

## Available Tools

### 1. calculate_subnets

Calculate subnet breakdown for a given CIDR block and cloud provider.

**Parameters:**
- `provider` (required): Cloud provider - one of: `azure`, `aws`, `gcp`, `oracle`, `alicloud`, `onpremises`
- `cidr` (required): CIDR notation (e.g., "10.0.0.0/16")
- `numberOfSubnets` (required): Number of subnets to create (minimum: 1)
- `subnetPrefix` (optional): Desired subnet prefix length (e.g., 24 for /24 subnets)

**Returns:**
- Provider configuration (reserved IPs, CIDR limits)
- Array of subnet information including:
  - Network address and CIDR
  - Subnet mask
  - Total and usable IP counts
  - Reserved IP addresses
  - Usable IP range
  - Cloud-specific details (availability zones, regions, etc.)

**Example Usage:**
```json
{
  "provider": "azure",
  "cidr": "10.0.0.0/16",
  "numberOfSubnets": 4,
  "subnetPrefix": 24
}
```

### 2. generate_iac_template

Generate Infrastructure-as-Code templates for creating VPC/VNet and subnets.

**Parameters:**
- `provider` (required): Cloud provider - one of: `azure`, `aws`, `gcp`, `oracle`, `alicloud`
- `format` (required): Template format (provider-specific)
- `cidr` (required): CIDR notation for the VPC/VNet (e.g., "10.0.0.0/16")
- `subnets` (required): Array of subnet information (from calculate_subnets tool)

**Supported Formats by Provider:**

| Provider | Supported Formats |
|----------|------------------|
| Azure | `cli`, `terraform`, `bicep`, `arm`, `powershell` |
| AWS | `cli`, `terraform`, `cloudformation` |
| GCP | `gcloud`, `terraform` |
| Oracle | `oci`, `terraform` |
| Alibaba Cloud | `aliyun`, `terraform` |

**Returns:**
- Generated Infrastructure-as-Code template ready to use

**Example Usage:**
```json
{
  "provider": "azure",
  "format": "terraform",
  "cidr": "10.0.0.0/16",
  "subnets": [
    {
      "network": "10.0.0.0",
      "cidr": "10.0.0.0/24",
      "mask": "255.255.255.0",
      "totalIPs": 256,
      "usableIPs": 251,
      "reserved": ["10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.255"],
      "usableRange": "10.0.0.4 - 10.0.0.254",
      "availabilityZone": "eastus-1"
    }
  ]
}
```

### 3. list_cloud_providers

List all supported cloud providers with their configurations.

**Parameters:** None

**Returns:**
- Array of cloud provider configurations including:
  - Provider name
  - Default CIDR blocks
  - Reserved IP counts
  - CIDR prefix limits (min/max)
  - Default availability zones/regions
  - Supported template formats

## Available Resources

### cloud-providers://list

Returns a JSON list of all supported cloud providers with their full configurations.

### cloud-providers://{provider}

Returns configuration details for a specific provider (e.g., `cloud-providers://azure`).

## Cloud Provider Details

### Azure
- **Reserved IPs**: 5 (Network, Gateway, Azure DNS x2, Broadcast)
- **CIDR Range**: /8 to /29
- **Default CIDR**: 10.0.0.0/16
- **Availability Zones**: eastus-1, eastus-2, eastus-3

### AWS
- **Reserved IPs**: 5 (Network, VPC Router, DNS, Future use, Broadcast)
- **CIDR Range**: /16 to /28
- **Default CIDR**: 10.0.0.0/16
- **Availability Zones**: us-east-1a, us-east-1b, us-east-1c

### GCP
- **Reserved IPs**: 4 (Network, Gateway, Second-to-last, Broadcast)
- **CIDR Range**: /8 to /29
- **Default CIDR**: 10.0.0.0/16
- **Regions**: us-central1, us-east1, us-west1

### Oracle Cloud
- **Reserved IPs**: 3 (Network, Gateway, Broadcast)
- **CIDR Range**: /16 to /30
- **Default CIDR**: 10.0.0.0/16
- **Availability Domains**: AD-1, AD-2, AD-3

### Alibaba Cloud
- **Reserved IPs**: 4 (Network, Gateway, DNS, Broadcast)
- **CIDR Range**: /8 to /29
- **Default CIDR**: 10.0.0.0/16
- **Zones**: cn-hangzhou-a, cn-hangzhou-b, cn-hangzhou-c

### On-Premises
- **Reserved IPs**: 2 (Network, Broadcast)
- **CIDR Range**: /8 to /30
- **Default CIDR**: 192.168.0.0/16
- **Note**: No IaC template generation available for on-premises

## Example Workflows

### Workflow 1: Calculate Subnets for Azure

```
User: "Calculate 4 subnets from 10.0.0.0/16 for Azure"

Claude uses:
1. calculate_subnets tool with:
   - provider: "azure"
   - cidr: "10.0.0.0/16"
   - numberOfSubnets: 4

Result: 4 /18 subnets with Azure-specific reserved IPs
```

### Workflow 2: Generate AWS Terraform Template

```
User: "Create an AWS VPC with 3 subnets and give me the Terraform code"

Claude uses:
1. calculate_subnets to get subnet breakdown
2. generate_iac_template with:
   - provider: "aws"
   - format: "terraform"
   - cidr: "10.0.0.0/16"
   - subnets: [result from step 1]

Result: Complete Terraform code for AWS VPC with 3 subnets
```

### Workflow 3: Compare Cloud Providers

```
User: "What are the differences between Azure and AWS subnet configurations?"

Claude uses:
1. Read cloud-providers://azure resource
2. Read cloud-providers://aws resource

Result: Comparison of reserved IPs, CIDR limits, and other configurations
```

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

### Building for Production

```bash
npm run build
```

## Troubleshooting

### Server Not Starting

Make sure all dependencies are installed:
```bash
npm install
```

### Type Errors

Run type checking to identify issues:
```bash
npm run typecheck
```

### MCP Client Not Connecting

1. Verify the MCP server is properly configured in your client's config file
2. Check that the command path is correct
3. Ensure Node.js and npm are in your system PATH
4. Try running the server directly: `npm run mcp`

## Architecture

The MCP server is built on top of the existing ipcalc functionality:

```
src/mcp/server.ts              # MCP server implementation
├── Uses: src/cli/ipCalculator.ts      # Core IP calculation logic
├── Uses: src/config/cloudProviderConfig.ts  # Provider configurations
└── Uses: src/cli/templateLoaderNode.ts      # Template loading and processing

bin/mcp-server.js              # Executable wrapper
```

## Protocol Details

The server implements the Model Context Protocol over stdio transport:
- **Input**: JSON-RPC 2.0 messages on stdin
- **Output**: JSON-RPC 2.0 responses on stdout
- **Logging**: Debug logs to stderr

## License

Same as ipcalc main project.

## Contributing

Contributions welcome! Please open an issue or pull request on the GitHub repository.

## Links

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop MCP Configuration](https://modelcontextprotocol.io/quickstart/user)
