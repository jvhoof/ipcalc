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
            hint="Enter your Alibaba Cloud VPC address space"
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
            v-model.number="numberOfVSwitches"
            label="Number of vSwitches"
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
            @click="generateAliyunCLI"
            prepend-icon="mdi-console"
            stacked
            class="flex-column py-4 flex-grow-1"
            height="auto"
            :style="themeStyles.button"
          >
            <div class="text-caption text-center">Aliyun CLI</div>
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

      <!-- vSwitches -->
      <v-expansion-panels v-if="vSwitches.length > 0" class="mt-4" multiple>
        <v-expansion-panel
          v-for="(vSwitch, index) in vSwitches"
          :key="index"
          :value="index"
        >
          <v-expansion-panel-title class="bg-surface-variant">
            <div class="d-flex align-center justify-space-between" style="width: 100%;">
              <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-network</v-icon>
                <span class="font-weight-bold">vSwitch {{ index + 1 }}: {{ vSwitch.cidr }}</span>
              </div>
              <v-chip size="x-small" class="d-flex justify-center align-center ga-2 mt-2" :style="themeStyles.subnetChip">{{ vSwitch.usableIPs }} usable IPs</v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Network Address</v-list-item-title>
                    <v-list-item-subtitle>{{ vSwitch.network }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Subnet Mask</v-list-item-title>
                    <v-list-item-subtitle>{{ vSwitch.mask }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Availability Zone</v-list-item-title>
                    <v-list-item-subtitle>{{ vSwitch.zone }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Total IPs</v-list-item-title>
                    <v-list-item-subtitle>{{ vSwitch.totalIPs }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="font-weight-bold" :style="themeStyles.usableIps">Usable IPs</v-list-item-title>
                    <v-list-item-subtitle :style="themeStyles.usableIps">{{ vSwitch.usableIPs }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>

              <v-col cols="12" md="6">
                <v-list density="compact">
                  <v-list-subheader class="text-error font-weight-bold">Alibaba Cloud Reserved IPs</v-list-subheader>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ vSwitch.reserved[0] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Network address</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ vSwitch.reserved[1] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Reserved by Alibaba Cloud</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ vSwitch.reserved[2] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Reserved by Alibaba Cloud</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-title class="text-body-2">{{ vSwitch.reserved[3] }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Broadcast address</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>

            <v-divider class="my-2"></v-divider>

            <div class="text-body-2">
              <strong>Usable Range:</strong> {{ vSwitch.usableRange }}
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Requirements Info Box -->
      <v-alert density="compact" class="mt-4" :style="themeStyles.infoBox" border="start" border-color="primary">
        <div class="text-body-2">
          <strong>Alibaba Cloud VPC Requirements:</strong><br>
          • {{ alicloudConfig.reservedIpCount }} IPs are reserved per vSwitch (network address, broadcast, and last 2 IPs)<br>
          • Minimum vSwitch size: /{{ alicloudConfig.minCidrPrefix }} ({{ Math.pow(2, 32 - alicloudConfig.minCidrPrefix) }} IPs, {{ Math.pow(2, 32 - alicloudConfig.minCidrPrefix) - alicloudConfig.reservedIpCount }} usable)<br>
          • VPC CIDR range: /{{ alicloudConfig.maxCidrPrefix }} to /{{ alicloudConfig.minCidrPrefix }}<br>
          • vSwitches are zone-specific resources
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
  loadAliCloudAliyunTemplate,
  loadAliCloudTerraformTemplate
} from '../utils/templateLoader'

const themeStyles = getThemeStyles('alicloud')
const alicloudConfig = getCloudProviderConfig('alicloud')

interface VPCInfo {
  network: string
  totalIPs: number
  firstIP: string
  lastIP: string
}

interface VSwitch {
  network: string
  cidr: string
  mask: string
  totalIPs: number
  usableIPs: number
  reserved: string[]
  usableRange: string
  zone: string
}

const vpcCidr = ref<string>(alicloudConfig.defaultCidr)
const numberOfVSwitches = ref<number>(alicloudConfig.defaultSubnetCount)
const vpcInfo = ref<VPCInfo | null>(null)
const vSwitches = ref<VSwitch[]>([])
const errorMessage = ref<string>('')
const showCodeDialog = ref<boolean>(false)
const generatedCode = ref<string>('')
const codeDialogTitle = ref<string>('')

const zones = alicloudConfig.availabilityZones

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

  if (!ip || isNaN(prefix) || prefix < alicloudConfig.maxCidrPrefix || prefix > alicloudConfig.minCidrPrefix) {
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
  if (cidr !== null && cidr < alicloudConfig.minCidrPrefix) {
    const parts = vpcCidr.value.split('/')
    vpcCidr.value = `${parts[0]}/${cidr + 1}`
    calculateVPC()
  }
}

const decrementVPCCIDR = (): void => {
  const cidr = getCurrentVPCCIDR()
  if (cidr !== null && cidr > alicloudConfig.maxCidrPrefix) {
    const parts = vpcCidr.value.split('/')
    vpcCidr.value = `${parts[0]}/${cidr - 1}`
    calculateVPC()
  }
}

const calculateVPC = (): void => {
  errorMessage.value = ''
  vpcInfo.value = null
  vSwitches.value = []

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

    // Calculate vSwitch size
    if (numberOfVSwitches.value < 1 || numberOfVSwitches.value > 256) {
      errorMessage.value = 'Number of vSwitches must be between 1 and 256'
      return
    }

    // Calculate required prefix length for vSwitches
    const bitsNeeded = Math.ceil(Math.log2(numberOfVSwitches.value))
    const vSwitchPrefix = prefix + bitsNeeded

    // Check against Alibaba Cloud minimum
    if (vSwitchPrefix > alicloudConfig.minCidrPrefix) {
      errorMessage.value = `Cannot divide /${prefix} into ${numberOfVSwitches.value} vSwitches. Each vSwitch would be smaller than /${alicloudConfig.minCidrPrefix} (Alibaba Cloud minimum).`
      return
    }

    if (vSwitchPrefix > 32) {
      errorMessage.value = `Cannot divide /${prefix} into ${numberOfVSwitches.value} vSwitches. Not enough address space.`
      return
    }

    // Calculate vSwitches
    const vSwitchSize = Math.pow(2, 32 - vSwitchPrefix)
    const actualNumberOfVSwitches = Math.min(numberOfVSwitches.value, Math.floor(totalIPs / vSwitchSize))

    for (let i = 0; i < actualNumberOfVSwitches; i++) {
      const vSwitchNetworkNum = networkNum + (i * vSwitchSize)
      const vSwitchNetwork = numberToIP(vSwitchNetworkNum)
      const vSwitchMask = cidrToMask(vSwitchPrefix)

      // Alibaba Cloud reserves: network address and last 3 IPs
      const reserved: string[] = [
        numberToIP(vSwitchNetworkNum).join('.'),           // x.x.x.0 - Network address
        numberToIP(vSwitchNetworkNum + vSwitchSize - 3).join('.'), // Third from last
        numberToIP(vSwitchNetworkNum + vSwitchSize - 2).join('.'), // Second from last
        numberToIP(vSwitchNetworkNum + vSwitchSize - 1).join('.')  // x.x.x.255 - Broadcast
      ]

      const usableIPs = vSwitchSize - alicloudConfig.reservedIpCount
      const firstUsable = numberToIP(vSwitchNetworkNum + 1).join('.')
      const lastUsable = numberToIP(vSwitchNetworkNum + vSwitchSize - 4).join('.')

      vSwitches.value.push({
        network: vSwitchNetwork.join('.'),
        cidr: `${vSwitchNetwork.join('.')}/${vSwitchPrefix}`,
        mask: vSwitchMask.join('.'),
        totalIPs: vSwitchSize,
        usableIPs: usableIPs,
        reserved: reserved,
        usableRange: `${firstUsable} - ${lastUsable}`,
        zone: zones[i % zones.length]
      })
    }

  } catch (error) {
    errorMessage.value = 'Error calculating vSwitches. Please check your input.'
    console.error(error)
  }
}

const generateAliyunCLI = async (): Promise<void> => {
  if (!vpcInfo.value) return

  const code = await loadAliCloudAliyunTemplate({
    vnetCidr: vpcCidr.value,
    subnets: vSwitches.value
  })

  generatedCode.value = code
  codeDialogTitle.value = 'Aliyun CLI Script'
  showCodeDialog.value = true
}

const generateTerraform = async (): Promise<void> => {
  if (!vpcInfo.value) return

  const code = await loadAliCloudTerraformTemplate({
    vnetCidr: vpcCidr.value,
    subnets: vSwitches.value
  })

  generatedCode.value = code
  codeDialogTitle.value = 'Terraform Configuration for Alibaba Cloud'
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
