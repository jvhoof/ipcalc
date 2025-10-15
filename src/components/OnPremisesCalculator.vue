<template>
  <v-card>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <v-text-field
            v-model="networkCidr"
            label="Network CIDR"
            placeholder="172.16.1.0/24"
            variant="outlined"
            @input="calculateSubnet"
            density="comfortable"
            hint="Enter IP address in CIDR notation (e.g., 192.168.1.0/24)"
            persistent-hint
          >
            <template v-slot:append>
              <v-btn
                icon="mdi-chevron-left"
                size="small"
                variant="text"
                @click="decrementCIDR"
              ></v-btn>
              <v-btn
                icon="mdi-chevron-right"
                size="small"
                variant="text"
                @click="incrementCIDR"
              ></v-btn>
            </template>
          </v-text-field>
        </v-col>
      </v-row>

      <v-card v-if="result" class="mt-4" variant="outlined">
        <v-card-title class="text-h6" style="background-color: #104581; color: white;">Results</v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>Network Address</v-list-item-title>
              <v-list-item-subtitle>{{ result.network }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Broadcast Address</v-list-item-title>
              <v-list-item-subtitle>{{ result.broadcast }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Subnet Mask</v-list-item-title>
              <v-list-item-subtitle>{{ result.subnetMask }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Inverse Mask</v-list-item-title>
              <v-list-item-subtitle>{{ result.inverseMask }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="result.hostRange">
              <v-list-item-title>Host Range</v-list-item-title>
              <v-list-item-subtitle>{{ result.hostRange }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="result.totalHosts !== null">
              <v-list-item-title>Total Hosts</v-list-item-title>
              <v-list-item-subtitle>{{ result.totalHosts }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-card v-if="result" class="mt-4" variant="outlined">
        <v-card-title class="text-h6" style="background-color: #104581; color: white;">Binary</v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>IP Address</v-list-item-title>
              <v-list-item-subtitle style="font-family: monospace;">{{ result.ipBinary }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Netmask</v-list-item-title>
              <v-list-item-subtitle style="font-family: monospace;">{{ result.netmaskBinary }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Network</v-list-item-title>
              <v-list-item-subtitle style="font-family: monospace;">{{ result.networkBinary }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Broadcast</v-list-item-title>
              <v-list-item-subtitle style="font-family: monospace;">{{ result.broadcastBinary }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getDefaultCidr } from '../config/defaultCidr'

interface SubnetResult {
  subnetMask: string
  inverseMask: string
  network: string
  broadcast: string
  hostRange: string | null
  totalHosts: number | null
  ipBinary: string
  netmaskBinary: string
  networkBinary: string
  broadcastBinary: string
}

const networkCidr = ref<string>(getDefaultCidr('onpremises'))
const result = ref<SubnetResult | null>(null)

const parseCIDR = (cidr: string): { ip: number[], prefix: number } | null => {
  const parts = cidr.split('/')
  if (parts.length !== 2) return null

  const ip = parseIP(parts[0])
  const prefix = parseInt(parts[1], 10)

  if (!ip || isNaN(prefix) || prefix < 0 || prefix > 32) {
    return null
  }

  return { ip, prefix }
}

const calculateSubnet = (): void => {
  if (!networkCidr.value) {
    result.value = null
    return
  }

  try {
    const parsed = parseCIDR(networkCidr.value)
    if (!parsed) {
      result.value = null
      return
    }

    const { ip, prefix } = parsed
    const mask = cidrToMask(prefix)

    const network = ip.map((octet, i) => octet & mask[i])
    const broadcast = network.map((octet, i) => octet | (255 - mask[i]))
    const inverseMask = mask.map(octet => 255 - octet)

    let hostRange: string | null = null
    let totalHosts: number | null = null

    if (prefix < 31) {
      const firstHost = [...network]
      firstHost[3] += 1

      const lastHost = [...broadcast]
      lastHost[3] -= 1

      hostRange = `${firstHost.join('.')} - ${lastHost.join('.')}`
      totalHosts = Math.pow(2, 32 - prefix) - 2
    }

    result.value = {
      subnetMask: mask.join('.'),
      inverseMask: inverseMask.join('.'),
      network: network.join('.'),
      broadcast: broadcast.join('.'),
      hostRange,
      totalHosts,
      ipBinary: toBinary(ip),
      netmaskBinary: toBinary(mask),
      networkBinary: toBinary(network),
      broadcastBinary: toBinary(broadcast)
    }
  } catch (error) {
    result.value = null
  }
}

const parseIP = (ip: string): number[] | null => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  const octets = parts.map(part => parseInt(part, 10))
  if (octets.some(octet => isNaN(octet) || octet < 0 || octet > 255)) {
    return null
  }

  return octets
}

const cidrToMask = (cidr: number): number[] => {
  const mask = []
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, cidr - i * 8))
    mask.push((0xFF << (8 - bits)) & 0xFF)
  }
  return mask
}

const getCurrentCIDR = (): number | null => {
  const parts = networkCidr.value.split('/')
  if (parts.length !== 2) return null

  const cidr = parseInt(parts[1], 10)
  return isNaN(cidr) ? null : cidr
}

const incrementCIDR = (): void => {
  const cidr = getCurrentCIDR()
  if (cidr !== null && cidr < 32) {
    const parts = networkCidr.value.split('/')
    networkCidr.value = `${parts[0]}/${cidr + 1}`
    calculateSubnet()
  }
}

const decrementCIDR = (): void => {
  const cidr = getCurrentCIDR()
  if (cidr !== null && cidr > 0) {
    const parts = networkCidr.value.split('/')
    networkCidr.value = `${parts[0]}/${cidr - 1}`
    calculateSubnet()
  }
}

const toBinary = (octets: number[]): string => {
  return octets.map(octet => octet.toString(2).padStart(8, '0')).join('.')
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    decrementCIDR()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    incrementCIDR()
  }
}

onMounted(() => {
  calculateSubnet()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
