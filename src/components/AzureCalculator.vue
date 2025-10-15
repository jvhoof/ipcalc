<template>
  <v-card>
    <v-card-text>
      <!-- VNet Configuration -->
      <v-row>
        <v-col cols="12" md="8">
          <v-text-field
            v-model="vnetCidr"
            label="VNet CIDR Block"
            placeholder="10.0.0.0/16"
            variant="outlined"
            @input="calculateVNet"
            density="comfortable"
            hint="Enter your Azure VNet address space"
            persistent-hint
          >
            <template v-slot:append>
              <v-btn
                icon="mdi-chevron-left"
                size="small"
                variant="text"
                @click="decrementVNetCIDR"
              ></v-btn>
              <v-btn
                icon="mdi-chevron-right"
                size="small"
                variant="text"
                @click="incrementVNetCIDR"
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
            @input="calculateVNet"
            density="comfortable"
          ></v-text-field>
        </v-col>
      </v-row>

      <!-- VNet Summary -->
      <v-card v-if="vnetInfo" class="mt-4" variant="outlined">
        <v-card-title class="text-h6" :style="themeStyles.vpcInfoHeader">VNet Information</v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>VNet Address Space</v-list-item-title>
              <v-list-item-subtitle>{{ vnetInfo.network }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>CIDR Notation</v-list-item-title>
              <v-list-item-subtitle>{{ vnetCidr }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Total IP Addresses</v-list-item-title>
              <v-list-item-subtitle>{{ vnetInfo.totalIPs.toLocaleString() }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Address Range</v-list-item-title>
              <v-list-item-subtitle>{{ vnetInfo.firstIP }} - {{ vnetInfo.lastIP }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Action Buttons -->
      <div v-if="vnetInfo" class="mt-4">
        <div class="d-flex ga-2">
          <v-btn
            variant="elevated"
            @click="generateAzureCLI"
            prepend-icon="mdi-console" stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">Azure CLI</div>
          </v-btn>
          <v-btn
            variant="elevated"
            @click="generateTerraform"
            prepend-icon="mdi-code-braces" stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">Terraform</div>
          </v-btn>
          <v-btn
            variant="elevated"
            @click="generateBicep"
            prepend-icon="mdi-file-code" stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">Bicep</div>
          </v-btn>
          <v-btn
            variant="elevated"
            @click="generateARM"
            prepend-icon="mdi-file-document-outline" stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">ARM Template</div>
          </v-btn>
          <v-btn
            variant="elevated"
            @click="generatePowerShell"
            prepend-icon="mdi-powershell" stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">PowerShell</div>
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
                  <v-list-subheader class="text-error font-weight-bold">Azure Reserved IPs</v-list-subheader>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[0] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Network address</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[1] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Default gateway</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[2] }}, {{ subnet.reserved[3] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Azure DNS</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[4] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Broadcast</v-list-item-subtitle>
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
          <strong>Azure VNet Requirements:</strong><br>
          • First 4 IPs and last IP are reserved by Azure<br>
          • Minimum subnet size: /29 (8 IPs, 3 usable)<br>
          • Maximum subnet size: /8
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getThemeStyles } from '../config/cloudThemes'
import { getDefaultCidr } from '../config/defaultCidr'

const themeStyles = getThemeStyles('azure')

interface VNetInfo {
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
}

const vnetCidr = ref<string>(getDefaultCidr('azure'))
const numberOfSubnets = ref<number>(4)
const vnetInfo = ref<VNetInfo | null>(null)
const subnets = ref<Subnet[]>([])
const errorMessage = ref<string>('')
const showCodeDialog = ref<boolean>(false)
const generatedCode = ref<string>('')
const codeDialogTitle = ref<string>('')

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

  if (!ip || isNaN(prefix) || prefix < 8 || prefix > 32) {
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

const getCurrentVNetCIDR = (): number | null => {
  const parts = vnetCidr.value.split('/')
  if (parts.length !== 2) return null

  const cidr = parseInt(parts[1], 10)
  return isNaN(cidr) ? null : cidr
}

const incrementVNetCIDR = (): void => {
  const cidr = getCurrentVNetCIDR()
  if (cidr !== null && cidr < 29) {
    const parts = vnetCidr.value.split('/')
    vnetCidr.value = `${parts[0]}/${cidr + 1}`
    calculateVNet()
  }
}

const decrementVNetCIDR = (): void => {
  const cidr = getCurrentVNetCIDR()
  if (cidr !== null && cidr > 8) {
    const parts = vnetCidr.value.split('/')
    vnetCidr.value = `${parts[0]}/${cidr - 1}`
    calculateVNet()
  }
}

const calculateVNet = (): void => {
  errorMessage.value = ''
  vnetInfo.value = null
  subnets.value = []

  if (!vnetCidr.value) {
    return
  }

  try {
    const parsed = parseCIDR(vnetCidr.value)
    if (!parsed) {
      errorMessage.value = 'Invalid CIDR notation. Use format: 10.0.0.0/16'
      return
    }

    const { ip, prefix } = parsed

    // Calculate VNet info
    const networkNum = ipToNumber(ip) & (0xFFFFFFFF << (32 - prefix))
    const networkIP = numberToIP(networkNum)
    const totalIPs = Math.pow(2, 32 - prefix)
    const lastIPNum = networkNum + totalIPs - 1
    const lastIP = numberToIP(lastIPNum)

    vnetInfo.value = {
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

    // Azure minimum is /29
    if (subnetPrefix > 29) {
      errorMessage.value = `Cannot divide /${prefix} into ${numberOfSubnets.value} subnets. Each subnet would be smaller than /29 (Azure minimum).`
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

      // Azure reserves: first 4 IPs and last IP
      const reserved: string[] = [
        numberToIP(subnetNetworkNum).join('.'),           // x.x.x.0 - Network address
        numberToIP(subnetNetworkNum + 1).join('.'),       // x.x.x.1 - Default gateway
        numberToIP(subnetNetworkNum + 2).join('.'),       // x.x.x.2 - Azure DNS
        numberToIP(subnetNetworkNum + 3).join('.'),       // x.x.x.3 - Azure DNS
        numberToIP(subnetNetworkNum + subnetSize - 1).join('.') // x.x.x.255 - Broadcast
      ]

      const usableIPs = subnetSize - 5 // Subtract 5 reserved IPs
      const firstUsable = numberToIP(subnetNetworkNum + 4).join('.')
      const lastUsable = numberToIP(subnetNetworkNum + subnetSize - 2).join('.')

      subnets.value.push({
        network: subnetNetwork.join('.'),
        cidr: `${subnetNetwork.join('.')}/${subnetPrefix}`,
        mask: subnetMask.join('.'),
        totalIPs: subnetSize,
        usableIPs: usableIPs,
        reserved: reserved,
        usableRange: `${firstUsable} - ${lastUsable}`
      })
    }

  } catch (error) {
    errorMessage.value = 'Error calculating subnets. Please check your input.'
    console.error(error)
  }
}

const generateAzureCLI = (): void => {
  if (!vnetInfo.value) return

  let code = `#!/bin/bash\n`
  code += `# Azure CLI Script to Create VNet and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n`
  code += `PREFIX="myproject"\n`
  code += `LOCATION="eastus"\n`
  code += `RESOURCE_GROUP="\${PREFIX}-rg"\n`
  code += `VNET_NAME="\${PREFIX}-vnet"\n`
  code += `VNET_CIDR="${vnetCidr.value}"\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `SUBNET${index + 1}_NAME="\${PREFIX}-subnet${index + 1}"\n`
    code += `SUBNET${index + 1}_CIDR="${subnet.cidr}"\n`
  })

  code += `\n# ========================================\n`
  code += `# Create Resource Group\n`
  code += `# ========================================\n`
  code += `echo "Creating Resource Group: \${RESOURCE_GROUP}"\n`
  code += `az group create \\\n`
  code += `  --name "\${RESOURCE_GROUP}" \\\n`
  code += `  --location "\${LOCATION}"\n\n`

  code += `# ========================================\n`
  code += `# Create Virtual Network\n`
  code += `# ========================================\n`
  code += `echo "Creating Virtual Network: \${VNET_NAME}"\n`
  code += `az network vnet create \\\n`
  code += `  --resource-group "\${RESOURCE_GROUP}" \\\n`
  code += `  --name "\${VNET_NAME}" \\\n`
  code += `  --address-prefix "\${VNET_CIDR}" \\\n`
  code += `  --location "\${LOCATION}"\n\n`

  code += `# ========================================\n`
  code += `# Create Subnets\n`
  code += `# ========================================\n`
  subnets.value.forEach((subnet, index) => {
    code += `echo "Creating Subnet ${index + 1}: \${SUBNET${index + 1}_NAME}"\n`
    code += `az network vnet subnet create \\\n`
    code += `  --resource-group "\${RESOURCE_GROUP}" \\\n`
    code += `  --vnet-name "\${VNET_NAME}" \\\n`
    code += `  --name "\${SUBNET${index + 1}_NAME}" \\\n`
    code += `  --address-prefix "\${SUBNET${index + 1}_CIDR}"\n\n`
  })

  code += `echo "Azure VNet and Subnets created successfully!"\n`

  generatedCode.value = code
  codeDialogTitle.value = 'Azure CLI Script'
  showCodeDialog.value = true
}

const generateTerraform = (): void => {
  if (!vnetInfo.value) return

  let code = `# Terraform Configuration for Azure VNet and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `# ========================================\n`
  code += `# Provider Configuration\n`
  code += `# ========================================\n\n`
  code += `terraform {\n`
  code += `  required_providers {\n`
  code += `    azurerm = {\n`
  code += `      source  = "hashicorp/azurerm"\n`
  code += `      version = "~> 3.0"\n`
  code += `    }\n`
  code += `  }\n`
  code += `}\n\n`
  code += `provider "azurerm" {\n`
  code += `  features {}\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n\n`
  code += `variable "prefix" {\n`
  code += `  description = "Prefix for resource naming"\n`
  code += `  type        = string\n`
  code += `  default     = "myproject"\n`
  code += `}\n\n`

  code += `variable "location" {\n`
  code += `  description = "Azure region for resources"\n`
  code += `  type        = string\n`
  code += `  default     = "eastus"\n`
  code += `}\n\n`

  code += `variable "vnet_cidr" {\n`
  code += `  description = "CIDR block for the Virtual Network"\n`
  code += `  type        = string\n`
  code += `  default     = "${vnetCidr.value}"\n`
  code += `}\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `variable "subnet${index + 1}_cidr" {\n`
    code += `  description = "CIDR block for Subnet ${index + 1}"\n`
    code += `  type        = string\n`
    code += `  default     = "${subnet.cidr}"\n`
    code += `}\n\n`
  })

  code += `# ========================================\n`
  code += `# Resource Group\n`
  code += `# ========================================\n\n`
  code += `resource "azurerm_resource_group" "main" {\n`
  code += `  name     = "\${var.prefix}-rg"\n`
  code += `  location = var.location\n\n`
  code += `  tags = {\n`
  code += `    Environment = "Production"\n`
  code += `    ManagedBy   = "Terraform"\n`
  code += `  }\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Virtual Network\n`
  code += `# ========================================\n\n`
  code += `resource "azurerm_virtual_network" "main" {\n`
  code += `  name                = "\${var.prefix}-vnet"\n`
  code += `  address_space       = [var.vnet_cidr]\n`
  code += `  location            = azurerm_resource_group.main.location\n`
  code += `  resource_group_name = azurerm_resource_group.main.name\n\n`
  code += `  tags = {\n`
  code += `    Environment = "Production"\n`
  code += `    ManagedBy   = "Terraform"\n`
  code += `  }\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Subnets\n`
  code += `# ========================================\n\n`
  subnets.value.forEach((subnet, index) => {
    code += `resource "azurerm_subnet" "subnet${index + 1}" {\n`
    code += `  name                 = "\${var.prefix}-subnet${index + 1}"\n`
    code += `  resource_group_name  = azurerm_resource_group.main.name\n`
    code += `  virtual_network_name = azurerm_virtual_network.main.name\n`
    code += `  address_prefixes     = [var.subnet${index + 1}_cidr]\n`
    code += `}\n\n`
  })

  code += `# ========================================\n`
  code += `# Outputs\n`
  code += `# ========================================\n\n`
  code += `output "resource_group_name" {\n`
  code += `  description = "Name of the resource group"\n`
  code += `  value       = azurerm_resource_group.main.name\n`
  code += `}\n\n`

  code += `output "vnet_name" {\n`
  code += `  description = "Name of the virtual network"\n`
  code += `  value       = azurerm_virtual_network.main.name\n`
  code += `}\n\n`

  code += `output "vnet_id" {\n`
  code += `  description = "ID of the virtual network"\n`
  code += `  value       = azurerm_virtual_network.main.id\n`
  code += `}\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `output "subnet${index + 1}_id" {\n`
    code += `  description = "ID of Subnet ${index + 1}"\n`
    code += `  value       = azurerm_subnet.subnet${index + 1}.id\n`
    code += `}\n\n`
  })

  generatedCode.value = code
  codeDialogTitle.value = 'Terraform Configuration'
  showCodeDialog.value = true
}

const generateBicep = (): void => {
  if (!vnetInfo.value) return

  let code = `// Bicep Template for Azure VNet and Subnets\n`
  code += `// Generated by ipcalc.cloud\n\n`

  code += `// ========================================\n`
  code += `// Parameters\n`
  code += `// ========================================\n\n`
  code += `@description('Prefix for resource naming')\n`
  code += `param prefix string = 'myproject'\n\n`

  code += `@description('Azure region for resources')\n`
  code += `param location string = 'eastus'\n\n`

  code += `@description('CIDR block for the Virtual Network')\n`
  code += `param vnetCidr string = '${vnetCidr.value}'\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `@description('CIDR block for Subnet ${index + 1}')\n`
    code += `param subnet${index + 1}Cidr string = '${subnet.cidr}'\n\n`
  })

  code += `@description('Tags to apply to all resources')\n`
  code += `param tags object = {\n`
  code += `  Environment: 'Production'\n`
  code += `  ManagedBy: 'Bicep'\n`
  code += `}\n\n`

  code += `// ========================================\n`
  code += `// Resource Group (when using subscription scope)\n`
  code += `// ========================================\n`
  code += `// Uncomment if deploying at subscription scope\n`
  code += `// targetScope = 'subscription'\n`
  code += `// resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {\n`
  code += `//   name: '\${prefix}-rg'\n`
  code += `//   location: location\n`
  code += `//   tags: tags\n`
  code += `// }\n\n`

  code += `// ========================================\n`
  code += `// Virtual Network\n`
  code += `// ========================================\n\n`
  code += `resource vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {\n`
  code += `  name: '\${prefix}-vnet'\n`
  code += `  location: location\n`
  code += `  tags: tags\n`
  code += `  properties: {\n`
  code += `    addressSpace: {\n`
  code += `      addressPrefixes: [\n`
  code += `        vnetCidr\n`
  code += `      ]\n`
  code += `    }\n`
  code += `    subnets: [\n`

  subnets.value.forEach((subnet, index) => {
    code += `      {\n`
    code += `        name: '\${prefix}-subnet${index + 1}'\n`
    code += `        properties: {\n`
    code += `          addressPrefix: subnet${index + 1}Cidr\n`
    code += `        }\n`
    code += `      }\n`
  })

  code += `    ]\n`
  code += `  }\n`
  code += `}\n\n`

  code += `// ========================================\n`
  code += `// Outputs\n`
  code += `// ========================================\n\n`
  code += `@description('Name of the Virtual Network')\n`
  code += `output vnetName string = vnet.name\n\n`

  code += `@description('ID of the Virtual Network')\n`
  code += `output vnetId string = vnet.id\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `@description('ID of Subnet ${index + 1}')\n`
    code += `output subnet${index + 1}Id string = vnet.properties.subnets[${index}].id\n\n`
  })

  generatedCode.value = code
  codeDialogTitle.value = 'Bicep Template'
  showCodeDialog.value = true
}

const generateARM = (): void => {
  if (!vnetInfo.value) return

  let template: any = {
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "metadata": {
      "_generator": {
        "name": "IP Calculator",
        "version": "1.0.0"
      }
    },
    "parameters": {
      "prefix": {
        "type": "string",
        "defaultValue": "myproject",
        "metadata": {
          "description": "Prefix for resource naming"
        }
      },
      "location": {
        "type": "string",
        "defaultValue": "eastus",
        "metadata": {
          "description": "Azure region for resources"
        }
      },
      "vnetCidr": {
        "type": "string",
        "defaultValue": vnetCidr.value,
        "metadata": {
          "description": "CIDR block for the Virtual Network"
        }
      }
    },
    "variables": {
      "resourceGroupName": "[concat(parameters('prefix'), '-rg')]",
      "vnetName": "[concat(parameters('prefix'), '-vnet')]"
    },
    "resources": [
      {
        "type": "Microsoft.Network/virtualNetworks",
        "apiVersion": "2023-05-01",
        "name": "[variables('vnetName')]",
        "location": "[parameters('location')]",
        "tags": {
          "Environment": "Production",
          "ManagedBy": "ARM Template"
        },
        "properties": {
          "addressSpace": {
            "addressPrefixes": [
              "[parameters('vnetCidr')]"
            ]
          },
          "subnets": [] as any[]
        }
      }
    ],
    "outputs": {
      "vnetName": {
        "type": "string",
        "value": "[variables('vnetName')]",
        "metadata": {
          "description": "Name of the Virtual Network"
        }
      },
      "vnetId": {
        "type": "string",
        "value": "[resourceId('Microsoft.Network/virtualNetworks', variables('vnetName'))]",
        "metadata": {
          "description": "Resource ID of the Virtual Network"
        }
      }
    }
  }

  // Add subnet parameters
  subnets.value.forEach((subnet, index) => {
    template.parameters[`subnet${index + 1}Cidr`] = {
      "type": "string",
      "defaultValue": subnet.cidr,
      "metadata": {
        "description": `CIDR block for Subnet ${index + 1}`
      }
    }

    template.variables[`subnet${index + 1}Name`] = `[concat(parameters('prefix'), '-subnet${index + 1}')]`
  })

  // Add subnets to VNet
  subnets.value.forEach((subnet, index) => {
    template.resources[0].properties.subnets.push({
      "name": `[variables('subnet${index + 1}Name')]`,
      "properties": {
        "addressPrefix": `[parameters('subnet${index + 1}Cidr')]`
      }
    })

    // Add subnet outputs
    template.outputs[`subnet${index + 1}Id`] = {
      "type": "string",
      "value": `[resourceId('Microsoft.Network/virtualNetworks/subnets', variables('vnetName'), variables('subnet${index + 1}Name'))]`,
      "metadata": {
        "description": `Resource ID of Subnet ${index + 1}`
      }
    }
  })

  let code = `{\n`
  code += `  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",\n`
  code += `  "contentVersion": "1.0.0.0",\n`
  code += `  "metadata": {\n`
  code += `    "_generator": {\n`
  code += `      "name": "IP Calculator",\n`
  code += `      "version": "1.0.0"\n`
  code += `    }\n`
  code += `  },\n`
  code += `  "parameters": ${JSON.stringify(template.parameters, null, 4).split('\n').join('\n  ')},\n`
  code += `  "variables": ${JSON.stringify(template.variables, null, 4).split('\n').join('\n  ')},\n`
  code += `  "resources": ${JSON.stringify(template.resources, null, 4).split('\n').join('\n  ')},\n`
  code += `  "outputs": ${JSON.stringify(template.outputs, null, 4).split('\n').join('\n  ')}\n`
  code += `}\n`

  generatedCode.value = code
  codeDialogTitle.value = 'ARM Template'
  showCodeDialog.value = true
}

const generatePowerShell = (): void => {
  if (!vnetInfo.value) return

  let code = `# PowerShell Script to Create Azure VNet and Subnets\n`
  code += `# Generated by ipcalc.cloud\n`
  code += `# Requires: Az PowerShell Module\n\n`

  code += `#Requires -Modules Az.Network, Az.Resources\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n\n`
  code += `$Prefix = "myproject"\n`
  code += `$Location = "eastus"\n`
  code += `$ResourceGroupName = "\${Prefix}-rg"\n`
  code += `$VNetName = "\${Prefix}-vnet"\n`
  code += `$VNetCidr = "${vnetCidr.value}"\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `$Subnet${index + 1}Name = "\${Prefix}-subnet${index + 1}"\n`
    code += `$Subnet${index + 1}Cidr = "${subnet.cidr}"\n`
  })

  code += `\n$Tags = @{\n`
  code += `    Environment = "Production"\n`
  code += `    ManagedBy = "PowerShell"\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Create Resource Group\n`
  code += `# ========================================\n\n`
  code += `Write-Host "Creating Resource Group: $ResourceGroupName" -ForegroundColor Cyan\n`
  code += `try {\n`
  code += `    $rg = New-AzResourceGroup \`\n`
  code += `        -Name $ResourceGroupName \`\n`
  code += `        -Location $Location \`\n`
  code += `        -Tag $Tags \`\n`
  code += `        -Force\n`
  code += `    Write-Host "✓ Resource Group created successfully" -ForegroundColor Green\n`
  code += `}\n`
  code += `catch {\n`
  code += `    Write-Error "Failed to create Resource Group: $_"\n`
  code += `    exit 1\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Create Subnet Configurations\n`
  code += `# ========================================\n\n`
  code += `Write-Host "Creating subnet configurations..." -ForegroundColor Cyan\n`
  subnets.value.forEach((subnet, index) => {
    code += `$SubnetConfig${index + 1} = New-AzVirtualNetworkSubnetConfig \`\n`
    code += `    -Name $Subnet${index + 1}Name \`\n`
    code += `    -AddressPrefix $Subnet${index + 1}Cidr\n`
    code += `Write-Host "  - Subnet ${index + 1}: $Subnet${index + 1}Name ($Subnet${index + 1}Cidr)" -ForegroundColor Gray\n\n`
  })

  code += `# ========================================\n`
  code += `# Create Virtual Network\n`
  code += `# ========================================\n\n`
  code += `Write-Host "Creating Virtual Network: $VNetName" -ForegroundColor Cyan\n`
  code += `try {\n`
  code += `    $vnet = New-AzVirtualNetwork \`\n`
  code += `        -Name $VNetName \`\n`
  code += `        -ResourceGroupName $ResourceGroupName \`\n`
  code += `        -Location $Location \`\n`
  code += `        -AddressPrefix $VNetCidr \`\n`
  code += `        -Subnet `

  const subnetVars = subnets.value.map((_, index) => `$SubnetConfig${index + 1}`).join(', ')
  code += subnetVars + ` \`\n`
  code += `        -Tag $Tags\n`
  code += `    Write-Host "✓ Virtual Network created successfully" -ForegroundColor Green\n`
  code += `}\n`
  code += `catch {\n`
  code += `    Write-Error "Failed to create Virtual Network: $_"\n`
  code += `    exit 1\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Display Results\n`
  code += `# ========================================\n\n`
  code += `Write-Host "\`n========================================" -ForegroundColor Yellow\n`
  code += `Write-Host "Deployment Summary" -ForegroundColor Yellow\n`
  code += `Write-Host "========================================" -ForegroundColor Yellow\n`
  code += `Write-Host "Resource Group:    $($rg.ResourceGroupName)" -ForegroundColor White\n`
  code += `Write-Host "Location:          $($rg.Location)" -ForegroundColor White\n`
  code += `Write-Host "VNet Name:         $($vnet.Name)" -ForegroundColor White\n`
  code += `Write-Host "VNet ID:           $($vnet.Id)" -ForegroundColor White\n`
  code += `Write-Host "Address Space:     $($vnet.AddressSpace.AddressPrefixes -join ', ')" -ForegroundColor White\n`
  code += `Write-Host "\`nSubnets:" -ForegroundColor White\n`
  code += `foreach ($subnet in $vnet.Subnets) {\n`
  code += `    Write-Host "  - $($subnet.Name): $($subnet.AddressPrefix)" -ForegroundColor Gray\n`
  code += `}\n`
  code += `Write-Host "========================================\`n" -ForegroundColor Yellow\n\n`

  code += `# ========================================\n`
  code += `# Output Objects (for use in scripts)\n`
  code += `# ========================================\n\n`
  code += `return @{\n`
  code += `    ResourceGroup = $rg\n`
  code += `    VirtualNetwork = $vnet\n`
  code += `    Subnets = $vnet.Subnets\n`
  code += `}\n`

  generatedCode.value = code
  codeDialogTitle.value = 'PowerShell Script'
  showCodeDialog.value = true
}

const copyToClipboard = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    // You could add a toast notification here if desired
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    decrementVNetCIDR()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    incrementVNetCIDR()
  }
}

onMounted(() => {
  calculateVNet()
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

</style>
