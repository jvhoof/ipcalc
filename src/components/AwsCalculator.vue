<template>
  <v-card>
    <v-card-text>
      <!-- VPC Configuration -->
      <v-row>
        <v-col cols="12" md="8">
          <v-text-field
            v-model="vpcCidr"
            label="VPC CIDR Block"
            placeholder="10.0.0.0/16"
            variant="outlined"
            @input="calculateVPC"
            density="comfortable"
            hint="Enter your AWS VPC address space"
            persistent-hint
          >
            <template v-slot:append>
              <v-btn
                icon="mdi-chevron-left"
                size="small"
                variant="text"
                @click="decrementVPCCIDR"
              ></v-btn>
              <v-btn
                icon="mdi-chevron-right"
                size="small"
                variant="text"
                @click="incrementVPCCIDR"
              ></v-btn>
            </template>
          </v-text-field>
        </v-col>

        <v-col cols="12" md="4">
          <v-text-field
            v-model.number="numberOfSubnets"
            label="Number of Subnets"
            type="number"
            min="1"
            max="256"
            variant="outlined"
            @input="calculateVPC"
            density="comfortable"
          ></v-text-field>
        </v-col>
      </v-row>

      <!-- VPC Summary -->
      <v-card v-if="vpcInfo" class="mt-4" variant="outlined">
        <v-card-title class="text-h6" :style="themeStyles.vpcInfoHeader">VPC Information</v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>VPC Address Space</v-list-item-title>
              <v-list-item-subtitle>{{ vpcInfo.network }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>CIDR Notation</v-list-item-title>
              <v-list-item-subtitle>{{ vpcCidr }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Total IP Addresses</v-list-item-title>
              <v-list-item-subtitle>{{ vpcInfo.totalIPs.toLocaleString() }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Address Range</v-list-item-title>
              <v-list-item-subtitle>{{ vpcInfo.firstIP }} - {{ vpcInfo.lastIP }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Action Buttons -->
      <div v-if="vpcInfo" class="mt-4">
        <div class="d-flex ga-2">
          <v-btn
            variant="elevated"
            @click="generateAWSCLI"
            prepend-icon="mdi-console"
            stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">AWS CLI</div>
          </v-btn>
          <v-btn
            variant="elevated"
            @click="generateTerraform"
            prepend-icon="mdi-code-braces"
            stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">Terraform</div>
          </v-btn>
          <v-btn
            variant="elevated"
            @click="generateCloudFormation"
            prepend-icon="mdi-file-cloud"
            stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">CloudFormation</div>
          </v-btn>
        </div>
      </div>

      <!-- Generated Code Dialog -->
      <v-dialog v-model="showCodeDialog" max-width="900" max-height="90vh">
        <v-card class="d-flex flex-column" style="max-height: 90vh;">
          <v-card-title class="d-flex align-center flex-shrink-0" :style="{ ...themeStyles.dialogHeader, position: 'sticky', top: 0, zIndex: 10 }">
            <span class="text-h6">{{ codeDialogTitle }}</span>
            <v-spacer></v-spacer>
            <v-btn
              icon="mdi-content-copy"
              variant="text"
              color="white"
              @click="copyToClipboard"
              class="mr-2"
            >
              <v-icon>mdi-content-copy</v-icon>
              <v-tooltip activator="parent" location="bottom">Copy to Clipboard</v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-close"
              variant="text"
              color="white"
              @click="showCodeDialog = false"
            >
              <v-icon>mdi-close</v-icon>
              <v-tooltip activator="parent" location="bottom">Close</v-tooltip>
            </v-btn>
          </v-card-title>
          <v-card-text class="flex-grow-1 overflow-y-auto pa-4" style="max-height: calc(90vh - 64px);">
            <pre style="font-family: monospace; font-size: 0.875rem; white-space: pre-wrap; margin: 0;">{{ generatedCode }}</pre>
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- Error Message -->
      <v-alert v-if="errorMessage" type="error" class="mt-4" density="compact">
        {{ errorMessage }}
      </v-alert>

      <!-- Subnets -->
      <v-expansion-panels v-if="subnets.length > 0" class="mt-4" multiple>
        <v-expansion-panel
          v-for="(subnet, index) in subnets"
          :key="index"
          :value="index"
        >
          <v-expansion-panel-title class="bg-surface-variant">
            <div class="d-flex align-center" style="width: 100%;">
              <v-icon class="mr-2">mdi-network</v-icon>
              <span class="font-weight-bold">Subnet {{ index + 1 }}: {{ subnet.cidr }}</span>
              <v-spacer></v-spacer>
              <v-chip size="small" :style="themeStyles.subnetChip" class="mr-2">{{ subnet.usableIPs }} usable IPs</v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Network Address</v-list-item-title>
                    <v-list-item-subtitle>{{ subnet.network }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Subnet Mask</v-list-item-title>
                    <v-list-item-subtitle>{{ subnet.mask }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Availability Zone</v-list-item-title>
                    <v-list-item-subtitle>{{ subnet.availabilityZone }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Total IPs</v-list-item-title>
                    <v-list-item-subtitle>{{ subnet.totalIPs }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="font-weight-bold" :style="themeStyles.usableIps">Usable IPs</v-list-item-title>
                    <v-list-item-subtitle :style="themeStyles.usableIps">{{ subnet.usableIPs }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>

              <v-col cols="12" md="6">
                <v-list density="compact">
                  <v-list-subheader class="text-error font-weight-bold">AWS Reserved IPs</v-list-subheader>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[0] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Network address</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[1] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">VPC router</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[2] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">DNS server</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[3] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Reserved for future use</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[4] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Broadcast address</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>

            <v-divider class="my-2"></v-divider>

            <div class="text-body-2">
              <strong>Usable Range:</strong> {{ subnet.usableRange }}
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Requirements Info Box -->
      <v-alert density="compact" class="mt-4" :style="themeStyles.infoBox" border="start" border-color="primary">
        <div class="text-body-2">
          <strong>AWS VPC Requirements:</strong><br>
          • {{ awsConfig.reservedIpCount }} IPs are reserved by AWS (First 4 IPs and last IP)<br>
          • Minimum subnet size: /{{ awsConfig.minCidrPrefix }} ({{ Math.pow(2, 32 - awsConfig.minCidrPrefix) }} IPs, {{ Math.pow(2, 32 - awsConfig.minCidrPrefix) - awsConfig.reservedIpCount }} usable)<br>
          • VPC CIDR range: /{{ awsConfig.maxCidrPrefix }} to /{{ awsConfig.minCidrPrefix }}
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getThemeStyles } from '../config/cloudThemes'
import { getCloudProviderConfig } from '../config/cloudProviderConfig'

const themeStyles = getThemeStyles('aws')
const awsConfig = getCloudProviderConfig('aws')

interface VPCInfo {
  network: string
  totalIPs: number
  firstIP: string
  lastIP: string
}

interface Subnet {
  network: string
  cidr: string
  mask: string
  totalIPs: number
  usableIPs: number
  reserved: string[]
  usableRange: string
  availabilityZone: string
}

const vpcCidr = ref<string>(awsConfig.defaultCidr)
const numberOfSubnets = ref<number>(awsConfig.defaultSubnetCount)
const vpcInfo = ref<VPCInfo | null>(null)
const subnets = ref<Subnet[]>([])
const errorMessage = ref<string>('')
const showCodeDialog = ref<boolean>(false)
const generatedCode = ref<string>('')
const codeDialogTitle = ref<string>('')

const availabilityZones = awsConfig.availabilityZones

const parseIP = (ip: string): number[] | null => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  const octets = parts.map(part => parseInt(part, 10))
  if (octets.some(octet => isNaN(octet) || octet < 0 || octet > 255)) {
    return null
  }

  return octets
}

const parseCIDR = (cidr: string): { ip: number[], prefix: number } | null => {
  const parts = cidr.split('/')
  if (parts.length !== 2) return null

  const ip = parseIP(parts[0])
  const prefix = parseInt(parts[1], 10)

  if (!ip || isNaN(prefix) || prefix < awsConfig.maxCidrPrefix || prefix > awsConfig.minCidrPrefix) {
    return null
  }

  return { ip, prefix }
}

const ipToNumber = (ip: number[]): number => {
  return (ip[0] << 24) + (ip[1] << 16) + (ip[2] << 8) + ip[3]
}

const numberToIP = (num: number): number[] => {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ]
}

const cidrToMask = (cidr: number): number[] => {
  const mask = []
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, cidr - i * 8))
    mask.push((0xFF << (8 - bits)) & 0xFF)
  }
  return mask
}

const getCurrentVPCCIDR = (): number | null => {
  const parts = vpcCidr.value.split('/')
  if (parts.length !== 2) return null

  const cidr = parseInt(parts[1], 10)
  return isNaN(cidr) ? null : cidr
}

const incrementVPCCIDR = (): void => {
  const cidr = getCurrentVPCCIDR()
  if (cidr !== null && cidr < awsConfig.minCidrPrefix) {
    const parts = vpcCidr.value.split('/')
    vpcCidr.value = `${parts[0]}/${cidr + 1}`
    calculateVPC()
  }
}

const decrementVPCCIDR = (): void => {
  const cidr = getCurrentVPCCIDR()
  if (cidr !== null && cidr > awsConfig.maxCidrPrefix) {
    const parts = vpcCidr.value.split('/')
    vpcCidr.value = `${parts[0]}/${cidr - 1}`
    calculateVPC()
  }
}

const calculateVPC = (): void => {
  errorMessage.value = ''
  vpcInfo.value = null
  subnets.value = []

  if (!vpcCidr.value) {
    return
  }

  try {
    const parsed = parseCIDR(vpcCidr.value)
    if (!parsed) {
      errorMessage.value = 'Invalid CIDR notation. Use format: 10.0.0.0/16'
      return
    }

    const { ip, prefix } = parsed

    // Calculate VPC info
    const networkNum = ipToNumber(ip) & (0xFFFFFFFF << (32 - prefix))
    const networkIP = numberToIP(networkNum)
    const totalIPs = Math.pow(2, 32 - prefix)
    const lastIPNum = networkNum + totalIPs - 1
    const lastIP = numberToIP(lastIPNum)

    vpcInfo.value = {
      network: networkIP.join('.'),
      totalIPs: totalIPs,
      firstIP: networkIP.join('.'),
      lastIP: lastIP.join('.')
    }

    // Calculate subnet size
    if (numberOfSubnets.value < 1 || numberOfSubnets.value > 256) {
      errorMessage.value = 'Number of subnets must be between 1 and 256'
      return
    }

    // Calculate required prefix length for subnets
    const bitsNeeded = Math.ceil(Math.log2(numberOfSubnets.value))
    const subnetPrefix = prefix + bitsNeeded

    // Check against AWS minimum
    if (subnetPrefix > awsConfig.minCidrPrefix) {
      errorMessage.value = `Cannot divide /${prefix} into ${numberOfSubnets.value} subnets. Each subnet would be smaller than /${awsConfig.minCidrPrefix} (AWS minimum).`
      return
    }

    if (subnetPrefix > 32) {
      errorMessage.value = `Cannot divide /${prefix} into ${numberOfSubnets.value} subnets. Not enough address space.`
      return
    }

    // Calculate subnets
    const subnetSize = Math.pow(2, 32 - subnetPrefix)
    const actualNumberOfSubnets = Math.min(numberOfSubnets.value, Math.floor(totalIPs / subnetSize))

    for (let i = 0; i < actualNumberOfSubnets; i++) {
      const subnetNetworkNum = networkNum + (i * subnetSize)
      const subnetNetwork = numberToIP(subnetNetworkNum)
      const subnetMask = cidrToMask(subnetPrefix)

      // AWS reserves: first 4 IPs and last IP
      const reserved: string[] = [
        numberToIP(subnetNetworkNum).join('.'),           // x.x.x.0 - Network address
        numberToIP(subnetNetworkNum + 1).join('.'),       // x.x.x.1 - VPC router
        numberToIP(subnetNetworkNum + 2).join('.'),       // x.x.x.2 - DNS server
        numberToIP(subnetNetworkNum + 3).join('.'),       // x.x.x.3 - Reserved for future use
        numberToIP(subnetNetworkNum + subnetSize - 1).join('.') // x.x.x.255 - Broadcast
      ]

      const usableIPs = subnetSize - awsConfig.reservedIpCount
      const firstUsable = numberToIP(subnetNetworkNum + 4).join('.')
      const lastUsable = numberToIP(subnetNetworkNum + subnetSize - 2).join('.')

      subnets.value.push({
        network: subnetNetwork.join('.'),
        cidr: `${subnetNetwork.join('.')}/${subnetPrefix}`,
        mask: subnetMask.join('.'),
        totalIPs: subnetSize,
        usableIPs: usableIPs,
        reserved: reserved,
        usableRange: `${firstUsable} - ${lastUsable}`,
        availabilityZone: availabilityZones[i % availabilityZones.length]
      })
    }

  } catch (error) {
    errorMessage.value = 'Error calculating subnets. Please check your input.'
    console.error(error)
  }
}

const generateAWSCLI = (): void => {
  if (!vpcInfo.value) return

  let code = `#!/bin/bash\n`
  code += `# AWS CLI Script to Create VPC and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n`
  code += `PREFIX="myproject"\n`
  code += `REGION="us-east-1"\n`
  code += `VPC_CIDR="${vpcCidr.value}"\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `SUBNET${index + 1}_CIDR="${subnet.cidr}"\n`
    code += `SUBNET${index + 1}_AZ="${subnet.availabilityZone}"\n`
  })

  code += `\n# ========================================\n`
  code += `# Create VPC\n`
  code += `# ========================================\n`
  code += `echo "Creating VPC..."\n`
  code += `VPC_ID=$(aws ec2 create-vpc \\\n`
  code += `  --cidr-block "\${VPC_CIDR}" \\\n`
  code += `  --region "\${REGION}" \\\n`
  code += `  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=\${PREFIX}-vpc}]" \\\n`
  code += `  --query 'Vpc.VpcId' \\\n`
  code += `  --output text)\n\n`
  code += `echo "VPC ID: \${VPC_ID}"\n\n`

  code += `# ========================================\n`
  code += `# Create Subnets\n`
  code += `# ========================================\n`
  subnets.value.forEach((subnet, index) => {
    code += `echo "Creating Subnet ${index + 1} in \${SUBNET${index + 1}_AZ}..."\n`
    code += `SUBNET${index + 1}_ID=$(aws ec2 create-subnet \\\n`
    code += `  --vpc-id "\${VPC_ID}" \\\n`
    code += `  --cidr-block "\${SUBNET${index + 1}_CIDR}" \\\n`
    code += `  --availability-zone "\${SUBNET${index + 1}_AZ}" \\\n`
    code += `  --region "\${REGION}" \\\n`
    code += `  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=\${PREFIX}-subnet${index + 1}}]" \\\n`
    code += `  --query 'Subnet.SubnetId' \\\n`
    code += `  --output text)\n\n`
    code += `echo "Subnet ${index + 1} ID: \${SUBNET${index + 1}_ID}"\n\n`
  })

  code += `echo "AWS VPC and Subnets created successfully!"\n`

  generatedCode.value = code
  codeDialogTitle.value = 'AWS CLI Script'
  showCodeDialog.value = true
}

const generateTerraform = (): void => {
  if (!vpcInfo.value) return

  let code = `# Terraform Configuration for AWS VPC and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `# ========================================\n`
  code += `# Provider Configuration\n`
  code += `# ========================================\n\n`
  code += `terraform {\n`
  code += `  required_providers {\n`
  code += `    aws = {\n`
  code += `      source  = "hashicorp/aws"\n`
  code += `      version = "~> 5.0"\n`
  code += `    }\n`
  code += `  }\n`
  code += `}\n\n`
  code += `provider "aws" {\n`
  code += `  region = var.region\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n\n`
  code += `variable "prefix" {\n`
  code += `  description = "Prefix for resource naming"\n`
  code += `  type        = string\n`
  code += `  default     = "myproject"\n`
  code += `}\n\n`

  code += `variable "region" {\n`
  code += `  description = "AWS region for resources"\n`
  code += `  type        = string\n`
  code += `  default     = "us-east-1"\n`
  code += `}\n\n`

  code += `variable "vpc_cidr" {\n`
  code += `  description = "CIDR block for the VPC"\n`
  code += `  type        = string\n`
  code += `  default     = "${vpcCidr.value}"\n`
  code += `}\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `variable "subnet${index + 1}_cidr" {\n`
    code += `  description = "CIDR block for Subnet ${index + 1}"\n`
    code += `  type        = string\n`
    code += `  default     = "${subnet.cidr}"\n`
    code += `}\n\n`

    code += `variable "subnet${index + 1}_az" {\n`
    code += `  description = "Availability Zone for Subnet ${index + 1}"\n`
    code += `  type        = string\n`
    code += `  default     = "${subnet.availabilityZone}"\n`
    code += `}\n\n`
  })

  code += `# ========================================\n`
  code += `# VPC\n`
  code += `# ========================================\n\n`
  code += `resource "aws_vpc" "main" {\n`
  code += `  cidr_block           = var.vpc_cidr\n`
  code += `  enable_dns_hostnames = true\n`
  code += `  enable_dns_support   = true\n\n`
  code += `  tags = {\n`
  code += `    Name        = "\${var.prefix}-vpc"\n`
  code += `    Environment = "Production"\n`
  code += `    ManagedBy   = "Terraform"\n`
  code += `  }\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Subnets\n`
  code += `# ========================================\n\n`
  subnets.value.forEach((subnet, index) => {
    code += `resource "aws_subnet" "subnet${index + 1}" {\n`
    code += `  vpc_id            = aws_vpc.main.id\n`
    code += `  cidr_block        = var.subnet${index + 1}_cidr\n`
    code += `  availability_zone = var.subnet${index + 1}_az\n\n`
    code += `  tags = {\n`
    code += `    Name        = "\${var.prefix}-subnet${index + 1}"\n`
    code += `    Environment = "Production"\n`
    code += `    ManagedBy   = "Terraform"\n`
    code += `  }\n`
    code += `}\n\n`
  })

  code += `# ========================================\n`
  code += `# Outputs\n`
  code += `# ========================================\n\n`
  code += `output "vpc_id" {\n`
  code += `  description = "ID of the VPC"\n`
  code += `  value       = aws_vpc.main.id\n`
  code += `}\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `output "subnet${index + 1}_id" {\n`
    code += `  description = "ID of Subnet ${index + 1}"\n`
    code += `  value       = aws_subnet.subnet${index + 1}.id\n`
    code += `}\n\n`
  })

  generatedCode.value = code
  codeDialogTitle.value = 'Terraform Configuration'
  showCodeDialog.value = true
}

const generateCloudFormation = (): void => {
  if (!vpcInfo.value) return

  let code = `# AWS CloudFormation Template for VPC and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `AWSTemplateFormatVersion: '2010-09-09'\n`
  code += `Description: 'VPC with ${subnets.value.length} subnets across multiple AZs'\n\n`

  code += `# ========================================\n`
  code += `# Parameters\n`
  code += `# ========================================\n\n`
  code += `Parameters:\n`
  code += `  Prefix:\n`
  code += `    Type: String\n`
  code += `    Default: myproject\n`
  code += `    Description: Prefix for resource naming\n\n`

  code += `  VpcCidr:\n`
  code += `    Type: String\n`
  code += `    Default: ${vpcCidr.value}\n`
  code += `    Description: CIDR block for the VPC\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `  Subnet${index + 1}Cidr:\n`
    code += `    Type: String\n`
    code += `    Default: ${subnet.cidr}\n`
    code += `    Description: CIDR block for Subnet ${index + 1}\n\n`

    code += `  Subnet${index + 1}AZ:\n`
    code += `    Type: String\n`
    code += `    Default: ${subnet.availabilityZone}\n`
    code += `    Description: Availability Zone for Subnet ${index + 1}\n\n`
  })

  code += `# ========================================\n`
  code += `# Resources\n`
  code += `# ========================================\n\n`
  code += `Resources:\n`
  code += `  VPC:\n`
  code += `    Type: AWS::EC2::VPC\n`
  code += `    Properties:\n`
  code += `      CidrBlock: !Ref VpcCidr\n`
  code += `      EnableDnsHostnames: true\n`
  code += `      EnableDnsSupport: true\n`
  code += `      Tags:\n`
  code += `        - Key: Name\n`
  code += `          Value: !Sub '\${Prefix}-vpc'\n`
  code += `        - Key: Environment\n`
  code += `          Value: Production\n`
  code += `        - Key: ManagedBy\n`
  code += `          Value: CloudFormation\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `  Subnet${index + 1}:\n`
    code += `    Type: AWS::EC2::Subnet\n`
    code += `    Properties:\n`
    code += `      VpcId: !Ref VPC\n`
    code += `      CidrBlock: !Ref Subnet${index + 1}Cidr\n`
    code += `      AvailabilityZone: !Ref Subnet${index + 1}AZ\n`
    code += `      Tags:\n`
    code += `        - Key: Name\n`
    code += `          Value: !Sub '\${Prefix}-subnet${index + 1}'\n`
    code += `        - Key: Environment\n`
    code += `          Value: Production\n`
    code += `        - Key: ManagedBy\n`
    code += `          Value: CloudFormation\n\n`
  })

  code += `# ========================================\n`
  code += `# Outputs\n`
  code += `# ========================================\n\n`
  code += `Outputs:\n`
  code += `  VpcId:\n`
  code += `    Description: ID of the VPC\n`
  code += `    Value: !Ref VPC\n`
  code += `    Export:\n`
  code += `      Name: !Sub '\${AWS::StackName}-VpcId'\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `  Subnet${index + 1}Id:\n`
    code += `    Description: ID of Subnet ${index + 1}\n`
    code += `    Value: !Ref Subnet${index + 1}\n`
    code += `    Export:\n`
    code += `      Name: !Sub '\${AWS::StackName}-Subnet${index + 1}Id'\n\n`
  })

  generatedCode.value = code
  codeDialogTitle.value = 'CloudFormation Template (YAML)'
  showCodeDialog.value = true
}

const copyToClipboard = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    decrementVPCCIDR()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    incrementVPCCIDR()
  }
}

onMounted(() => {
  calculateVPC()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.v-list-item-title {
  font-size: 0.875rem;
}

.v-list-item-subtitle {
  font-size: 0.8125rem;
}

.v-btn__content {
  display: flex;
  flex-direction: column;
}
</style>
