<template>
  <v-card :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }">
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

      <!-- Advanced Configuration -->
      <v-expansion-panels class="mt-2 mb-4" :style="{ backgroundColor: mainPanelBgColor }">
        <v-expansion-panel :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }">
          <v-expansion-panel-title class="text-body-2" :style="{ color: mainPanelTextColor }">
            <v-icon class="mr-2" size="small">mdi-cog-outline</v-icon>
            <span>Advanced</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }">
            <div class="text-subtitle-2 font-weight-bold mb-3">Desired Subnet Prefix</div>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model.number="desiredSubnetPrefix"
                  label="Subnet CIDR Prefix"
                  type="number"
                  :min="gcpConfig.maxCidrPrefix"
                  :max="gcpConfig.minCidrPrefix"
                  variant="outlined"
                  @input="calculateVPC"
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
                      :disabled="!vpcCidr"
                    >
                      <v-icon>mdi-refresh</v-icon>
                      <v-tooltip activator="parent" location="bottom">Reset to default</v-tooltip>
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
            <v-alert density="compact" class="mt-2" :style="themeStyles.infoBox" border="start">
              <div class="text-caption">
                When set, subnets will be created with this CIDR prefix instead of automatically dividing the VPC. This allows you to avoid filling the entire VPC address space.
              </div>
            </v-alert>

            <!-- VPC Peering Configuration -->
            <v-divider class="my-4"></v-divider>
            <div class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" size="small">mdi-connection</v-icon>
                <span>VPC Peering (Hub-Spoke Topology)</span>
              </div>
              <v-switch
                v-model="peeringEnabled"
                density="compact"
                @update:model-value="onPeeringToggle"
                hide-details
                @click.stop
                :color="isDarkMode ? '#4285f4' : '#1a73e8'"
              ></v-switch>
            </div>

            <div v-if="peeringEnabled">
              <!-- Title and Number of Spoke VPCs on same row -->
              <v-row class="mb-3 align-center">
                <v-col cols="12" md="8">
                  <div class="text-subtitle-2 font-weight-bold">Configure Spoke VPCs</div>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="numberOfSpokeVPCs"
                    label="Number of Spoke VPCs"
                    type="number"
                    min="1"
                    max="10"
                    variant="outlined"
                    @input="updateSpokeVPCs"
                    density="compact"
                    hint="Max 10"
                    persistent-hint
                  ></v-text-field>
                </v-col>
              </v-row>

              <!-- Spoke VPC Configurations -->
              <v-expansion-panels v-if="spokeVPCs.length > 0" class="mt-4" multiple>
                <v-expansion-panel
                  v-for="(spoke, index) in spokeVPCs"
                  :key="index"
                  :style="{ backgroundColor: nestedPanelBgColor, color: nestedPanelTextColor }"
                >
                  <v-expansion-panel-title :style="{ backgroundColor: nestedPanelBgColor, color: nestedPanelTextColor }">
                    <div class="d-flex align-center">
                      <v-icon class="mr-2">mdi-network-outline</v-icon>
                      <span class="font-weight-bold">Spoke VPC {{ index + 1 }}: {{ spoke.cidr || 'Not configured' }}</span>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text :style="{ backgroundColor: nestedPanelBgColor, color: nestedPanelTextColor }">
                    <v-row>
                      <v-col cols="12" md="8">
                        <v-text-field
                          v-model="spoke.cidr"
                          label="Spoke VPC CIDR Block"
                          placeholder="10.1.0.0/16"
                          variant="outlined"
                          @input="() => calculateSpokeSubnets(index)"
                          density="comfortable"
                          hint="Enter the spoke VPC address space"
                          persistent-hint
                        >
                          <template v-slot:append>
                            <v-btn
                              icon="mdi-chevron-left"
                              size="small"
                              variant="text"
                              @click="decrementSpokeCIDR(index)"
                            ></v-btn>
                            <v-btn
                              icon="mdi-chevron-right"
                              size="small"
                              variant="text"
                              @click="incrementSpokeCIDR(index)"
                            ></v-btn>
                          </template>
                        </v-text-field>
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model.number="spoke.numberOfSubnets"
                          label="Number of Subnets"
                          type="number"
                          min="1"
                          max="256"
                          variant="outlined"
                          @input="() => calculateSpokeSubnets(index)"
                          density="comfortable"
                        ></v-text-field>
                      </v-col>
                    </v-row>

                    <!-- Spoke VPC Info -->
                    <v-card v-if="spoke.vpcInfo" class="mt-2" variant="outlined" :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }">
                      <v-card-text :style="{ color: mainPanelTextColor }">
                        <v-list density="compact" :style="{ backgroundColor: 'transparent', color: mainPanelTextColor }">
                          <v-list-item>
                            <v-list-item-title>Spoke VPC Address Space</v-list-item-title>
                            <v-list-item-subtitle>{{ spoke.vpcInfo.network }}</v-list-item-subtitle>
                          </v-list-item>
                          <v-list-item>
                            <v-list-item-title>Total IP Addresses</v-list-item-title>
                            <v-list-item-subtitle>{{ spoke.vpcInfo.totalIPs.toLocaleString() }}</v-list-item-subtitle>
                          </v-list-item>
                          <v-list-item>
                            <v-list-item-title>Subnets Created</v-list-item-title>
                            <v-list-item-subtitle>{{ spoke.subnets?.length || 0 }}</v-list-item-subtitle>
                          </v-list-item>
                        </v-list>
                      </v-card-text>
                    </v-card>

                    <!-- Error Message for Spoke -->
                    <v-alert v-if="spoke.error" type="error" class="mt-2" density="compact">
                      {{ spoke.error }}
                    </v-alert>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <v-alert density="compact" class="mt-4" :style="themeStyles.infoBox" border="start">
                <div class="text-caption">
                  <strong>Hub-Spoke Topology:</strong><br>
                  • The main VPC acts as the hub, connecting to multiple spoke VPCs via peering<br>
                  • Spoke VPCs should use non-overlapping CIDR blocks<br>
                  • Each peering connection allows bi-directional traffic between hub and spoke<br>
                  • GCP automatically creates routes for peered VPCs
                </div>
              </v-alert>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- VPC Summary -->
      <v-card v-if="vpcInfo" class="mt-4" variant="outlined" :style="{ backgroundColor: nestedPanelBgColor, color: nestedPanelTextColor }">
        <v-card-title class="text-h6" :style="themeStyles.vpcInfoHeader">VPC Information</v-card-title>
        <v-card-text :style="{ color: nestedPanelTextColor }">
          <v-list density="compact" :style="{ backgroundColor: 'transparent', color: nestedPanelTextColor }">
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
        <v-card class="d-flex flex-column" style="max-height: 90vh;" :style="{ backgroundColor: nestedPanelBgColor, color: nestedPanelTextColor }">
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
          <v-card-text class="flex-grow-1 overflow-y-auto pa-4" style="max-height: calc(90vh - 64px);" :style="{ color: nestedPanelTextColor }">
            <pre :style="{ fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap', margin: 0, color: nestedPanelTextColor }">{{ generatedCode }}</pre>
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
          <v-expansion-panel-text :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }">
            <v-row>
              <v-col cols="12" md="6">
                <v-list density="compact" :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }">
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
                <v-list density="compact" :style="{ backgroundColor: mainPanelBgColor, color: mainPanelTextColor }">
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">GCP Reserved IPs</v-list-item-title>
                  </v-list-item>

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
      <v-alert density="compact" class="mt-2" :style="themeStyles.infoBox" border="start">
        <div class="text-caption">
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
import { ref, onMounted, onUnmounted, inject, computed, type Ref } from 'vue'
import { getThemeStyles, getMainPanelBackgroundColor, getMainPanelTextColor, getNestedPanelBackgroundColor, getNestedPanelTextColor } from '../config/cloudThemes'
import { getCloudProviderConfig } from '../config/cloudProviderConfig'
import {
  loadGCPGcloudTemplate,
  loadGCPTerraformTemplate
} from '../utils/templateLoader'

// Inject dark mode state from parent
const isDarkMode = inject<Ref<boolean>>('isDarkMode', ref(false))

// Compute theme styles based on dark mode
const themeStyles = computed(() => getThemeStyles('gcp', isDarkMode.value))
const mainPanelBgColor = computed(() => getMainPanelBackgroundColor(isDarkMode.value))
const mainPanelTextColor = computed(() => getMainPanelTextColor(isDarkMode.value))
const nestedPanelBgColor = computed(() => getNestedPanelBackgroundColor(isDarkMode.value))
const nestedPanelTextColor = computed(() => getNestedPanelTextColor(isDarkMode.value))
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

interface SpokeVPC {
  cidr: string
  numberOfSubnets: number
  vpcInfo: VPCInfo | null
  subnets: Subnet[]
  error: string
}

const vpcCidr = ref<string>(gcpConfig.defaultCidr)
const numberOfSubnets = ref<number>(gcpConfig.defaultSubnetCount)
const desiredSubnetPrefix = ref<number | null>(null)
const vpcInfo = ref<VPCInfo | null>(null)
const subnets = ref<Subnet[]>([])
const errorMessage = ref<string>('')
const showCodeDialog = ref<boolean>(false)
const generatedCode = ref<string>('')
const codeDialogTitle = ref<string>('')

// VPC Peering state
const peeringEnabled = ref<boolean>(false)
const numberOfSpokeVPCs = ref<number>(2)
const spokeVPCs = ref<SpokeVPC[]>([])

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

    // Use desired subnet prefix if specified, otherwise calculate automatically
    let subnetPrefix: number
    if (desiredSubnetPrefix.value !== null && desiredSubnetPrefix.value > 0) {
      subnetPrefix = desiredSubnetPrefix.value

      // Validate the desired prefix
      if (subnetPrefix < prefix) {
        errorMessage.value = `Desired subnet prefix /${subnetPrefix} is larger than VPC prefix /${prefix}. Subnet must be smaller than or equal to VPC.`
        return
      }

      if (subnetPrefix > gcpConfig.minCidrPrefix) {
        errorMessage.value = `Desired subnet prefix /${subnetPrefix} is smaller than GCP minimum /${gcpConfig.minCidrPrefix}.`
        return
      }

      if (subnetPrefix < gcpConfig.maxCidrPrefix) {
        errorMessage.value = `Desired subnet prefix /${subnetPrefix} is larger than GCP maximum /${gcpConfig.maxCidrPrefix}.`
        return
      }

      // Check if the desired prefix can accommodate the requested number of subnets
      const subnetSize = Math.pow(2, 32 - subnetPrefix)
      const maxPossibleSubnets = Math.floor(totalIPs / subnetSize)

      if (maxPossibleSubnets < numberOfSubnets.value) {
        errorMessage.value = `Cannot create ${numberOfSubnets.value} subnets with prefix /${subnetPrefix} in a /${prefix} VPC. Maximum possible: ${maxPossibleSubnets} subnet(s). Use a larger prefix (smaller subnets) or reduce the number of subnets.`
        return
      }
    } else {
      // Calculate required prefix length for subnets automatically
      const bitsNeeded = Math.ceil(Math.log2(numberOfSubnets.value))
      subnetPrefix = prefix + bitsNeeded

      // Check against GCP minimum
      if (subnetPrefix > gcpConfig.minCidrPrefix) {
        errorMessage.value = `Cannot divide /${prefix} into ${numberOfSubnets.value} subnets. Each subnet would be smaller than /${gcpConfig.minCidrPrefix} (GCP minimum).`
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

const generateGcloudCLI = async (): Promise<void> => {
  if (!vpcInfo.value) return

  const code = await loadGCPGcloudTemplate({
    vnetCidr: vpcCidr.value,
    subnets: subnets.value,
    peeringEnabled: peeringEnabled.value,
    spokeVPCs: spokeVPCs.value
  })

  generatedCode.value = code
  codeDialogTitle.value = 'gcloud CLI Script'
  showCodeDialog.value = true
}

const generateTerraform = async (): Promise<void> => {
  if (!vpcInfo.value) return

  const code = await loadGCPTerraformTemplate({
    vnetCidr: vpcCidr.value,
    subnets: subnets.value,
    peeringEnabled: peeringEnabled.value,
    spokeVPCs: spokeVPCs.value
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

const getDefaultSubnetPrefix = (): number | null => {
  const parsed = parseCIDR(vpcCidr.value)
  if (!parsed) return null

  const { prefix } = parsed
  // Calculate required prefix length for subnets automatically
  const bitsNeeded = Math.ceil(Math.log2(numberOfSubnets.value))
  const subnetPrefix = prefix + bitsNeeded

  // Make sure it's within GCP limits
  if (subnetPrefix > gcpConfig.minCidrPrefix || subnetPrefix < gcpConfig.maxCidrPrefix) {
    return null
  }

  return subnetPrefix
}

const resetToDefaultSubnetPrefix = (): void => {
  const defaultPrefix = getDefaultSubnetPrefix()
  if (defaultPrefix !== null) {
    desiredSubnetPrefix.value = defaultPrefix
    calculateVPC()
  }
}

// VPC Peering functions
const onPeeringToggle = (): void => {
  if (peeringEnabled.value) {
    // Initialize spoke VPCs when peering is enabled
    updateSpokeVPCs()
  } else {
    // Clear spoke VPCs when peering is disabled
    spokeVPCs.value = []
  }
}

const updateSpokeVPCs = (): void => {
  const currentCount = spokeVPCs.value.length
  const targetCount = Math.min(Math.max(1, numberOfSpokeVPCs.value || 1), 10)
  numberOfSpokeVPCs.value = targetCount

  if (targetCount > currentCount) {
    // Add new spoke VPCs
    for (let i = currentCount; i < targetCount; i++) {
      // Generate a default CIDR for the spoke (different from hub)
      const baseOctet = 10 + i + 1 // Start from 10.1.0.0, 10.2.0.0, etc.
      spokeVPCs.value.push({
        cidr: `${baseOctet}.0.0.0/16`,
        numberOfSubnets: 2,
        vpcInfo: null,
        subnets: [],
        error: ''
      })
    }
  } else if (targetCount < currentCount) {
    // Remove excess spoke VPCs
    spokeVPCs.value = spokeVPCs.value.slice(0, targetCount)
  }

  // Calculate all spoke VPCs
  calculateSpokeVPCs()
}

const calculateSpokeVPCs = (): void => {
  if (!peeringEnabled.value) {
    return
  }

  // Calculate each spoke VPC
  spokeVPCs.value.forEach((_, index) => {
    calculateSpokeSubnets(index)
  })
}

const calculateSpokeSubnets = (index: number): void => {
  const spoke = spokeVPCs.value[index]
  if (!spoke) return

  spoke.error = ''
  spoke.vpcInfo = null
  spoke.subnets = []

  if (!spoke.cidr) {
    return
  }

  try {
    const parsed = parseCIDR(spoke.cidr)
    if (!parsed) {
      spoke.error = 'Invalid CIDR notation. Use format: 10.1.0.0/16'
      return
    }

    const { ip, prefix } = parsed

    // Calculate VPC info
    const networkNum = ipToNumber(ip) & (0xFFFFFFFF << (32 - prefix))
    const networkIP = numberToIP(networkNum)
    const totalIPs = Math.pow(2, 32 - prefix)
    const lastIPNum = networkNum + totalIPs - 1
    const lastIP = numberToIP(lastIPNum)

    spoke.vpcInfo = {
      network: networkIP.join('.'),
      totalIPs: totalIPs,
      firstIP: networkIP.join('.'),
      lastIP: lastIP.join('.')
    }

    // Calculate subnets
    if (spoke.numberOfSubnets < 1 || spoke.numberOfSubnets > 256) {
      spoke.error = 'Number of subnets must be between 1 and 256'
      return
    }

    // Calculate required prefix length for subnets
    const bitsNeeded = Math.ceil(Math.log2(spoke.numberOfSubnets))
    const subnetPrefix = prefix + bitsNeeded

    // Check against GCP minimum
    if (subnetPrefix > gcpConfig.minCidrPrefix) {
      spoke.error = `Cannot divide /${prefix} into ${spoke.numberOfSubnets} subnets. Each subnet would be smaller than /${gcpConfig.minCidrPrefix} (GCP minimum).`
      return
    }

    if (subnetPrefix > 32) {
      spoke.error = `Cannot divide /${prefix} into ${spoke.numberOfSubnets} subnets. Not enough address space.`
      return
    }

    // Calculate subnets
    const subnetSize = Math.pow(2, 32 - subnetPrefix)
    const actualNumberOfSubnets = Math.min(spoke.numberOfSubnets, Math.floor(totalIPs / subnetSize))

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

      spoke.subnets.push({
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
    spoke.error = 'Error calculating spoke subnets. Please check your input.'
    console.error(error)
  }
}

const getCurrentSpokeCIDR = (index: number): number | null => {
  const spoke = spokeVPCs.value[index]
  if (!spoke) return null

  const parts = spoke.cidr.split('/')
  if (parts.length !== 2) return null

  const cidr = parseInt(parts[1], 10)
  return isNaN(cidr) ? null : cidr
}

const incrementSpokeCIDR = (index: number): void => {
  const spoke = spokeVPCs.value[index]
  if (!spoke) return

  const cidr = getCurrentSpokeCIDR(index)
  if (cidr !== null && cidr < gcpConfig.minCidrPrefix) {
    const parts = spoke.cidr.split('/')
    spoke.cidr = `${parts[0]}/${cidr + 1}`
    calculateSpokeSubnets(index)
  }
}

const decrementSpokeCIDR = (index: number): void => {
  const spoke = spokeVPCs.value[index]
  if (!spoke) return

  const cidr = getCurrentSpokeCIDR(index)
  if (cidr !== null && cidr > gcpConfig.maxCidrPrefix) {
    const parts = spoke.cidr.split('/')
    spoke.cidr = `${parts[0]}/${cidr - 1}`
    calculateSpokeSubnets(index)
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
  // Set default subnet prefix based on initial VPC CIDR
  const defaultPrefix = getDefaultSubnetPrefix()
  if (defaultPrefix !== null) {
    desiredSubnetPrefix.value = defaultPrefix
  }
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
