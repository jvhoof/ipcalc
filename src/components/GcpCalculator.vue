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
            hint="Enter your GCP VPC address space"
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
            @click="generateGcloudCLI"
            prepend-icon="mdi-console"
            stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">gcloud CLI</div>
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
                    <v-list-item-title class="font-weight-bold">Region</v-list-item-title>
                    <v-list-item-subtitle>{{ subnet.region }}</v-list-item-subtitle>
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
                  <v-list-subheader class="text-error font-weight-bold">GCP Reserved IPs</v-list-subheader>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[0] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Network address</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[1] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Default gateway</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[2] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Second-to-last address (reserved)</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ subnet.reserved[3] }}</v-list-item-title>
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
          <strong>GCP VPC Requirements:</strong><br>
          • {{ gcpConfig.reservedIpCount }} IPs are reserved by GCP (First 2 IPs and last 2 IPs)<br>
          • Minimum subnet size: /{{ gcpConfig.minCidrPrefix }} ({{ Math.pow(2, 32 - gcpConfig.minCidrPrefix) }} IPs, {{ Math.pow(2, 32 - gcpConfig.minCidrPrefix) - gcpConfig.reservedIpCount }} usable)<br>
          • Subnet CIDR range: /{{ gcpConfig.maxCidrPrefix }} to /{{ gcpConfig.minCidrPrefix }}<br>
          • Subnets are regional resources
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getThemeStyles } from '../config/cloudThemes'
import { getCloudProviderConfig } from '../config/cloudProviderConfig'

const themeStyles = getThemeStyles('gcp')
const gcpConfig = getCloudProviderConfig('gcp')

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
  region: string
}

const vpcCidr = ref<string>(gcpConfig.defaultCidr)
const numberOfSubnets = ref<number>(gcpConfig.defaultSubnetCount)
const vpcInfo = ref<VPCInfo | null>(null)
const subnets = ref<Subnet[]>([])
const errorMessage = ref<string>('')
const showCodeDialog = ref<boolean>(false)
const generatedCode = ref<string>('')
const codeDialogTitle = ref<string>('')

const regions = gcpConfig.availabilityZones

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

  if (!ip || isNaN(prefix) || prefix < gcpConfig.maxCidrPrefix || prefix > gcpConfig.minCidrPrefix) {
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
  if (cidr !== null && cidr < gcpConfig.minCidrPrefix) {
    const parts = vpcCidr.value.split('/')
    vpcCidr.value = `${parts[0]}/${cidr + 1}`
    calculateVPC()
  }
}

const decrementVPCCIDR = (): void => {
  const cidr = getCurrentVPCCIDR()
  if (cidr !== null && cidr > gcpConfig.maxCidrPrefix) {
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

    // Check against GCP minimum
    if (subnetPrefix > gcpConfig.minCidrPrefix) {
      errorMessage.value = `Cannot divide /${prefix} into ${numberOfSubnets.value} subnets. Each subnet would be smaller than /${gcpConfig.minCidrPrefix} (GCP minimum).`
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

      // GCP reserves: first 2 IPs and last 2 IPs
      const reserved: string[] = [
        numberToIP(subnetNetworkNum).join('.'),           // x.x.x.0 - Network address
        numberToIP(subnetNetworkNum + 1).join('.'),       // x.x.x.1 - Default gateway
        numberToIP(subnetNetworkNum + subnetSize - 2).join('.'), // x.x.x.254 - Second-to-last (reserved)
        numberToIP(subnetNetworkNum + subnetSize - 1).join('.') // x.x.x.255 - Broadcast
      ]

      const usableIPs = subnetSize - gcpConfig.reservedIpCount
      const firstUsable = numberToIP(subnetNetworkNum + 2).join('.')
      const lastUsable = numberToIP(subnetNetworkNum + subnetSize - 3).join('.')

      subnets.value.push({
        network: subnetNetwork.join('.'),
        cidr: `${subnetNetwork.join('.')}/${subnetPrefix}`,
        mask: subnetMask.join('.'),
        totalIPs: subnetSize,
        usableIPs: usableIPs,
        reserved: reserved,
        usableRange: `${firstUsable} - ${lastUsable}`,
        region: regions[i % regions.length]
      })
    }

  } catch (error) {
    errorMessage.value = 'Error calculating subnets. Please check your input.'
    console.error(error)
  }
}

const generateGcloudCLI = (): void => {
  if (!vpcInfo.value) return

  let code = `#!/bin/bash\n`
  code += `# Google Cloud CLI Script to Create VPC and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n`
  code += `PROJECT_ID="your-project-id"\n`
  code += `VPC_NAME="myproject-vpc"\n`
  code += `ROUTING_MODE="regional"  # or "global"\n\n`

  code += `# Set the project\n`
  code += `gcloud config set project "\${PROJECT_ID}"\n\n`

  code += `# ========================================\n`
  code += `# Create VPC (auto mode disabled)\n`
  code += `# ========================================\n`
  code += `echo "Creating VPC..."\n`
  code += `gcloud compute networks create "\${VPC_NAME}" \\\n`
  code += `  --subnet-mode=custom \\\n`
  code += `  --bgp-routing-mode=\${ROUTING_MODE} \\\n`
  code += `  --mtu=1460\n\n`

  code += `echo "VPC \${VPC_NAME} created successfully"\n\n`

  code += `# ========================================\n`
  code += `# Create Subnets\n`
  code += `# ========================================\n`
  subnets.value.forEach((subnet, index) => {
    code += `echo "Creating Subnet ${index + 1} in ${subnet.region}..."\n`
    code += `gcloud compute networks subnets create "\${VPC_NAME}-subnet${index + 1}" \\\n`
    code += `  --network="\${VPC_NAME}" \\\n`
    code += `  --region="${subnet.region}" \\\n`
    code += `  --range="${subnet.cidr}" \\\n`
    code += `  --enable-private-ip-google-access\n\n`
  })

  code += `echo "GCP VPC and Subnets created successfully!"\n\n`

  code += `# ========================================\n`
  code += `# Display VPC and Subnets\n`
  code += `# ========================================\n`
  code += `echo "VPC Details:"\n`
  code += `gcloud compute networks describe "\${VPC_NAME}"\n\n`
  code += `echo "Subnet Details:"\n`
  code += `gcloud compute networks subnets list --network="\${VPC_NAME}"\n`

  generatedCode.value = code
  codeDialogTitle.value = 'gcloud CLI Script'
  showCodeDialog.value = true
}

const generateTerraform = (): void => {
  if (!vpcInfo.value) return

  let code = `# Terraform Configuration for GCP VPC and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `# ========================================\n`
  code += `# Provider Configuration\n`
  code += `# ========================================\n\n`
  code += `terraform {\n`
  code += `  required_providers {\n`
  code += `    google = {\n`
  code += `      source  = "hashicorp/google"\n`
  code += `      version = "~> 5.0"\n`
  code += `    }\n`
  code += `  }\n`
  code += `}\n\n`
  code += `provider "google" {\n`
  code += `  project = var.project_id\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n\n`
  code += `variable "project_id" {\n`
  code += `  description = "GCP Project ID"\n`
  code += `  type        = string\n`
  code += `}\n\n`

  code += `variable "vpc_name" {\n`
  code += `  description = "Name of the VPC"\n`
  code += `  type        = string\n`
  code += `  default     = "myproject-vpc"\n`
  code += `}\n\n`

  code += `variable "routing_mode" {\n`
  code += `  description = "VPC routing mode"\n`
  code += `  type        = string\n`
  code += `  default     = "REGIONAL"\n`
  code += `}\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `variable "subnet${index + 1}_cidr" {\n`
    code += `  description = "CIDR block for Subnet ${index + 1}"\n`
    code += `  type        = string\n`
    code += `  default     = "${subnet.cidr}"\n`
    code += `}\n\n`

    code += `variable "subnet${index + 1}_region" {\n`
    code += `  description = "Region for Subnet ${index + 1}"\n`
    code += `  type        = string\n`
    code += `  default     = "${subnet.region}"\n`
    code += `}\n\n`
  })

  code += `# ========================================\n`
  code += `# VPC Network\n`
  code += `# ========================================\n\n`
  code += `resource "google_compute_network" "vpc" {\n`
  code += `  name                    = var.vpc_name\n`
  code += `  auto_create_subnetworks = false\n`
  code += `  routing_mode            = var.routing_mode\n`
  code += `  mtu                     = 1460\n`
  code += `  project                 = var.project_id\n\n`
  code += `  description = "Custom VPC created by Terraform"\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Subnets\n`
  code += `# ========================================\n\n`
  subnets.value.forEach((_subnet, index) => {
    code += `resource "google_compute_subnetwork" "subnet${index + 1}" {\n`
    code += `  name          = "\${var.vpc_name}-subnet${index + 1}"\n`
    code += `  ip_cidr_range = var.subnet${index + 1}_cidr\n`
    code += `  region        = var.subnet${index + 1}_region\n`
    code += `  network       = google_compute_network.vpc.id\n`
    code += `  project       = var.project_id\n\n`
    code += `  private_ip_google_access = true\n\n`
    code += `  log_config {\n`
    code += `    aggregation_interval = "INTERVAL_10_MIN"\n`
    code += `    flow_sampling        = 0.5\n`
    code += `    metadata             = "INCLUDE_ALL_METADATA"\n`
    code += `  }\n`
    code += `}\n\n`
  })

  code += `# ========================================\n`
  code += `# Firewall Rules (Example)\n`
  code += `# ========================================\n\n`
  code += `# Allow internal communication\n`
  code += `resource "google_compute_firewall" "allow_internal" {\n`
  code += `  name    = "\${var.vpc_name}-allow-internal"\n`
  code += `  network = google_compute_network.vpc.name\n`
  code += `  project = var.project_id\n\n`
  code += `  allow {\n`
  code += `    protocol = "tcp"\n`
  code += `    ports    = ["0-65535"]\n`
  code += `  }\n\n`
  code += `  allow {\n`
  code += `    protocol = "udp"\n`
  code += `    ports    = ["0-65535"]\n`
  code += `  }\n\n`
  code += `  allow {\n`
  code += `    protocol = "icmp"\n`
  code += `  }\n\n`
  code += `  source_ranges = ["${vpcCidr.value}"]\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Outputs\n`
  code += `# ========================================\n\n`
  code += `output "vpc_name" {\n`
  code += `  description = "Name of the VPC"\n`
  code += `  value       = google_compute_network.vpc.name\n`
  code += `}\n\n`

  code += `output "vpc_id" {\n`
  code += `  description = "ID of the VPC"\n`
  code += `  value       = google_compute_network.vpc.id\n`
  code += `}\n\n`

  code += `output "vpc_self_link" {\n`
  code += `  description = "Self link of the VPC"\n`
  code += `  value       = google_compute_network.vpc.self_link\n`
  code += `}\n\n`

  subnets.value.forEach((_subnet, index) => {
    code += `output "subnet${index + 1}_name" {\n`
    code += `  description = "Name of Subnet ${index + 1}"\n`
    code += `  value       = google_compute_subnetwork.subnet${index + 1}.name\n`
    code += `}\n\n`

    code += `output "subnet${index + 1}_id" {\n`
    code += `  description = "ID of Subnet ${index + 1}"\n`
    code += `  value       = google_compute_subnetwork.subnet${index + 1}.id\n`
    code += `}\n\n`

    code += `output "subnet${index + 1}_self_link" {\n`
    code += `  description = "Self link of Subnet ${index + 1}"\n`
    code += `  value       = google_compute_subnetwork.subnet${index + 1}.self_link\n`
    code += `}\n\n`
  })

  generatedCode.value = code
  codeDialogTitle.value = 'Terraform Configuration for GCP'
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
