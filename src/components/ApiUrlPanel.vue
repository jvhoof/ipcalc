<template>
  <v-expansion-panels class="mt-4">
    <v-expansion-panel :style="panelStyle">
      <v-expansion-panel-title class="text-body-2" :style="titleStyle">
        <v-icon class="mr-2" size="small">mdi-api</v-icon>
        <span>API Endpoint URLs</span>
        <v-tooltip text="Use these URLs with curl/Invoke-RestMethod to download IaC files directly. The API is also available via the interactive docs at /api/docs.">
          <template #activator="{ props: ttProps }">
            <v-icon v-bind="ttProps" class="ml-2" size="x-small" style="opacity: 0.7;">mdi-information-outline</v-icon>
          </template>
        </v-tooltip>
      </v-expansion-panel-title>
      <v-expansion-panel-text :style="panelStyle">
        <v-expansion-panels class="mt-1">
          <v-expansion-panel
            v-for="(label, fmt) in FORMAT_LABELS[provider]"
            :key="fmt"
            :style="innerPanelStyle"
          >
            <v-expansion-panel-title :style="innerTitleStyle" density="compact">
              <div class="d-flex align-center ga-2" style="width: 100%; min-width: 0;">
                <span class="text-caption font-weight-bold flex-shrink-0" style="min-width: 6rem;">{{ label }}</span>
                <code
                  class="text-caption flex-grow-1 api-url-text"
                  :style="urlStyle"
                  :title="buildUrl(fmt)"
                >{{ buildUrl(fmt) }}</code>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  :style="{ color: copied === fmt ? 'green' : innerTitleStyle.color }"
                  @click.stop="copy(fmt)"
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
                  :style="{ color: innerTitleStyle.color }"
                  :href="buildUrl(fmt)"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                >
                  <v-icon size="small">mdi-open-in-new</v-icon>
                  <v-tooltip activator="parent" location="bottom">Open in browser</v-tooltip>
                </v-btn>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text :style="innerPanelStyle">
              <div class="text-caption font-weight-bold mb-2" :style="{ color: innerTitleStyle.color }">One-liner examples:</div>
              <div v-for="example in getExamples(fmt)" :key="example.label" class="mb-2">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold" :style="{ color: innerTitleStyle.color }">
                    <v-icon size="x-small" class="mr-1">{{ example.icon }}</v-icon>{{ example.label }}
                  </span>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    :style="{ color: copiedExample === `${fmt}-${example.label}` ? 'green' : innerTitleStyle.color }"
                    @click="copyExample(fmt, example.label, example.command)"
                  >
                    <v-icon size="small">{{ copiedExample === `${fmt}-${example.label}` ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
                    <v-tooltip activator="parent" location="bottom">
                      {{ copiedExample === `${fmt}-${example.label}` ? 'Copied!' : 'Copy command' }}
                    </v-tooltip>
                  </v-btn>
                </div>
                <pre class="api-url-text" :style="exampleStyle">{{ example.command }}</pre>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
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

interface Example {
  label: string
  icon: string
  command: string
}

function getExamples(format: string): Example[] {
  const url = buildUrl(format)

  const EXAMPLES: Record<string, Example[]> = {
    // Azure formats
    terraform: [
      {
        label: 'Bash / Linux',
        icon: 'mdi-console',
        command: `curl -s "${url}" > main.tf && terraform init && terraform apply`,
      },
      {
        label: 'PowerShell',
        icon: 'mdi-powershell',
        command: `Invoke-WebRequest "${url}" -OutFile main.tf\nterraform init\nterraform apply`,
      },
    ],
    cli: [
      {
        label: 'Bash / Linux',
        icon: 'mdi-console',
        command: `curl -s "${url}" | bash`,
      },
      {
        label: 'PowerShell (WSL)',
        icon: 'mdi-powershell',
        command: `Invoke-RestMethod "${url}" | wsl bash`,
      },
    ],
    bicep: [
      {
        label: 'Bash / Linux',
        icon: 'mdi-console',
        command: `curl -s "${url}" -o main.bicep\naz deployment group create --resource-group <myRG> --template-file main.bicep`,
      },
      {
        label: 'PowerShell',
        icon: 'mdi-powershell',
        command: `Invoke-WebRequest "${url}" -OutFile main.bicep\naz deployment group create --resource-group <myRG> --template-file main.bicep`,
      },
    ],
    arm: [
      {
        label: 'Bash / Linux',
        icon: 'mdi-console',
        command: `curl -s "${url}" -o template.json\naz deployment group create --resource-group <myRG> --template-file template.json`,
      },
      {
        label: 'PowerShell',
        icon: 'mdi-powershell',
        command: `Invoke-WebRequest "${url}" -OutFile template.json\nNew-AzResourceGroupDeployment -ResourceGroupName <myRG> -TemplateFile template.json`,
      },
    ],
    powershell: [
      {
        label: 'Bash / Linux',
        icon: 'mdi-console',
        command: `curl -s "${url}" -o deploy.ps1 && pwsh deploy.ps1`,
      },
      {
        label: 'PowerShell',
        icon: 'mdi-powershell',
        command: `Invoke-WebRequest "${url}" -OutFile deploy.ps1\n.\\deploy.ps1`,
      },
    ],
    // AWS formats
    cloudformation: [
      {
        label: 'Bash / Linux',
        icon: 'mdi-console',
        command: `curl -s "${url}" -o stack.yaml\naws cloudformation create-stack --stack-name MyStack --template-body file://stack.yaml`,
      },
      {
        label: 'PowerShell',
        icon: 'mdi-powershell',
        command: `Invoke-WebRequest "${url}" -OutFile stack.yaml\naws cloudformation create-stack --stack-name MyStack --template-body file://stack.yaml`,
      },
    ],
    // GCP formats
    gcloud: [
      {
        label: 'Bash / Linux',
        icon: 'mdi-console',
        command: `curl -s "${url}" | bash`,
      },
      {
        label: 'PowerShell',
        icon: 'mdi-powershell',
        command: `Invoke-RestMethod "${url}" | Invoke-Expression`,
      },
    ],
  }

  // AWS CLI uses same pattern as azure cli
  if (format === 'cli' && props.provider === 'aws') {
    const awsUrl = url
    return [
      {
        label: 'Bash / Linux',
        icon: 'mdi-console',
        command: `curl -s "${awsUrl}" | bash`,
      },
      {
        label: 'PowerShell',
        icon: 'mdi-powershell',
        command: `Invoke-RestMethod "${awsUrl}" | Invoke-Expression`,
      },
    ]
  }

  return EXAMPLES[format] ?? []
}

const copied = ref<string | null>(null)
const copiedExample = ref<string | null>(null)

async function copy(format: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(buildUrl(format))
    copied.value = format
    setTimeout(() => { copied.value = null }, 2000)
  } catch {
    // clipboard not available
  }
}

async function copyExample(format: string, label: string, command: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(command)
    copiedExample.value = `${format}-${label}`
    setTimeout(() => { copiedExample.value = null }, 2000)
  } catch {
    // clipboard not available
  }
}

const infoBoxStyle = computed(() => getThemeStyles(props.provider, props.isDarkMode).infoBox)

const panelStyle = computed(() => ({
  backgroundColor: infoBoxStyle.value.backgroundColor,
  color: infoBoxStyle.value.color,
  borderColor: infoBoxStyle.value.borderColor ?? 'transparent',
}))

const titleStyle = computed(() => ({
  color: infoBoxStyle.value.color,
  backgroundColor: infoBoxStyle.value.backgroundColor,
}))

const innerPanelStyle = computed(() => ({
  backgroundColor: infoBoxStyle.value.backgroundColor,
  color: infoBoxStyle.value.color,
}))

const innerTitleStyle = computed(() => ({
  color: infoBoxStyle.value.color,
  backgroundColor: infoBoxStyle.value.backgroundColor,
  fontSize: '0.8rem',
}))

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

const exampleStyle = computed(() => ({
  color:       infoBoxStyle.value.color,
  fontFamily:  'monospace',
  fontSize:    '0.75rem',
  whiteSpace:  'pre-wrap' as const,
  margin:      0,
  opacity:     0.85,
  lineHeight:  '1.5',
}))
</script>

<style scoped>
.api-url-text:hover {
  opacity: 1 !important;
}
</style>
