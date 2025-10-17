/**
 * Cloud Provider Configuration
 *
 * This file contains all centralized configuration for cloud provider calculators.
 * Modify these values to change defaults for each cloud provider.
 */

export interface CloudProviderConfig {
  /** Default CIDR block */
  defaultCidr: string
  /** Default number of subnets/vswitches */
  defaultSubnetCount: number
  /** Number of reserved IPs (unavailable for use) */
  reservedIpCount: number
  /** Minimum allowed CIDR prefix (e.g., 29 for /29) */
  minCidrPrefix: number
  /** Maximum allowed CIDR prefix (e.g., 8 for /8) */
  maxCidrPrefix: number
  /** List of availability zones/domains/regions */
  availabilityZones: string[]
}

export interface AllCloudProviderConfig {
  azure: CloudProviderConfig
  aws: CloudProviderConfig
  gcp: CloudProviderConfig
  oracle: CloudProviderConfig
  alicloud: CloudProviderConfig
  onpremises: CloudProviderConfig
}

export const cloudProviderConfig: AllCloudProviderConfig = {
  azure: {
    defaultCidr: '172.16.1.0/24',
    defaultSubnetCount: 4,
    reservedIpCount: 5, // First 4 IPs + last IP
    minCidrPrefix: 29,
    maxCidrPrefix: 8,
    availabilityZones: []
  },
  aws: {
    defaultCidr: '172.16.1.0/24',
    defaultSubnetCount: 3,
    reservedIpCount: 5, // First 4 IPs + last IP
    minCidrPrefix: 28,
    maxCidrPrefix: 16,
    availabilityZones: [
      'us-east-1a',
      'us-east-1b',
      'us-east-1c',
      'us-east-1d',
      'us-east-1e',
      'us-east-1f'
    ]
  },
  gcp: {
    defaultCidr: '172.16.1.0/24',
    defaultSubnetCount: 3,
    reservedIpCount: 4, // First 2 IPs + last 2 IPs
    minCidrPrefix: 29,
    maxCidrPrefix: 8,
    availabilityZones: [
      'us-central1',
      'us-east1',
      'us-west1',
      'europe-west1',
      'asia-east1',
      'asia-southeast1'
    ]
  },
  oracle: {
    defaultCidr: '172.16.1.0/24',
    defaultSubnetCount: 3,
    reservedIpCount: 3, // First 2 IPs + last IP
    minCidrPrefix: 30,
    maxCidrPrefix: 16,
    availabilityZones: ['AD-1', 'AD-2', 'AD-3']
  },
  alicloud: {
    defaultCidr: '172.16.1.0/24',
    defaultSubnetCount: 3,
    reservedIpCount: 6, // First 3 IPs + last 3 IPs
    minCidrPrefix: 29,
    maxCidrPrefix: 8,
    availabilityZones: [
      'cn-hangzhou-a',
      'cn-hangzhou-b',
      'cn-hangzhou-c',
      'cn-hangzhou-d',
      'cn-hangzhou-e',
      'cn-hangzhou-f'
    ]
  },
  onpremises: {
    defaultCidr: '172.16.1.0/24',
    defaultSubnetCount: 3,
    reservedIpCount: 2, // First IP + last IP (typical)
    minCidrPrefix: 30,
    maxCidrPrefix: 8,
    availabilityZones: []
  }
}

/**
 * Get configuration for a specific cloud provider
 * @param provider - The cloud provider (azure, aws, gcp, oracle, alicloud, onpremises)
 * @returns Cloud provider configuration object
 */
export function getCloudProviderConfig(
  provider: keyof AllCloudProviderConfig
): CloudProviderConfig {
  return cloudProviderConfig[provider]
}

/**
 * Get default CIDR block for a specific provider
 * @param provider - The cloud provider
 * @returns Default CIDR block string
 */
export function getDefaultCidr(provider: keyof AllCloudProviderConfig): string {
  return cloudProviderConfig[provider].defaultCidr
}

/**
 * Get default subnet count for a specific provider
 * @param provider - The cloud provider
 * @returns Default number of subnets
 */
export function getDefaultSubnetCount(provider: keyof AllCloudProviderConfig): number {
  return cloudProviderConfig[provider].defaultSubnetCount
}

/**
 * Get reserved IP count for a specific provider
 * @param provider - The cloud provider
 * @returns Number of reserved IPs
 */
export function getReservedIpCount(provider: keyof AllCloudProviderConfig): number {
  return cloudProviderConfig[provider].reservedIpCount
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use cloudProviderConfig instead
 */
export const defaultCidrBlocks = {
  azure: cloudProviderConfig.azure.defaultCidr,
  aws: cloudProviderConfig.aws.defaultCidr,
  gcp: cloudProviderConfig.gcp.defaultCidr,
  oracle: cloudProviderConfig.oracle.defaultCidr,
  alicloud: cloudProviderConfig.alicloud.defaultCidr,
  onpremises: cloudProviderConfig.onpremises.defaultCidr
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use AllCloudProviderConfig instead
 */
export interface DefaultCidrConfig {
  azure: string
  aws: string
  gcp: string
  oracle: string
  alicloud: string
  onpremises: string
}
