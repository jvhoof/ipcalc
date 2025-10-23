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

      <!-- Advanced Configuration -->
      <v-expansion-panels class="mt-2 mb-4">
        <v-expansion-panel>
          <v-expansion-panel-title class="text-body-2">
            <v-icon class="mr-2" size="small">mdi-cog-outline</v-icon>
            <span>Advanced</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="text-subtitle-2 font-weight-bold mb-3">Desired Subnet Prefix</div>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model.number="desiredSubnetPrefix"
                  label="Subnet CIDR Prefix"
                  type="number"
                  :min="oracleConfig.maxCidrPrefix"
                  :max="oracleConfig.minCidrPrefix"
                  variant="outlined"
                  @input="calculateVCN"
                  density="comfortable"
                  hint="Specify a subnet CIDR prefix (e.g., 26 for /26). Uses automatic calculation if not set."
                  persistent-hint
                >
                  <template v-slot:prepend-inner>
                    <span class="text-body-1 font-weight-bold">/</span>
                  </template>
                  <template v-slot:append>
                    <v-btn
                      icon="mdi-refresh"
                      size="small"
                      variant="text"
                      @click="resetToDefaultSubnetPrefix"
                      :disabled="!vcnCidr"
                    >
                      <v-icon>mdi-refresh</v-icon>
                      <v-tooltip activator="parent" location="bottom">Reset to default</v-tooltip>
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
            <v-alert density="compact" type="info" variant="tonal" class="mt-2">
              <div class="text-caption">
                When set, subnets will be created with this CIDR prefix instead of automatically dividing the VCN. This allows you to avoid filling the entire VCN address space.
              </div>
            </v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

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
            <div class="d-flex align-center justify-space-between" style="width: 100%;">
              <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-network</v-icon>
                <span class="font-weight-bold">Subnet {{ index + 1 }}: {{ subnet.cidr }}</span>
              </div>
              <v-chip size="x-small" class="d-flex justify-center align-center ga-2 mt-2" :style="themeStyles.subnetChip">{{ subnet.usableIPs }} usable IPs</v-chip>
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
import {
  loadOracleOCITemplate,
  loadOracleTerraformTemplate
} from '../utils/templateLoader'

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
const desiredSubnetPrefix = ref<number | null>(null)
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

    // Use desired subnet prefix if specified, otherwise calculate automatically
    let subnetPrefix: number
    if (desiredSubnetPrefix.value !== null && desiredSubnetPrefix.value > 0) {
      subnetPrefix = desiredSubnetPrefix.value

      // Validate the desired prefix
      if (subnetPrefix < prefix) {
        errorMessage.value = `Desired subnet prefix /${subnetPrefix} is larger than VCN prefix /${prefix}. Subnet must be smaller than or equal to VCN.`
        return
      }

      if (subnetPrefix > oracleConfig.minCidrPrefix) {
        errorMessage.value = `Desired subnet prefix /${subnetPrefix} is smaller than OCI minimum /${oracleConfig.minCidrPrefix}.`
        return
      }

      if (subnetPrefix < oracleConfig.maxCidrPrefix) {
        errorMessage.value = `Desired subnet prefix /${subnetPrefix} is larger than OCI maximum /${oracleConfig.maxCidrPrefix}.`
        return
      }

      // Check if the desired prefix can accommodate the requested number of subnets
      const subnetSize = Math.pow(2, 32 - subnetPrefix)
      const maxPossibleSubnets = Math.floor(totalIPs / subnetSize)

      if (maxPossibleSubnets < numberOfSubnets.value) {
        errorMessage.value = `Cannot create ${numberOfSubnets.value} subnets with prefix /${subnetPrefix} in a /${prefix} VCN. Maximum possible: ${maxPossibleSubnets} subnet(s). Use a larger prefix (smaller subnets) or reduce the number of subnets.`
        return
      }
    } else {
      // Calculate required prefix length for subnets automatically
      const bitsNeeded = Math.ceil(Math.log2(numberOfSubnets.value))
      subnetPrefix = prefix + bitsNeeded

      // Check against OCI minimum
      if (subnetPrefix > oracleConfig.minCidrPrefix) {
        errorMessage.value = `Cannot divide /${prefix} into ${numberOfSubnets.value} subnets. Each subnet would be smaller than /${oracleConfig.minCidrPrefix} (OCI minimum).`
        return
      }

      if (subnetPrefix > 32) {
        errorMessage.value = `Cannot divide /${prefix} into ${numberOfSubnets.value} subnets. Not enough address space.`
        return
      }
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

const generateOciCLI = async (): Promise<void> => {
  if (!vcnInfo.value) return

  const code = await loadOracleOCITemplate({
    vnetCidr: vcnCidr.value,
    subnets: subnets.value
  })

  generatedCode.value = code
  codeDialogTitle.value = 'OCI CLI Script'
  showCodeDialog.value = true
}

const generateTerraform = async (): Promise<void> => {
  if (!vcnInfo.value) return

  const code = await loadOracleTerraformTemplate({
    vnetCidr: vcnCidr.value,
    subnets: subnets.value
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

const getDefaultSubnetPrefix = (): number | null => {
  const parsed = parseCIDR(vcnCidr.value)
  if (!parsed) return null

  const { prefix } = parsed
  // Calculate required prefix length for subnets automatically
  const bitsNeeded = Math.ceil(Math.log2(numberOfSubnets.value))
  const subnetPrefix = prefix + bitsNeeded

  // Make sure it's within OCI limits
  if (subnetPrefix > oracleConfig.minCidrPrefix || subnetPrefix < oracleConfig.maxCidrPrefix) {
    return null
  }

  return subnetPrefix
}

const resetToDefaultSubnetPrefix = (): void => {
  const defaultPrefix = getDefaultSubnetPrefix()
  if (defaultPrefix !== null) {
    desiredSubnetPrefix.value = defaultPrefix
    calculateVCN()
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
  // Set default subnet prefix based on initial VCN CIDR
  const defaultPrefix = getDefaultSubnetPrefix()
  if (defaultPrefix !== null) {
    desiredSubnetPrefix.value = defaultPrefix
  }
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
