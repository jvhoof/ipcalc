#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { calculateSubnets, parseCIDR } from '../cli/ipCalculator.js';
import { getCloudProviderConfig } from '../config/cloudProviderConfig.js';
import {
  type TemplateData,
  loadAzureCLITemplate,
  loadAzureTerraformTemplate,
  loadAzureBicepTemplate,
  loadAzureARMTemplate,
  loadAzurePowerShellTemplate,
  loadAWSCLITemplate,
  loadAWSTerraformTemplate,
  loadAWSCloudFormationTemplate,
  loadGCPGcloudTemplate,
  loadGCPTerraformTemplate,
  loadOracleOCITemplate,
  loadOracleTerraformTemplate,
  loadAliCloudAliyunTemplate,
  loadAliCloudTerraformTemplate,
} from '../cli/templateLoaderNode.js';

/**
 * MCP Server for IP Calculator
 * Provides tools for calculating IP subnets and generating Infrastructure-as-Code templates
 * for various cloud providers (Azure, AWS, GCP, Oracle, Alibaba Cloud, On-Premises)
 */

const SUPPORTED_PROVIDERS = ['azure', 'aws', 'gcp', 'oracle', 'alicloud', 'onpremises'] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

const PROVIDER_TEMPLATES: Record<Provider, string[]> = {
  azure: ['cli', 'terraform', 'bicep', 'arm', 'powershell'],
  aws: ['cli', 'terraform', 'cloudformation'],
  gcp: ['gcloud', 'terraform'],
  oracle: ['oci', 'terraform'],
  alicloud: ['aliyun', 'terraform'],
  onpremises: []
};

interface SubnetInfo {
  network: string;
  cidr: string;
  mask: string;
  totalIPs: number;
  usableIPs: number;
  reserved: string[];
  usableRange: string;
  availabilityZone?: string;
  region?: string;
  availabilityDomain?: string;
  zone?: string;
}

const server = new Server(
  {
    name: 'ipcalc-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'calculate_subnets',
        description: 'Calculate subnet breakdown for a given CIDR block and cloud provider. Returns detailed subnet information including network addresses, usable IPs, reserved IPs, and cloud-specific details like availability zones.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              description: 'Cloud provider (azure, aws, gcp, oracle, alicloud, onpremises)',
              enum: SUPPORTED_PROVIDERS,
            },
            cidr: {
              type: 'string',
              description: 'CIDR notation (e.g., "10.0.0.0/16")',
            },
            numberOfSubnets: {
              type: 'number',
              description: 'Number of subnets to create',
              minimum: 1,
            },
            subnetPrefix: {
              type: 'number',
              description: 'Desired subnet prefix length (optional, e.g., 24 for /24 subnets)',
              minimum: 8,
              maximum: 30,
            },
          },
          required: ['provider', 'cidr', 'numberOfSubnets'],
        },
      },
      {
        name: 'generate_iac_template',
        description: 'Generate Infrastructure-as-Code template for creating VPC/VNet and subnets. Supports multiple formats like Terraform, CloudFormation, Bicep, ARM templates, and CLI scripts for various cloud providers.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              description: 'Cloud provider (azure, aws, gcp, oracle, alicloud)',
              enum: SUPPORTED_PROVIDERS.filter(p => p !== 'onpremises'),
            },
            format: {
              type: 'string',
              description: 'Template format (provider-specific: terraform, cli, cloudformation, bicep, arm, powershell, gcloud, oci, aliyun)',
            },
            cidr: {
              type: 'string',
              description: 'CIDR notation for the VPC/VNet (e.g., "10.0.0.0/16")',
            },
            subnets: {
              type: 'array',
              description: 'Array of subnet information from calculate_subnets tool',
              items: {
                type: 'object',
                properties: {
                  network: { type: 'string' },
                  cidr: { type: 'string' },
                  mask: { type: 'string' },
                  totalIPs: { type: 'number' },
                  usableIPs: { type: 'number' },
                  reserved: { type: 'array', items: { type: 'string' } },
                  usableRange: { type: 'string' },
                  availabilityZone: { type: 'string' },
                  region: { type: 'string' },
                  availabilityDomain: { type: 'string' },
                  zone: { type: 'string' },
                },
              },
            },
          },
          required: ['provider', 'format', 'cidr', 'subnets'],
        },
      },
      {
        name: 'list_cloud_providers',
        description: 'List all supported cloud providers with their configurations, including CIDR limits, reserved IP counts, and default availability zones.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'cloud-providers://list',
        name: 'Cloud Providers',
        description: 'List of all supported cloud providers and their configurations',
        mimeType: 'application/json',
      },
      ...SUPPORTED_PROVIDERS.map(provider => ({
        uri: `cloud-providers://${provider}`,
        name: `${provider.toUpperCase()} Configuration`,
        description: `Configuration details for ${provider}`,
        mimeType: 'application/json',
      })),
    ],
  };
});

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === 'cloud-providers://list') {
    const providers = SUPPORTED_PROVIDERS.map(provider => {
      const config = getCloudProviderConfig(provider);
      return {
        name: provider,
        config,
        supportedFormats: PROVIDER_TEMPLATES[provider],
      };
    });

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(providers, null, 2),
        },
      ],
    };
  }

  const match = uri.match(/^cloud-providers:\/\/(\w+)$/);
  if (match) {
    const provider = match[1] as Provider;
    if (SUPPORTED_PROVIDERS.includes(provider)) {
      const config = getCloudProviderConfig(provider);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              provider,
              config,
              supportedFormats: PROVIDER_TEMPLATES[provider],
            }, null, 2),
          },
        ],
      };
    }
  }

  throw new McpError(
    ErrorCode.InvalidRequest,
    `Unknown resource: ${uri}`
  );
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'calculate_subnets') {
      const { provider, cidr, numberOfSubnets, subnetPrefix } = args as {
        provider: Provider;
        cidr: string;
        numberOfSubnets: number;
        subnetPrefix?: number;
      };

      if (!SUPPORTED_PROVIDERS.includes(provider)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`
        );
      }

      const config = getCloudProviderConfig(provider);

      // Validate CIDR
      try {
        parseCIDR(cidr, config.minCidrPrefix, config.maxCidrPrefix);
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid CIDR: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      const subnets = calculateSubnets(cidr, numberOfSubnets, config, subnetPrefix);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              provider,
              cidr,
              numberOfSubnets,
              subnetPrefix,
              config: {
                reservedIpCount: config.reservedIpCount,
                minCidrPrefix: config.minCidrPrefix,
                maxCidrPrefix: config.maxCidrPrefix,
              },
              subnets,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'generate_iac_template') {
      const { provider, format, cidr, subnets } = args as {
        provider: Provider;
        format: string;
        cidr: string;
        subnets: SubnetInfo[];
      };

      if (!SUPPORTED_PROVIDERS.includes(provider) || provider === 'onpremises') {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unsupported provider for template generation: ${provider}`
        );
      }

      const supportedFormats = PROVIDER_TEMPLATES[provider];
      if (!supportedFormats.includes(format)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unsupported format '${format}' for provider '${provider}'. Supported: ${supportedFormats.join(', ')}`
        );
      }

      const templateData: TemplateData = {
        vnetCidr: cidr,
        subnets,
      };

      let template: string;

      // Map provider and format to the appropriate template loader
      if (provider === 'azure') {
        if (format === 'cli') template = loadAzureCLITemplate(templateData);
        else if (format === 'terraform') template = loadAzureTerraformTemplate(templateData);
        else if (format === 'bicep') template = loadAzureBicepTemplate(templateData);
        else if (format === 'arm') template = loadAzureARMTemplate(templateData);
        else if (format === 'powershell') template = loadAzurePowerShellTemplate(templateData);
        else throw new McpError(ErrorCode.InvalidParams, `Unsupported format: ${format}`);
      } else if (provider === 'aws') {
        if (format === 'cli') template = loadAWSCLITemplate(templateData);
        else if (format === 'terraform') template = loadAWSTerraformTemplate(templateData);
        else if (format === 'cloudformation') template = loadAWSCloudFormationTemplate(templateData);
        else throw new McpError(ErrorCode.InvalidParams, `Unsupported format: ${format}`);
      } else if (provider === 'gcp') {
        if (format === 'gcloud') template = loadGCPGcloudTemplate(templateData);
        else if (format === 'terraform') template = loadGCPTerraformTemplate(templateData);
        else throw new McpError(ErrorCode.InvalidParams, `Unsupported format: ${format}`);
      } else if (provider === 'oracle') {
        if (format === 'oci') template = loadOracleOCITemplate(templateData);
        else if (format === 'terraform') template = loadOracleTerraformTemplate(templateData);
        else throw new McpError(ErrorCode.InvalidParams, `Unsupported format: ${format}`);
      } else if (provider === 'alicloud') {
        if (format === 'aliyun') template = loadAliCloudAliyunTemplate(templateData);
        else if (format === 'terraform') template = loadAliCloudTerraformTemplate(templateData);
        else throw new McpError(ErrorCode.InvalidParams, `Unsupported format: ${format}`);
      } else {
        throw new McpError(ErrorCode.InvalidParams, `Unsupported provider: ${provider}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: template,
          },
        ],
      };
    }

    if (name === 'list_cloud_providers') {
      const providers = SUPPORTED_PROVIDERS.map(provider => {
        const config = getCloudProviderConfig(provider);
        return {
          name: provider,
          config,
          supportedFormats: PROVIDER_TEMPLATES[provider],
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(providers, null, 2),
          },
        ],
      };
    }

    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${name}`
    );
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error('IP Calculator MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
