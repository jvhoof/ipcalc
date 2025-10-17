<template>
  <v-card>
    <v-card-text>
      <!-- VCN Configuration -->
      <v-row>
        <v-col cols="12" md="8">
          <v-text-field
            v-model="vcnCidr"
            label="VCN CIDR Block"
            placeholder="10.0.0.0/16"
            variant="outlined"
            @input="calculateVCN"
            density="comfortable"
            hint="Enter your Oracle Cloud VCN address space"
            persistent-hint
          >
            <template v-slot:append>
              <v-btn
                icon="mdi-chevron-left"
                size="small"
                variant="text"
                @click="decrementVCNCIDR"
              ></v-btn>
              <v-btn
                icon="mdi-chevron-right"
                size="small"
                variant="text"
                @click="incrementVCNCIDR"
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
            @input="calculateVCN"
            density="comfortable"
          ></v-text-field>
        </v-col>
      </v-row>

      <!-- VCN Summary -->
      <v-card v-if="vcnInfo" class="mt-4" variant="outlined">
        <v-card-title class="text-h6" :style="themeStyles.vpcInfoHeader">VCN Information</v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>VCN Address Space</v-list-item-title>
              <v-list-item-subtitle>{{ vcnInfo.network }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>CIDR Notation</v-list-item-title>
              <v-list-item-subtitle>{{ vcnCidr }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Total IP Addresses</v-list-item-title>
              <v-list-item-subtitle>{{ vcnInfo.totalIPs.toLocaleString() }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Address Range</v-list-item-title>
              <v-list-item-subtitle>{{ vcnInfo.firstIP }} - {{ vcnInfo.lastIP }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Action Buttons -->
      <div v-if="vcnInfo" class="mt-4">
        <div class="d-flex ga-2">
          <v-btn
            variant="elevated"
            @click="generateOciCLI"
            prepend-icon="mdi-console"
            stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">OCI CLI</div>
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
                    <v-list-item-title class="font-weight-bold">Availability Domain</v-list-item-title>
                    <v-list-item-subtitle>{{ subnet.availabilityDomain }}</v-list-item-subtitle>
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
                  <v-list-subheader class="text-error font-weight-bold">OCI Reserved IPs</v-list-subheader>

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
                    <v-list-item-subtitle class="text-caption">Last address (reserved)</v-list-item-subtitle>
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
          <strong>Oracle Cloud VCN Requirements:</strong><br>
          • {{ oracleConfig.reservedIpCount }} IPs are reserved by OCI (First 2 IPs and last IP)<br>
          • Minimum subnet size: /{{ oracleConfig.minCidrPrefix }} ({{ Math.pow(2, 32 - oracleConfig.minCidrPrefix) }} IPs, {{ Math.pow(2, 32 - oracleConfig.minCidrPrefix) - oracleConfig.reservedIpCount }} usable)<br>
          • VCN CIDR range: /{{ oracleConfig.maxCidrPrefix }} to /{{ oracleConfig.minCidrPrefix }}<br>
          • No broadcast addresses in OCI VCNs
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getThemeStyles } from '../config/cloudThemes'
import { getCloudProviderConfig } from '../config/cloudProviderConfig'

const themeStyles = getThemeStyles('oracle')
const oracleConfig = getCloudProviderConfig('oracle')

interface VCNInfo {
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
  availabilityDomain: string
}

const vcnCidr = ref<string>(oracleConfig.defaultCidr)
const numberOfSubnets = ref<number>(oracleConfig.defaultSubnetCount)
const vcnInfo = ref<VCNInfo | null>(null)
const subnets = ref<Subnet[]>([])
const errorMessage = ref<string>('')
const showCodeDialog = ref<boolean>(false)
const generatedCode = ref<string>('')
const codeDialogTitle = ref<string>('')

const availabilityDomains = oracleConfig.availabilityZones

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

  if (!ip || isNaN(prefix) || prefix < oracleConfig.maxCidrPrefix || prefix > oracleConfig.minCidrPrefix) {
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

const getCurrentVCNCIDR = (): number | null => {
  const parts = vcnCidr.value.split('/')
  if (parts.length !== 2) return null

  const cidr = parseInt(parts[1], 10)
  return isNaN(cidr) ? null : cidr
}

const incrementVCNCIDR = (): void => {
  const cidr = getCurrentVCNCIDR()
  if (cidr !== null && cidr < oracleConfig.minCidrPrefix) {
    const parts = vcnCidr.value.split('/')
    vcnCidr.value = `${parts[0]}/${cidr + 1}`
    calculateVCN()
  }
}

const decrementVCNCIDR = (): void => {
  const cidr = getCurrentVCNCIDR()
  if (cidr !== null && cidr > oracleConfig.maxCidrPrefix) {
    const parts = vcnCidr.value.split('/')
    vcnCidr.value = `${parts[0]}/${cidr - 1}`
    calculateVCN()
  }
}

const calculateVCN = (): void => {
  errorMessage.value = ''
  vcnInfo.value = null
  subnets.value = []

  if (!vcnCidr.value) {
    return
  }

  try {
    const parsed = parseCIDR(vcnCidr.value)
    if (!parsed) {
      errorMessage.value = 'Invalid CIDR notation. Use format: 10.0.0.0/16'
      return
    }

    const { ip, prefix } = parsed

    // Calculate VCN info
    const networkNum = ipToNumber(ip) & (0xFFFFFFFF << (32 - prefix))
    const networkIP = numberToIP(networkNum)
    const totalIPs = Math.pow(2, 32 - prefix)
    const lastIPNum = networkNum + totalIPs - 1
    const lastIP = numberToIP(lastIPNum)

    vcnInfo.value = {
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

    // Check against OCI minimum
    if (subnetPrefix > oracleConfig.minCidrPrefix) {
      errorMessage.value = `Cannot divide /${prefix} into ${numberOfSubnets.value} subnets. Each subnet would be smaller than /${oracleConfig.minCidrPrefix} (OCI minimum).`
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

      // OCI reserves: first 2 IPs and last IP
      const reserved: string[] = [
        numberToIP(subnetNetworkNum).join('.'),           // x.x.x.0 - Network address
        numberToIP(subnetNetworkNum + 1).join('.'),       // x.x.x.1 - Default gateway
        numberToIP(subnetNetworkNum + subnetSize - 1).join('.') // x.x.x.255 - Last address (reserved)
      ]

      const usableIPs = subnetSize - oracleConfig.reservedIpCount
      const firstUsable = numberToIP(subnetNetworkNum + 2).join('.')
      const lastUsable = numberToIP(subnetNetworkNum + subnetSize - 2).join('.')

      subnets.value.push({
        network: subnetNetwork.join('.'),
        cidr: `${subnetNetwork.join('.')}/${subnetPrefix}`,
        mask: subnetMask.join('.'),
        totalIPs: subnetSize,
        usableIPs: usableIPs,
        reserved: reserved,
        usableRange: `${firstUsable} - ${lastUsable}`,
        availabilityDomain: availabilityDomains[i % availabilityDomains.length]
      })
    }

  } catch (error) {
    errorMessage.value = 'Error calculating subnets. Please check your input.'
    console.error(error)
  }
}

const generateOciCLI = (): void => {
  if (!vcnInfo.value) return

  let code = `#!/bin/bash\n`
  code += `# Oracle Cloud Infrastructure CLI Script to Create VCN and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n`
  code += `COMPARTMENT_ID="ocid1.compartment.oc1..your-compartment-id"\n`
  code += `VCN_NAME="myproject-vcn"\n`
  code += `VCN_CIDR="${vcnCidr.value}"\n`
  code += `VCN_DNS_LABEL="myprojectvcn"\n\n`

  code += `# ========================================\n`
  code += `# Create VCN\n`
  code += `# ========================================\n`
  code += `echo "Creating VCN..."\n`
  code += `VCN_ID=$(oci network vcn create \\\n`
  code += `  --compartment-id "\${COMPARTMENT_ID}" \\\n`
  code += `  --cidr-block "\${VCN_CIDR}" \\\n`
  code += `  --display-name "\${VCN_NAME}" \\\n`
  code += `  --dns-label "\${VCN_DNS_LABEL}" \\\n`
  code += `  --query 'data.id' \\\n`
  code += `  --raw-output)\n\n`

  code += `echo "VCN created with ID: \${VCN_ID}"\n\n`

  code += `# ========================================\n`
  code += `# Create Internet Gateway\n`
  code += `# ========================================\n`
  code += `echo "Creating Internet Gateway..."\n`
  code += `IGW_ID=$(oci network internet-gateway create \\\n`
  code += `  --compartment-id "\${COMPARTMENT_ID}" \\\n`
  code += `  --vcn-id "\${VCN_ID}" \\\n`
  code += `  --is-enabled true \\\n`
  code += `  --display-name "\${VCN_NAME}-igw" \\\n`
  code += `  --query 'data.id' \\\n`
  code += `  --raw-output)\n\n`

  code += `echo "Internet Gateway created with ID: \${IGW_ID}"\n\n`

  code += `# ========================================\n`
  code += `# Create Route Table\n`
  code += `# ========================================\n`
  code += `echo "Creating Route Table..."\n`
  code += `RT_ID=$(oci network route-table create \\\n`
  code += `  --compartment-id "\${COMPARTMENT_ID}" \\\n`
  code += `  --vcn-id "\${VCN_ID}" \\\n`
  code += `  --display-name "\${VCN_NAME}-rt" \\\n`
  code += `  --route-rules '[{"destination": "0.0.0.0/0", "destinationType": "CIDR_BLOCK", "networkEntityId": "'\${IGW_ID}'"}]' \\\n`
  code += `  --query 'data.id' \\\n`
  code += `  --raw-output)\n\n`

  code += `echo "Route Table created with ID: \${RT_ID}"\n\n`

  code += `# ========================================\n`
  code += `# Create Security List\n`
  code += `# ========================================\n`
  code += `echo "Creating Security List..."\n`
  code += `SL_ID=$(oci network security-list create \\\n`
  code += `  --compartment-id "\${COMPARTMENT_ID}" \\\n`
  code += `  --vcn-id "\${VCN_ID}" \\\n`
  code += `  --display-name "\${VCN_NAME}-sl" \\\n`
  code += `  --egress-security-rules '[{"destination": "0.0.0.0/0", "protocol": "all", "isStateless": false}]' \\\n`
  code += `  --ingress-security-rules '[{"source": "${vcnCidr.value}", "protocol": "all", "isStateless": false}]' \\\n`
  code += `  --query 'data.id' \\\n`
  code += `  --raw-output)\n\n`

  code += `echo "Security List created with ID: \${SL_ID}"\n\n`

  code += `# ========================================\n`
  code += `# Create Subnets\n`
  code += `# ========================================\n`
  subnets.value.forEach((subnet, index) => {
    code += `echo "Creating Subnet ${index + 1}..."\n`
    code += `SUBNET${index + 1}_ID=$(oci network subnet create \\\n`
    code += `  --compartment-id "\${COMPARTMENT_ID}" \\\n`
    code += `  --vcn-id "\${VCN_ID}" \\\n`
    code += `  --cidr-block "${subnet.cidr}" \\\n`
    code += `  --display-name "\${VCN_NAME}-subnet${index + 1}" \\\n`
    code += `  --dns-label "subnet${index + 1}" \\\n`
    code += `  --route-table-id "\${RT_ID}" \\\n`
    code += `  --security-list-ids '["'\${SL_ID}'"]' \\\n`
    code += `  --query 'data.id' \\\n`
    code += `  --raw-output)\n\n`
    code += `echo "Subnet ${index + 1} created with ID: \${SUBNET${index + 1}_ID}"\n\n`
  })

  code += `echo "OCI VCN and Subnets created successfully!"\n\n`

  code += `# ========================================\n`
  code += `# Display VCN and Subnets\n`
  code += `# ========================================\n`
  code += `echo "VCN Details:"\n`
  code += `oci network vcn get --vcn-id "\${VCN_ID}"\n\n`
  code += `echo "Subnet Details:"\n`
  code += `oci network subnet list --compartment-id "\${COMPARTMENT_ID}" --vcn-id "\${VCN_ID}"\n`

  generatedCode.value = code
  codeDialogTitle.value = 'OCI CLI Script'
  showCodeDialog.value = true
}

const generateTerraform = (): void => {
  if (!vcnInfo.value) return

  let code = `# Terraform Configuration for Oracle Cloud Infrastructure VCN and Subnets\n`
  code += `# Generated by ipcalc.cloud\n\n`

  code += `# ========================================\n`
  code += `# Provider Configuration\n`
  code += `# ========================================\n\n`
  code += `terraform {\n`
  code += `  required_providers {\n`
  code += `    oci = {\n`
  code += `      source  = "oracle/oci"\n`
  code += `      version = "~> 5.0"\n`
  code += `    }\n`
  code += `  }\n`
  code += `}\n\n`
  code += `provider "oci" {\n`
  code += `  # Configure authentication via environment variables or config file\n`
  code += `  # OCI_TENANCY_OCID, OCI_USER_OCID, OCI_FINGERPRINT, OCI_PRIVATE_KEY_PATH\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Variables\n`
  code += `# ========================================\n\n`
  code += `variable "compartment_id" {\n`
  code += `  description = "OCI Compartment OCID"\n`
  code += `  type        = string\n`
  code += `}\n\n`

  code += `variable "vcn_name" {\n`
  code += `  description = "Name of the VCN"\n`
  code += `  type        = string\n`
  code += `  default     = "myproject-vcn"\n`
  code += `}\n\n`

  code += `variable "vcn_cidr" {\n`
  code += `  description = "CIDR block for the VCN"\n`
  code += `  type        = string\n`
  code += `  default     = "${vcnCidr.value}"\n`
  code += `}\n\n`

  code += `variable "vcn_dns_label" {\n`
  code += `  description = "DNS label for the VCN"\n`
  code += `  type        = string\n`
  code += `  default     = "myprojectvcn"\n`
  code += `}\n\n`

  subnets.value.forEach((subnet, index) => {
    code += `variable "subnet${index + 1}_cidr" {\n`
    code += `  description = "CIDR block for Subnet ${index + 1}"\n`
    code += `  type        = string\n`
    code += `  default     = "${subnet.cidr}"\n`
    code += `}\n\n`
  })

  code += `# ========================================\n`
  code += `# VCN\n`
  code += `# ========================================\n\n`
  code += `resource "oci_core_vcn" "vcn" {\n`
  code += `  compartment_id = var.compartment_id\n`
  code += `  cidr_block     = var.vcn_cidr\n`
  code += `  display_name   = var.vcn_name\n`
  code += `  dns_label      = var.vcn_dns_label\n\n`
  code += `  freeform_tags = {\n`
  code += `    "Environment" = "Production"\n`
  code += `    "ManagedBy"   = "Terraform"\n`
  code += `  }\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Internet Gateway\n`
  code += `# ========================================\n\n`
  code += `resource "oci_core_internet_gateway" "igw" {\n`
  code += `  compartment_id = var.compartment_id\n`
  code += `  vcn_id         = oci_core_vcn.vcn.id\n`
  code += `  display_name   = "\${var.vcn_name}-igw"\n`
  code += `  enabled        = true\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Route Table\n`
  code += `# ========================================\n\n`
  code += `resource "oci_core_route_table" "rt" {\n`
  code += `  compartment_id = var.compartment_id\n`
  code += `  vcn_id         = oci_core_vcn.vcn.id\n`
  code += `  display_name   = "\${var.vcn_name}-rt"\n\n`
  code += `  route_rules {\n`
  code += `    destination       = "0.0.0.0/0"\n`
  code += `    destination_type  = "CIDR_BLOCK"\n`
  code += `    network_entity_id = oci_core_internet_gateway.igw.id\n`
  code += `  }\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Security List\n`
  code += `# ========================================\n\n`
  code += `resource "oci_core_security_list" "sl" {\n`
  code += `  compartment_id = var.compartment_id\n`
  code += `  vcn_id         = oci_core_vcn.vcn.id\n`
  code += `  display_name   = "\${var.vcn_name}-sl"\n\n`
  code += `  egress_security_rules {\n`
  code += `    destination = "0.0.0.0/0"\n`
  code += `    protocol    = "all"\n`
  code += `    stateless   = false\n`
  code += `  }\n\n`
  code += `  ingress_security_rules {\n`
  code += `    source      = var.vcn_cidr\n`
  code += `    protocol    = "all"\n`
  code += `    stateless   = false\n`
  code += `  }\n`
  code += `}\n\n`

  code += `# ========================================\n`
  code += `# Subnets\n`
  code += `# ========================================\n\n`
  subnets.value.forEach((_subnet, index) => {
    code += `resource "oci_core_subnet" "subnet${index + 1}" {\n`
    code += `  compartment_id             = var.compartment_id\n`
    code += `  vcn_id                     = oci_core_vcn.vcn.id\n`
    code += `  cidr_block                 = var.subnet${index + 1}_cidr\n`
    code += `  display_name               = "\${var.vcn_name}-subnet${index + 1}"\n`
    code += `  dns_label                  = "subnet${index + 1}"\n`
    code += `  route_table_id             = oci_core_route_table.rt.id\n`
    code += `  security_list_ids          = [oci_core_security_list.sl.id]\n`
    code += `  prohibit_public_ip_on_vnic = false\n\n`
    code += `  freeform_tags = {\n`
    code += `    "Environment" = "Production"\n`
    code += `    "ManagedBy"   = "Terraform"\n`
    code += `  }\n`
    code += `}\n\n`
  })

  code += `# ========================================\n`
  code += `# Outputs\n`
  code += `# ========================================\n\n`
  code += `output "vcn_id" {\n`
  code += `  description = "OCID of the VCN"\n`
  code += `  value       = oci_core_vcn.vcn.id\n`
  code += `}\n\n`

  code += `output "vcn_name" {\n`
  code += `  description = "Name of the VCN"\n`
  code += `  value       = oci_core_vcn.vcn.display_name\n`
  code += `}\n\n`

  code += `output "internet_gateway_id" {\n`
  code += `  description = "OCID of the Internet Gateway"\n`
  code += `  value       = oci_core_internet_gateway.igw.id\n`
  code += `}\n\n`

  code += `output "route_table_id" {\n`
  code += `  description = "OCID of the Route Table"\n`
  code += `  value       = oci_core_route_table.rt.id\n`
  code += `}\n\n`

  code += `output "security_list_id" {\n`
  code += `  description = "OCID of the Security List"\n`
  code += `  value       = oci_core_security_list.sl.id\n`
  code += `}\n\n`

  subnets.value.forEach((_subnet, index) => {
    code += `output "subnet${index + 1}_id" {\n`
    code += `  description = "OCID of Subnet ${index + 1}"\n`
    code += `  value       = oci_core_subnet.subnet${index + 1}.id\n`
    code += `}\n\n`

    code += `output "subnet${index + 1}_name" {\n`
    code += `  description = "Name of Subnet ${index + 1}"\n`
    code += `  value       = oci_core_subnet.subnet${index + 1}.display_name\n`
    code += `}\n\n`
  })

  generatedCode.value = code
  codeDialogTitle.value = 'Terraform Configuration for OCI'
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
    decrementVCNCIDR()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    incrementVCNCIDR()
  }
}

onMounted(() => {
  calculateVCN()
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
