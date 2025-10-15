/**
 * Default CIDR Block Configuration
 *
 * This file contains the default CIDR blocks for all calculator types.
 * Modify these values to change the default starting CIDR for each environment.
 */

export interface DefaultCidrConfig {
  azure: string
  aws: string
  gcp: string
  oracle: string
  alicloud: string
  onpremises: string
}

export const defaultCidrBlocks: DefaultCidrConfig = {
  azure: '172.16.1.0/24',
  aws: '172.16.1.0/24',
  gcp: '172.16.1.0/24',
  oracle: '172.16.1.0/24',
  alicloud: '172.16.1.0/24',
  onpremises: '172.16.1.0/24'
}

/**
 * Get default CIDR block for a specific environment
 * @param environment - The environment type (azure, aws, gcp, oracle, alicloud, onpremises)
 * @returns Default CIDR block string
 */
export function getDefaultCidr(environment: keyof DefaultCidrConfig): string {
  return defaultCidrBlocks[environment] || '172.16.1.0/24'
}
