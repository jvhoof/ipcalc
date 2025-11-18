import { azureConfig } from './azure'
import { awsConfig } from './aws'
import { gcpConfig } from './gcp'
import type { CloudProvider, ProviderConfig, NodeDefinition } from '@/types'

export const providers: Record<CloudProvider, ProviderConfig> = {
  azure: azureConfig,
  aws: awsConfig,
  gcp: gcpConfig
}

export function getProvider(provider: CloudProvider): ProviderConfig {
  return providers[provider]
}

export function getNodeDefinition(
  provider: CloudProvider,
  nodeType: string
): NodeDefinition | undefined {
  const config = getProvider(provider)
  return config.nodes.find(n => n.type === nodeType)
}

export function getAllNodeDefinitions(provider: CloudProvider): NodeDefinition[] {
  return getProvider(provider).nodes
}

export { azureConfig, awsConfig, gcpConfig }
