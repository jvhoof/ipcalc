/**
 * IP Calculator Core Logic
 * Shared between web UI and CLI
 */

export interface NetworkInfo {
  network: string
  totalIPs: number
  firstIP: string
  lastIP: string
}

export interface SubnetInfo {
  network: string
  cidr: string
  mask: string
  totalIPs: number
  usableIPs: number
  reserved: string[]
  usableRange: string
  availabilityZone?: string
  region?: string
  availabilityDomain?: string
  zone?: string
}

export interface CloudProviderConfig {
  reservedIpCount: number
  maxCidrPrefix: number
  minCidrPrefix: number
  availabilityZones: string[]
}

/**
 * Parse IP address string into array of octets
 */
export function parseIP(ip: string): number[] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  const octets = parts.map(part => parseInt(part, 10))
  if (octets.some(octet => isNaN(octet) || octet < 0 || octet > 255)) {
    return null
  }

  return octets
}

/**
 * Parse CIDR notation into IP and prefix
 */
export function parseCIDR(cidr: string, minPrefix: number, maxPrefix: number): { ip: number[], prefix: number } | null {
  const parts = cidr.split('/')
  if (parts.length !== 2) return null

  const ip = parseIP(parts[0])
  const prefix = parseInt(parts[1], 10)

  if (!ip || isNaN(prefix) || prefix < minPrefix || prefix > maxPrefix) {
    return null
  }

  return { ip, prefix }
}

/**
 * Convert IP array to number
 */
export function ipToNumber(ip: number[]): number {
  return (ip[0] << 24) + (ip[1] << 16) + (ip[2] << 8) + ip[3]
}

/**
 * Convert number to IP array
 */
export function numberToIP(num: number): number[] {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ]
}

/**
 * Convert CIDR prefix to subnet mask
 */
export function cidrToMask(cidr: number): number[] {
  const mask = []
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, cidr - i * 8))
    mask.push((0xFF << (8 - bits)) & 0xFF)
  }
  return mask
}

/**
 * Calculate network information
 */
export function calculateNetwork(cidr: string, config: CloudProviderConfig): NetworkInfo | null {
  const parsed = parseCIDR(cidr, config.maxCidrPrefix, config.minCidrPrefix)
  if (!parsed) return null

  const { ip, prefix } = parsed

  const networkNum = ipToNumber(ip) & (0xFFFFFFFF << (32 - prefix))
  const networkIP = numberToIP(networkNum)
  const totalIPs = Math.pow(2, 32 - prefix)
  const lastIPNum = networkNum + totalIPs - 1
  const lastIP = numberToIP(lastIPNum)

  return {
    network: networkIP.join('.'),
    totalIPs: totalIPs,
    firstIP: networkIP.join('.'),
    lastIP: lastIP.join('.')
  }
}

/**
 * Calculate subnets for a given network
 */
export function calculateSubnets(
  cidr: string,
  numberOfSubnets: number,
  config: CloudProviderConfig,
  desiredSubnetPrefix?: number | null
): { subnets: SubnetInfo[], error?: string } {
  const parsed = parseCIDR(cidr, config.maxCidrPrefix, config.minCidrPrefix)
  if (!parsed) {
    return { subnets: [], error: 'Invalid CIDR notation. Use format: 10.0.0.0/16' }
  }

  const { ip, prefix } = parsed

  if (numberOfSubnets < 1 || numberOfSubnets > 256) {
    return { subnets: [], error: 'Number of subnets must be between 1 and 256' }
  }

  // Use desired subnet prefix if specified, otherwise calculate automatically
  let subnetPrefix: number
  if (desiredSubnetPrefix !== undefined && desiredSubnetPrefix !== null && desiredSubnetPrefix > 0) {
    subnetPrefix = desiredSubnetPrefix

    // Validate the desired prefix
    if (subnetPrefix < prefix) {
      return {
        subnets: [],
        error: `Desired subnet prefix /${subnetPrefix} is larger than network prefix /${prefix}. Subnet must be smaller than or equal to network.`
      }
    }

    if (subnetPrefix > config.minCidrPrefix) {
      return {
        subnets: [],
        error: `Desired subnet prefix /${subnetPrefix} is smaller than cloud provider minimum /${config.minCidrPrefix}.`
      }
    }

    if (subnetPrefix < config.maxCidrPrefix) {
      return {
        subnets: [],
        error: `Desired subnet prefix /${subnetPrefix} is larger than cloud provider maximum /${config.maxCidrPrefix}.`
      }
    }

    // Calculate network base and total IPs to check capacity
    const networkNum = ipToNumber(ip) & (0xFFFFFFFF << (32 - prefix))
    const totalIPs = Math.pow(2, 32 - prefix)
    const subnetSize = Math.pow(2, 32 - subnetPrefix)
    const maxPossibleSubnets = Math.floor(totalIPs / subnetSize)

    // Check if the desired prefix can accommodate the requested number of subnets
    if (maxPossibleSubnets < numberOfSubnets) {
      return {
        subnets: [],
        error: `Cannot create ${numberOfSubnets} subnets with prefix /${subnetPrefix} in a /${prefix} network. Maximum possible: ${maxPossibleSubnets} subnet(s). Use a larger prefix (smaller subnets) or reduce the number of subnets.`
      }
    }
  } else {
    // Calculate required prefix length for subnets automatically
    const bitsNeeded = Math.ceil(Math.log2(numberOfSubnets))
    subnetPrefix = prefix + bitsNeeded

    // Check against cloud provider minimum
    if (subnetPrefix > config.minCidrPrefix) {
      return {
        subnets: [],
        error: `Cannot divide /${prefix} into ${numberOfSubnets} subnets. Each subnet would be smaller than /${config.minCidrPrefix} (cloud provider minimum).`
      }
    }

    if (subnetPrefix > 32) {
      return {
        subnets: [],
        error: `Cannot divide /${prefix} into ${numberOfSubnets} subnets. Not enough address space.`
      }
    }
  }

  // Calculate network base
  const networkNum = ipToNumber(ip) & (0xFFFFFFFF << (32 - prefix))
  const totalIPs = Math.pow(2, 32 - prefix)
  const subnetSize = Math.pow(2, 32 - subnetPrefix)
  const actualNumberOfSubnets = Math.min(numberOfSubnets, Math.floor(totalIPs / subnetSize))

  const subnets: SubnetInfo[] = []

  for (let i = 0; i < actualNumberOfSubnets; i++) {
    const subnetNetworkNum = networkNum + (i * subnetSize)
    const subnetNetwork = numberToIP(subnetNetworkNum)
    const subnetMask = cidrToMask(subnetPrefix)

    // Calculate reserved IPs based on cloud provider
    const reserved: string[] = []

    // First IPs (network, gateway, etc.)
    for (let j = 0; j < Math.ceil(config.reservedIpCount / 2); j++) {
      reserved.push(numberToIP(subnetNetworkNum + j).join('.'))
    }

    // Last IPs
    for (let j = Math.floor(config.reservedIpCount / 2); j > 0; j--) {
      reserved.push(numberToIP(subnetNetworkNum + subnetSize - j).join('.'))
    }

    const usableIPs = subnetSize - config.reservedIpCount
    const firstUsableOffset = Math.ceil(config.reservedIpCount / 2)
    const lastUsableOffset = Math.floor(config.reservedIpCount / 2) + 1

    const firstUsable = numberToIP(subnetNetworkNum + firstUsableOffset).join('.')
    const lastUsable = numberToIP(subnetNetworkNum + subnetSize - lastUsableOffset).join('.')

    subnets.push({
      network: subnetNetwork.join('.'),
      cidr: `${subnetNetwork.join('.')}/${subnetPrefix}`,
      mask: subnetMask.join('.'),
      totalIPs: subnetSize,
      usableIPs: usableIPs,
      reserved: reserved,
      usableRange: `${firstUsable} - ${lastUsable}`,
      availabilityZone: config.availabilityZones[i % config.availabilityZones.length],
      zone: config.availabilityZones[i % config.availabilityZones.length],
      region: config.availabilityZones[i % config.availabilityZones.length],
      availabilityDomain: config.availabilityZones[i % config.availabilityZones.length]
    })
  }

  return { subnets }
}
