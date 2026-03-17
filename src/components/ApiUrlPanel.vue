<template>
  <v-alert density="compact" class="mt-4" :style="infoBoxStyle" border="start">
    <div class="text-caption">
      <strong>API Endpoint URLs:</strong>
      <v-tooltip text="Use these URLs with curl to download IaC files directly. The API is also available via the interactive docs at /api/docs.">
        <template #activator="{ props: ttProps }">
          <v-icon v-bind="ttProps" class="ml-1" size="x-small" style="opacity: 0.7; vertical-align: middle;">mdi-information-outline</v-icon>
        </template>
      </v-tooltip>
    </div>

    <div
      v-for="(label, fmt) in FORMAT_LABELS[provider]"
      :key="fmt"
      class="d-flex align-center ga-1 mt-1"
    >
      <span class="text-caption font-weight-bold flex-shrink-0" style="min-width: 7rem;">{{ label }}</span>

      <code
        class="text-caption flex-grow-1 api-url-text"
        :style="urlStyle"
        :title="buildUrl(fmt)"
      >{{ buildUrl(fmt) }}</code>

      <v-btn
        icon
        size="x-small"
        variant="text"
        :style="{ color: copied === fmt ? 'green' : infoBoxStyle.color }"
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
        :style="{ color: infoBoxStyle.color }"
        :href="buildUrl(fmt)"
        target="_blank"
        rel="noopener noreferrer"
      >
        <v-icon size="small">mdi-open-in-new</v-icon>
        <v-tooltip activator="parent" location="bottom">Open in browser</v-tooltip>
      </v-btn>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getThemeStyles } from '../config/cloudThemes'

const props = defineProps<{
  provider: 'azure' | 'aws' | 'gcp'
  cidr: string
  subnets: number
  prefix?: number | null
  spokeCidrs?: string[]
  spokeSubnets?: number[]
  isDarkMode: boolean
}>()

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

const infoBoxStyle = computed(() => getThemeStyles(props.provider, props.isDarkMode).infoBox)

const urlStyle = computed(() => ({
  color:        infoBoxStyle.value.color,
  fontFamily:   'monospace',
  fontSize:     '0.78rem',
  overflow:     'hidden',
  textOverflow: 'ellipsis',
  whiteSpace:   'nowrap' as const,
  display:      'block',
  userSelect:   'all' as const,
  cursor:       'text',
  opacity:      0.85,
}))
</script>

<style scoped>
.api-url-text:hover {
  opacity: 1 !important;
}
</style>
