# IP Calculator

A comprehensive IP subnet calculator and Infrastructure-as-Code (IaC) generator with both web interface and command-line interface (CLI) support for multiple cloud providers.

## Features

### Web Interface
- **Multi-Cloud Support**: Azure, AWS, GCP, Oracle Cloud, Alibaba Cloud, and On-Premises
- **Visual IP Calculation**: Real-time subnet calculations with detailed network information
- **IaC Code Generation**: Generate ready-to-use Infrastructure-as-Code templates
  - **Azure**: CLI, Terraform, Bicep, ARM, PowerShell
  - **AWS**: CLI, Terraform, CloudFormation
  - **GCP**: gcloud CLI, Terraform
  - **Oracle**: OCI CLI, Terraform
  - **Alibaba Cloud**: Aliyun CLI, Terraform
- **Binary View**: Display IP addresses in binary format (collapsible)
- **Responsive UI**: Modern, clean interface built with Vue.js and Vuetify
- **Cloud-Specific Calculations**: Respects reserved IPs and subnet size limits for each cloud provider

### Command-Line Interface (CLI)
- **Automated Testing**: Generate IaC code for CI/CD pipelines
- **Batch Processing**: Create infrastructure code for multiple environments
- **File Output**: Save generated code directly to files
- **Scriptable**: Perfect for automation and testing workflows

## Technology Stack

- **Vue.js 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **Vuetify** - Material Design component framework
- **NGINX** - Production web server
- **tsx** - TypeScript execution engine for CLI

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- NGINX (for production deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ipcalc
```

2. Install dependencies:
```bash
npm install
```

## Web Interface Usage

### Development

1. Start the development server:
```bash
npm run dev
```

2. Open your browser at `http://localhost:5173` (or the port shown in terminal)

### Production Build

Build the application for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Using the Web Interface

1. **Select Cloud Provider**: Choose from Azure, AWS, GCP, Oracle, Alibaba Cloud, or On-Premises
2. **Enter Network CIDR**: Input your network address (e.g., `10.0.0.0/16`)
3. **Set Number of Subnets**: Specify how many subnets to create (1-256)
4. **View Results**: See detailed subnet information including:
   - Network addresses
   - Subnet masks
   - Total and usable IP counts
   - Reserved IPs
   - Usable IP ranges
   - Availability zones/regions
5. **Generate Code**: Click on CLI, Terraform, or other format buttons to generate IaC code
6. **Copy Code**: Use the copy button to copy generated code to clipboard

## CLI Usage

### Using the Bash Wrapper (Recommended)

For easier CLI access, use the included bash wrapper script that automatically checks for dependencies:

```bash
# Make the wrapper executable (one-time setup)
chmod +x ./ipcalc

# Run the CLI
./ipcalc --help
./ipcalc --provider azure --cidr 10.0.0.0/16 --subnets 4
```

The wrapper script will:
- ✓ Check if Node.js is installed (minimum version 16.0.0)
- ✓ Verify npm and npx are available
- ✓ Ensure dependencies are installed in `node_modules`
- ✓ Validate source files exist
- ✓ Provide helpful error messages with installation instructions if any checks fail

### Alternative: Using npm Scripts

You can also run the CLI through npm:

```bash
npm run cli -- --help
```

### Basic Commands

#### Show Network Information

Display detailed subnet calculations:

```bash
# Using the bash wrapper
./ipcalc --provider azure --cidr 10.0.0.0/16 --subnets 4
./ipcalc --provider aws --cidr 10.0.0.0/16 --subnets 3
./ipcalc --provider gcp --cidr 10.128.0.0/20 --subnets 2

# Or using npm scripts
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 4
npm run cli -- --provider aws --cidr 10.0.0.0/16 --subnets 3
npm run cli -- --provider gcp --cidr 10.128.0.0/20 --subnets 2
```

#### Generate Terraform Code

```bash
# Using the bash wrapper
./ipcalc --provider azure --cidr 10.0.0.0/16 --subnets 2 --output terraform
./ipcalc --provider aws --cidr 10.0.0.0/16 --subnets 3 --output terraform
./ipcalc --provider gcp --cidr 10.128.0.0/20 --subnets 2 --output terraform

# Or using npm scripts
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 2 --output terraform
npm run cli -- --provider aws --cidr 10.0.0.0/16 --subnets 3 --output terraform
npm run cli -- --provider gcp --cidr 10.128.0.0/20 --subnets 2 --output terraform
```

#### Generate Cloud CLI Scripts

```bash
# Azure CLI script
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 2 --output cli --file azure-deploy.sh

# AWS CLI script
npm run cli -- --provider aws --cidr 10.0.0.0/16 --subnets 3 --output cli --file aws-deploy.sh

# GCP gcloud script
npm run cli -- --provider gcp --cidr 10.128.0.0/20 --subnets 2 --output gcloud --file gcp-deploy.sh

# Oracle OCI CLI script
npm run cli -- --provider oracle --cidr 10.0.0.0/20 --subnets 4 --output oci --file oracle-deploy.sh

# AliCloud Aliyun CLI script
npm run cli -- --provider alicloud --cidr 172.16.0.0/12 --subnets 3 --output aliyun --file alicloud-deploy.sh
```

#### Generate Other IaC Formats

```bash
# Azure Bicep
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 2 --output bicep --file main.bicep

# Azure ARM Template
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 2 --output arm --file template.json

# Azure PowerShell
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 2 --output powershell --file deploy.ps1

# AWS CloudFormation
npm run cli -- --provider aws --cidr 10.0.0.0/16 --subnets 3 --output cloudformation --file stack.yaml
```

### CLI Arguments

#### Required
- `--provider <name>` - Cloud provider: `azure`, `aws`, `gcp`, `oracle`, `alicloud`, `onpremises`
- `--cidr <cidr>` - Network CIDR notation (e.g., `10.0.0.0/16`)
- `--subnets <count>` - Number of subnets to create (1-256)

#### Optional
- `--output <type>` - Output format (default: `info`)
- `--file <path>` - Write output to file instead of stdout
- `--help` - Show help message

### CLI Use Cases

#### 1. Testing and Validation
Generate IaC code and validate before deployment:
```bash
npm run cli -- --provider aws --cidr 10.0.0.0/16 --subnets 3 --output terraform --file test.tf
terraform validate test.tf
```

#### 2. CI/CD Pipeline Integration
```bash
#!/bin/bash
# Generate infrastructure for different environments
for env in dev staging prod; do
  npm run cli -- \
    --provider aws \
    --cidr 10.${env}.0.0/16 \
    --subnets 3 \
    --output terraform \
    --file ${env}-infrastructure.tf
done
```

#### 3. Documentation Generation
```bash
# Generate network documentation for all providers
npm run cli -- --provider azure --cidr 10.0.0.0/16 --subnets 4 > docs/azure-network.txt
npm run cli -- --provider aws --cidr 10.0.0.0/16 --subnets 3 > docs/aws-network.txt
```

#### 4. Multi-Cloud Comparison
```bash
# Compare subnet allocations across different cloud providers
for provider in azure aws gcp oracle alicloud; do
  echo "=== $provider ===" >> comparison.txt
  npm run cli -- --provider $provider --cidr 10.0.0.0/16 --subnets 4 >> comparison.txt
done
```

For more detailed CLI documentation, see [CLI.md](CLI.md).

## Azure VNET Peering (Hub-Spoke Topology)

The Azure calculator supports VNET peering for hub-spoke network topologies.

### Web Interface

In the web interface, enable VNET peering using the "VNET Peering (Hub-Spoke Topology)" expansion panel:

1. **Enable Peering**: Toggle the switch to enable VNET peering
2. **Configure Spoke VNETs**: Set the number of spoke VNETs (1-10)
3. **Configure Each Spoke**:
   - Set the CIDR block for each spoke VNET
   - Define the number of subnets per spoke
4. **Generate Code**: All output formats (CLI, Terraform, Bicep, ARM, PowerShell) will include:
   - Spoke VNET creation
   - Spoke subnet configuration
   - Bi-directional peering connections (hub-to-spoke and spoke-to-hub)

### CLI Usage

Use the `--spoke-cidrs` and `--spoke-subnets` options to configure VNET peering:

```bash
# Basic hub-spoke with 3 spoke VNETs
npm run cli -- \
  --provider azure \
  --cidr 10.0.0.0/16 \
  --subnets 2 \
  --spoke-cidrs "10.1.0.0/16,10.2.0.0/16,10.3.0.0/16" \
  --spoke-subnets "2,2,2" \
  --output cli

# Generate Terraform with peering
npm run cli -- \
  --provider azure \
  --cidr 10.0.0.0/16 \
  --subnets 2 \
  --spoke-cidrs "10.1.0.0/16,10.2.0.0/16,10.3.0.0/16" \
  --output terraform \
  --file infrastructure-with-peering.tf

# Spoke subnets default to 2 if not specified
npm run cli -- \
  --provider azure \
  --cidr 10.0.0.0/16 \
  --subnets 2 \
  --spoke-cidrs "10.1.0.0/16,10.2.0.0/16" \
  --output bicep
```

### Hub-Spoke Topology Features

- **Bi-directional Traffic**: Each peering connection allows traffic in both directions
- **No Transitive Routing**: Spokes cannot communicate directly with each other (only through hub)
- **Gateway Transit Support**: Templates include gateway transit settings (disabled by default)
- **Non-overlapping CIDRs**: Spoke VNETs should use non-overlapping CIDR blocks
- **Scalability**: Support for up to 10 spoke VNETs per hub

### Generated Resources

When VNET peering is enabled, the generated code creates:

1. **Hub VNET**: The main virtual network with configured subnets
2. **Spoke VNETs**: Additional virtual networks, each with their own subnets
3. **Peering Connections**:
   - `hub-to-spoke1`, `hub-to-spoke2`, etc. (hub to each spoke)
   - `spoke1-to-hub`, `spoke2-to-hub`, etc. (each spoke to hub)

### Use Cases

- **Shared Services**: Central hub for shared resources (DNS, VPN gateway, firewalls)
- **Environment Isolation**: Separate spoke VNETs for dev, staging, and production
- **Application Segmentation**: Different spokes for different applications or business units
- **Cost Optimization**: Centralize networking resources in the hub VNET

## Cloud Provider Details

### Azure
- **Reserved IPs**: 5 per subnet (first 4 + last 1)
- **Minimum Subnet**: /29 (8 IPs, 3 usable)
- **VNet CIDR Range**: /8 to /29
- **Outputs**: CLI, Terraform, Bicep, ARM, PowerShell
- **VNET Peering**: Hub-spoke topology with up to 10 spoke VNETs

### AWS
- **Reserved IPs**: 5 per subnet (first 4 + last 1)
- **Minimum Subnet**: /28 (16 IPs, 11 usable)
- **VPC CIDR Range**: /16 to /28
- **Availability Zones**: Subnets distributed across AZs
- **Outputs**: CLI, Terraform, CloudFormation

### Google Cloud Platform (GCP)
- **Reserved IPs**: 4 per subnet (first 2 + last 2)
- **Minimum Subnet**: /29 (8 IPs, 4 usable)
- **VPC**: Global (subnets are regional)
- **Outputs**: gcloud CLI, Terraform

### Oracle Cloud
- **Reserved IPs**: 3 per subnet (first 2 + last 1)
- **Minimum Subnet**: /30 (4 IPs, 1 usable)
- **VCN CIDR Range**: /16 to /30
- **Outputs**: OCI CLI, Terraform

### Alibaba Cloud
- **Reserved IPs**: 6 per subnet (first 3 + last 3)
- **Minimum Subnet**: /29 (8 IPs, 2 usable)
- **VPC CIDR Range**: /8 to /29
- **Outputs**: Aliyun CLI, Terraform

### On-Premises
- **Reserved IPs**: 2 (network address + broadcast)
- **Standard IP Calculations**: Classic subnet calculations
- **Outputs**: Network information only

## Deployment

### Local NGINX Deployment

1. Build the application:
```bash
npm run build
```

2. Copy the built files to your NGINX web root:
```bash
sudo cp -r dist/* /usr/share/nginx/html/
```

3. Copy the NGINX configuration:
```bash
sudo cp nginx.conf /etc/nginx/conf.d/ipcalc.conf
```

4. Restart NGINX:
```bash
sudo systemctl restart nginx
```

5. Access the application at `http://localhost`

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t ipcalc .
docker run -p 80:80 ipcalc
```

## Project Structure

```
ipcalc/
├── src/
│   ├── cli/
│   │   ├── index.ts              # CLI entry point
│   │   ├── ipCalculator.ts       # Core IP calculation logic
│   │   └── templateLoaderNode.ts # Node.js template loader
│   ├── components/
│   │   ├── AzureCalculator.vue   # Azure calculator component
│   │   ├── AwsCalculator.vue     # AWS calculator component
│   │   ├── GcpCalculator.vue     # GCP calculator component
│   │   ├── OracleCalculator.vue  # Oracle calculator component
│   │   ├── AliCloudCalculator.vue # AliCloud calculator component
│   │   └── OnPremisesCalculator.vue # On-Premises calculator
│   ├── config/
│   │   ├── cloudProviderConfig.ts # Cloud provider configurations
│   │   └── cloudThemes.ts        # UI themes for each provider
│   ├── templates/
│   │   ├── azure/                # Azure IaC templates
│   │   ├── aws/                  # AWS IaC templates
│   │   ├── gcp/                  # GCP IaC templates
│   │   ├── oracle/               # Oracle IaC templates
│   │   └── alicloud/             # AliCloud IaC templates
│   ├── utils/
│   │   └── templateLoader.ts     # Template loader for web UI
│   ├── App.vue                   # Main application component
│   └── main.ts                   # Application entry point
├── bin/
│   └── ipcalc.js                 # CLI executable wrapper
├── dist/                         # Production build output
├── index.html                    # HTML entry point
├── nginx.conf                    # NGINX configuration
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
├── README.md                     # This file
└── CLI.md                        # Detailed CLI documentation
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run typecheck` - Run TypeScript type checking
- `npm run cli` - Run CLI tool (add `-- --help` for CLI help)

## Development

### Adding a New Cloud Provider

1. Add configuration to `src/config/cloudProviderConfig.ts`
2. Add theme to `src/config/cloudThemes.ts`
3. Create Vue component in `src/components/`
4. Create template directory in `src/templates/`
5. Add template loader functions to `src/utils/templateLoader.ts` (for web UI)
6. Add template loader functions to `src/cli/templateLoaderNode.ts` (for CLI)
7. Update CLI in `src/cli/index.ts` to support the new provider

### Running Tests

```bash
# Test CLI with all providers
for provider in azure aws gcp oracle alicloud; do
  npm run cli -- --provider $provider --cidr 10.0.0.0/16 --subnets 2
done
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For detailed CLI documentation, see [CLI.md](CLI.md).

For issues and feature requests, please open an issue on GitHub.
