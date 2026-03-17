<template>
  <v-card variant="outlined" class="mt-4" :style="cardStyle">
    <v-card-title class="text-caption text-uppercase font-weight-bold d-flex align-center pa-3 pb-1" :style="headerStyle">
      <v-icon class="mr-1" size="small">mdi-api</v-icon>
      API Endpoint URLs
      <v-tooltip text="Use these URLs with curl to download IaC files directly. The API is also available via the interactive docs at /api/docs.">
        <template #activator="{ props }">
          <v-icon v-bind="props" class="ml-1" size="x-small" style="opacity: 0.7;">mdi-information-outline</v-icon>
        </template>
      </v-tooltip>
    </v-card-title>

    <v-card-text class="pa-3 pt-2">
      <div
        v-for="(label, fmt) in FORMAT_LABELS[provider]"
        :key="fmt"
        class="d-flex align-center ga-2 mb-2"
      >
        <v-chip size="x-small" :style="chipStyle" class="flex-shrink-0">{{ label }}</v-chip>

        <code
          class="text-caption flex-grow-1 api-url-text"
          :style="urlStyle"
          :title="buildUrl(fmt)"
        >{{ buildUrl(fmt) }}</code>

        <v-btn
          icon
          size="x-small"
          variant="text"
          :style="{ color: copied === fmt ? 'green' : iconColor }"
          @click="copy(fmt)"
        >
          <v-icon size="small">{{ copied === fmt ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
          <v-tooltip activator="parent" location="bottom">
            {{ copied === fmt ? 'Copied!' : 'Copy URL' }}
          </v-tooltip>
        </v-btn>

        <v-btn
          icon
          size="x-small"
          variant="text"
          :style="{ color: iconColor }"
          :href="buildUrl(fmt)"
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon size="small">mdi-open-in-new</v-icon>
          <v-tooltip activator="parent" location="bottom">Open in browser</v-tooltip>
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const props = defineProps<{
  provider: 'azure' | 'aws' | 'gcp'
  cidr: string
  subnets: number
  prefix?: number | null
  /** Ordered list of spoke CIDRs (only the ones that are configured) */
  spokeCidrs?: string[]
  /** Ordered list of spoke subnet counts, parallel to spokeCidrs */
  spokeSubnets?: number[]
  isDarkMode: boolean
}>()

// ---------------------------------------------------------------------------
// Format labels per provider
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<string, Record<string, string>> = {
  azure: {
    terraform:  'Terraform',
    cli:        'Azure CLI',
    bicep:      'Bicep',
    arm:        'ARM',
    powershell: 'PowerShell',
  },
  aws: {
    terraform:      'Terraform',
    cli:            'AWS CLI',
    cloudformation: 'CloudFormation',
  },
  gcp: {
    terraform: 'Terraform',
    gcloud:    'gcloud CLI',
  },
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

function buildUrl(format: string): string {
  const base = `${window.location.origin}/api/${props.provider}`
  const params = new URLSearchParams()

  params.set('cidr', props.cidr)
  params.set('subnets', String(props.subnets))
  params.set('format', format)

  if (props.prefix != null && props.prefix > 0) {
    params.set('prefix', String(props.prefix))
  }

  if (props.spokeCidrs && props.spokeCidrs.length > 0) {
    params.set('spoke-cidrs', props.spokeCidrs.join(','))
    if (props.spokeSubnets && props.spokeSubnets.length === props.spokeCidrs.length) {
      params.set('spoke-subnets', props.spokeSubnets.join(','))
    }
  }

  return `${base}?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Copy to clipboard
// ---------------------------------------------------------------------------

const copied = ref<string | null>(null)

async function copy(format: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(buildUrl(format))
    copied.value = format
    setTimeout(() => { copied.value = null }, 2000)
  } catch {
    // clipboard not available
  }
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const cardStyle = computed(() => ({
  backgroundColor: props.isDarkMode ? '#2a2a2a' : '#f8f9fa',
  borderColor:     props.isDarkMode ? '#444'    : '#dee2e6',
}))

const headerStyle = computed(() => ({
  color: props.isDarkMode ? '#adb5bd' : '#6c757d',
}))

const chipStyle = computed(() => ({
  backgroundColor: props.isDarkMode ? '#444'    : '#e9ecef',
  color:           props.isDarkMode ? '#dee2e6' : '#495057',
  fontFamily: 'monospace',
}))

const urlStyle = computed(() => ({
  color:           props.isDarkMode ? '#adb5bd' : '#495057',
  fontFamily:      'monospace',
  fontSize:        '0.78rem',
  overflow:        'hidden',
  textOverflow:    'ellipsis',
  whiteSpace:      'nowrap' as const,
  display:         'block',
  userSelect:      'all' as const,
  cursor:          'text',
}))

const iconColor = computed(() =>
  props.isDarkMode ? '#adb5bd' : '#6c757d'
)
</script>

<style scoped>
.api-url-text:hover {
  opacity: 0.85;
}
</style>
