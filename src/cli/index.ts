#!/usr/bin/env node

/**
 * IP Calculator CLI
 * Command-line interface for IP subnet calculations and IaC code generation
 */

import { writeFileSync } from 'fs'
import { getCloudProviderConfig } from '../config/cloudProviderConfig'
import { calculateNetwork, calculateSubnets, SubnetInfo } from './ipCalculator'
import {
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
  loadAliCloudTerraformTemplate
} from './templateLoaderNode'

interface SpokeVNetConfig {
  cidr: string
  subnets: number
}

interface CliArgs {
  provider: string
  cidr: string
  subnets: number
  prefix?: number
  output?: 'info' | 'cli' | 'terraform' | 'bicep' | 'arm' | 'powershell' | 'cloudformation' | 'gcloud' | 'oci' | 'aliyun'
  file?: string
  help?: boolean
  // Network Peering options (Azure and GCP)
  spokeCidrs?: string[]
  spokeSubnets?: number[]
}

const PROVIDERS = ['azure', 'aws', 'gcp', 'oracle', 'alicloud', 'onpremises']

const OUTPUTS_BY_PROVIDER: Record<string, string[]> = {
  azure: ['info', 'cli', 'terraform', 'bicep', 'arm', 'powershell'],
  aws: ['info', 'cli', 'terraform', 'cloudformation'],
  gcp: ['info', 'gcloud', 'terraform'],
  oracle: ['info', 'oci', 'terraform'],
  alicloud: ['info', 'aliyun', 'terraform'],
  onpremises: ['info']
}

function showHelp(): void {
  console.log(`
IP Calculator CLI - Network subnet calculator and IaC code generator

Usage:
  ipcalc --provider <provider> --cidr <cidr> --subnets <count> [options]

Required Arguments:
  --provider <name>     Cloud provider: ${PROVIDERS.join(', ')}
  --cidr <cidr>         Network CIDR (e.g., 10.0.0.0/16)
  --subnets <count>     Number of subnets to create (1-256)

Optional Arguments:
  --prefix <number>     Desired subnet CIDR prefix (e.g., 26 for /26)
                        When specified, subnets will use this prefix instead
                        of automatic calculation based on subnet count
  --output <type>       Output type (default: info)
                        Azure: info, cli, terraform, bicep, arm, powershell
                        AWS: info, cli, terraform, cloudformation
                        GCP: info, gcloud, terraform
                        Oracle: info, oci, terraform
                        AliCloud: info, aliyun, terraform
                        On-Premises: info
  --file <path>         Write output to file instead of stdout
  --help                Show this help message

Network Peering Options (Hub-Spoke Topology):
  --spoke-cidrs <cidrs>    Comma-separated list of spoke VPC/VNET CIDRs
                           (e.g., "10.1.0.0/16,10.2.0.0/16,10.3.0.0/16")
                           Supported for: Azure, GCP
  --spoke-subnets <counts> Comma-separated list of subnet counts per spoke
                           (e.g., "2,2,2" - must match number of spoke CIDRs)
                           If omitted, defaults to 2 subnets per spoke VPC/VNET

Examples:
  # Show network information
  ipcalc --provider azure --cidr 10.0.0.0/16 --subnets 4

  # Use custom subnet prefix to avoid filling entire network
  ipcalc --provider azure --cidr 172.16.1.0/24 --subnets 4 --prefix 26

  # Generate Terraform for AWS
  ipcalc --provider aws --cidr 10.0.0.0/16 --subnets 3 --output terraform

  # Generate Azure CLI script to file
  ipcalc --provider azure --cidr 10.0.0.0/16 --subnets 2 --output cli --file deploy.sh

  # Generate GCP gcloud commands
  ipcalc --provider gcp --cidr 10.0.0.0/20 --subnets 4 --output gcloud

  # Azure with VNET peering (hub-spoke topology)
  ipcalc --provider azure --cidr 10.0.0.0/16 --subnets 2 \\
    --spoke-cidrs "10.1.0.0/16,10.2.0.0/16,10.3.0.0/16" \\
    --spoke-subnets "2,2,2" --output terraform

  # GCP with VPC peering (hub-spoke topology)
  ipcalc --provider gcp --cidr 10.0.0.0/16 --subnets 2 \\
    --spoke-cidrs "10.1.0.0/16,10.2.0.0/16,10.3.0.0/16" \\
    --spoke-subnets "2,2,2" --output gcloud
`)
}

function parseArgs(): CliArgs | null {
  const args: CliArgs = {
    provider: '',
    cidr: '',
    subnets: 0
  }

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    const nextArg = process.argv[i + 1]

    switch (arg) {
      case '--help':
      case '-h':
        args.help = true
        break
      case '--provider':
      case '-p':
        args.provider = nextArg?.toLowerCase() || ''
        i++
        break
      case '--cidr':
      case '-c':
        args.cidr = nextArg || ''
        i++
        break
      case '--subnets':
      case '-s':
        args.subnets = parseInt(nextArg || '0', 10)
        i++
        break
      case '--prefix':
        args.prefix = parseInt(nextArg || '0', 10)
        i++
        break
      case '--output':
      case '-o':
        args.output = nextArg as any
        i++
        break
      case '--file':
      case '-f':
        args.file = nextArg
        i++
        break
      case '--spoke-cidrs':
        if (nextArg) {
          args.spokeCidrs = nextArg.split(',').map(cidr => cidr.trim())
        }
        i++
        break
      case '--spoke-subnets':
        if (nextArg) {
          args.spokeSubnets = nextArg.split(',').map(count => parseInt(count.trim(), 10))
        }
        i++
        break
    }
  }

  return args
}

function validateArgs(args: CliArgs): string | null {
  if (!args.provider || !PROVIDERS.includes(args.provider)) {
    return `Invalid provider. Must be one of: ${PROVIDERS.join(', ')}`
  }

  if (!args.cidr) {
    return 'CIDR is required'
  }

  if (!args.subnets || args.subnets < 1 || args.subnets > 256) {
    return 'Number of subnets must be between 1 and 256'
  }

  if (args.output && !OUTPUTS_BY_PROVIDER[args.provider].includes(args.output)) {
    return `Invalid output type for ${args.provider}. Must be one of: ${OUTPUTS_BY_PROVIDER[args.provider].join(', ')}`
  }

  // Validate network peering options (Azure and GCP)
  if (args.spokeCidrs || args.spokeSubnets) {
    if (args.provider !== 'azure' && args.provider !== 'gcp') {
      return 'Network peering options (--spoke-cidrs, --spoke-subnets) are only supported for Azure and GCP providers'
    }

    if (args.spokeCidrs && args.spokeCidrs.length === 0) {
      return 'At least one spoke VPC/VNET CIDR is required when using --spoke-cidrs'
    }

    if (args.spokeCidrs && args.spokeCidrs.length > 10) {
      return 'Maximum of 10 spoke VPCs/VNETs allowed'
    }

    if (args.spokeSubnets && args.spokeCidrs && args.spokeSubnets.length !== args.spokeCidrs.length) {
      return 'Number of spoke subnet counts must match number of spoke CIDRs'
    }

    if (args.spokeSubnets && args.spokeSubnets.some(count => count < 1 || count > 256)) {
      return 'Spoke subnet count must be between 1 and 256'
    }
  }

  return null
}

function formatNetworkInfo(cidr: string, subnets: SubnetInfo[], provider: string): string {
  const config = getCloudProviderConfig(provider as any)
  const network = calculateNetwork(cidr, config)

  if (!network) {
    return 'Error: Invalid network CIDR'
  }

  let output = '\n'
  output += '═══════════════════════════════════════════════════════════\n'
  output += `  Network Information - ${provider.toUpperCase()}\n`
  output += '═══════════════════════════════════════════════════════════\n\n'
  output += `  Network Address:  ${network.network}\n`
  output += `  CIDR Notation:    ${cidr}\n`
  output += `  Total IPs:        ${network.totalIPs.toLocaleString()}\n`
  output += `  Address Range:    ${network.firstIP} - ${network.lastIP}\n`
  output += `  Subnets:          ${subnets.length}\n\n`

  output += '───────────────────────────────────────────────────────────\n'
  output += '  Subnet Details\n'
  output += '───────────────────────────────────────────────────────────\n\n'

  subnets.forEach((subnet, index) => {
    output += `  Subnet ${index + 1}:\n`
    output += `    CIDR:           ${subnet.cidr}\n`
    output += `    Network:        ${subnet.network}\n`
    output += `    Mask:           ${subnet.mask}\n`
    output += `    Total IPs:      ${subnet.totalIPs}\n`
    output += `    Usable IPs:     ${subnet.usableIPs}\n`
    output += `    Usable Range:   ${subnet.usableRange}\n`

    if (provider === 'azure' || provider === 'aws') {
      output += `    AZ/Zone:        ${subnet.availabilityZone}\n`
    } else if (provider === 'gcp') {
      output += `    Region:         ${subnet.region}\n`
    } else if (provider === 'oracle') {
      output += `    AD:             ${subnet.availabilityDomain}\n`
    } else if (provider === 'alicloud') {
      output += `    Zone:           ${subnet.zone}\n`
    }

    output += `    Reserved IPs:   ${subnet.reserved.join(', ')}\n`
    output += '\n'
  })

  output += '═══════════════════════════════════════════════════════════\n\n'

  return output
}

function generateOutput(args: CliArgs, subnets: SubnetInfo[], spokeVNets: any[]): string {
  const outputType = args.output || 'info'

  // Info output
  if (outputType === 'info') {
    return formatNetworkInfo(args.cidr, subnets, args.provider)
  }

  const templateData: any = {
    vnetCidr: args.cidr,
    subnets: subnets,
    peeringEnabled: spokeVNets.length > 0
  }

  // Azure uses spokeVNets, GCP uses spokeVPCs
  if (args.provider === 'azure') {
    templateData.spokeVNets = spokeVNets
  } else if (args.provider === 'gcp') {
    templateData.spokeVPCs = spokeVNets
  }

  // Azure outputs
  if (args.provider === 'azure') {
    switch (outputType) {
      case 'cli':
        return loadAzureCLITemplate(templateData)
      case 'terraform':
        return loadAzureTerraformTemplate(templateData)
      case 'bicep':
        return loadAzureBicepTemplate(templateData)
      case 'arm':
        return loadAzureARMTemplate(templateData)
      case 'powershell':
        return loadAzurePowerShellTemplate(templateData)
    }
  }

  // AWS outputs
  if (args.provider === 'aws') {
    switch (outputType) {
      case 'cli':
        return loadAWSCLITemplate(templateData)
      case 'terraform':
        return loadAWSTerraformTemplate(templateData)
      case 'cloudformation':
        return loadAWSCloudFormationTemplate(templateData)
    }
  }

  // GCP outputs
  if (args.provider === 'gcp') {
    switch (outputType) {
      case 'gcloud':
        return loadGCPGcloudTemplate(templateData)
      case 'terraform':
        return loadGCPTerraformTemplate(templateData)
    }
  }

  // Oracle outputs
  if (args.provider === 'oracle') {
    switch (outputType) {
      case 'oci':
        return loadOracleOCITemplate(templateData)
      case 'terraform':
        return loadOracleTerraformTemplate(templateData)
    }
  }

  // AliCloud outputs
  if (args.provider === 'alicloud') {
    switch (outputType) {
      case 'aliyun':
        return loadAliCloudAliyunTemplate(templateData)
      case 'terraform':
        return loadAliCloudTerraformTemplate(templateData)
    }
  }

  return 'Error: Unsupported output type'
}

function main(): void {
  const args = parseArgs()

  if (!args || args.help) {
    showHelp()
    process.exit(0)
  }

  const validationError = validateArgs(args)
  if (validationError) {
    console.error(`Error: ${validationError}\n`)
    showHelp()
    process.exit(1)
  }

  // Get cloud provider configuration
  const config = getCloudProviderConfig(args.provider as any)

  // Calculate subnets
  const { subnets, error } = calculateSubnets(args.cidr, args.subnets, config, args.prefix)

  if (error) {
    console.error(`Error: ${error}`)
    process.exit(1)
  }

  // Calculate spoke VNETs if provided
  const spokeVNets: any[] = []
  if (args.spokeCidrs && args.spokeCidrs.length > 0) {
    const defaultSpokeSubnets = args.spokeSubnets || args.spokeCidrs.map(() => 2)

    for (let i = 0; i < args.spokeCidrs.length; i++) {
      const spokeCidr = args.spokeCidrs[i]
      const spokeSubnetCount = defaultSpokeSubnets[i] || 2

      // Calculate network info for spoke VNET
      const spokeNetwork = calculateNetwork(spokeCidr, config)
      if (!spokeNetwork) {
        console.error(`Error: Invalid spoke VNET CIDR: ${spokeCidr}`)
        process.exit(1)
      }

      // Calculate subnets for spoke VNET
      const spokeResult = calculateSubnets(spokeCidr, spokeSubnetCount, config)
      if (spokeResult.error) {
        console.error(`Error in spoke VNET ${i + 1} (${spokeCidr}): ${spokeResult.error}`)
        process.exit(1)
      }

      spokeVNets.push({
        cidr: spokeCidr,
        numberOfSubnets: spokeSubnetCount,
        vnetInfo: {
          network: spokeNetwork.network,
          totalIPs: spokeNetwork.totalIPs,
          firstIP: spokeNetwork.firstIP,
          lastIP: spokeNetwork.lastIP
        },
        subnets: spokeResult.subnets,
        error: ''
      })
    }
  }

  // Generate output
  try {
    const output = generateOutput(args, subnets, spokeVNets)

    if (args.file) {
      writeFileSync(args.file, output, 'utf-8')
      console.log(`Output written to: ${args.file}`)
    } else {
      console.log(output)
    }
  } catch (err) {
    console.error('Error generating output:', err)
    process.exit(1)
  }
}

// Run CLI
try {
  main()
} catch (err) {
  console.error('Fatal error:', err)
  process.exit(1)
}
