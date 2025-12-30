/**
 * Azure Default System Routes Configuration
 *
 * This file defines Azure's default system routes that are automatically created
 * for Virtual Networks (VNets). Understanding these routes is essential for
 * network planning and troubleshooting in Azure.
 *
 * EDUCATIONAL OVERVIEW:
 * =====================
 *
 * Azure automatically creates system routes for each subnet in a Virtual Network.
 * These routes cannot be deleted, but can be overridden with custom routes (UDRs).
 *
 * DEFAULT ROUTE BEHAVIOR:
 * -----------------------
 *
 * 1. VIRTUALNETWORK (VNet Local Traffic):
 *    - Enables communication between all resources within the same VNet
 *    - Includes all address spaces defined in the VNet
 *    - Includes connected VNets via VNet peering
 *    - No explicit route needed - automatically handled by Azure
 *
 * 2. INTERNET (Outbound Internet Traffic):
 *    - Default route: 0.0.0.0/0 -> Internet
 *    - Allows outbound internet connectivity from VNet resources
 *    - Azure automatically provides SNAT for outbound connections
 *    - Inbound traffic blocked by default (requires Public IP or Load Balancer)
 *
 * 3. NONE (Dropped Traffic):
 *    - Used to explicitly drop/blackhole traffic
 *    - Common for private link endpoints and service endpoints
 *    - Can be used in custom routes to block specific destinations
 *
 * ROUTE OVERRIDE PRIORITY:
 * ------------------------
 * 1. Custom routes (User-Defined Routes - UDRs) - Highest priority
 * 2. BGP routes (from ExpressRoute or VPN Gateway)
 * 3. System routes - Lowest priority
 *
 * When multiple routes match, Azure uses:
 * - Longest prefix match (most specific route wins)
 * - Route source priority (Custom > BGP > System)
 *
 * COMMON USE CASES:
 * -----------------
 * - Force tunnel all internet traffic through NVA: 0.0.0.0/0 -> VirtualAppliance
 * - Route specific subnets through firewall: 10.0.x.0/24 -> VirtualAppliance
 * - Disable internet access: 0.0.0.0/0 -> None
 * - Route to on-premises: 192.168.0.0/16 -> VirtualNetworkGateway
 */

/**
 * Azure Next Hop Types
 *
 * Defines where Azure should forward packets that match a route
 */
export enum AzureNextHopType {
  /**
   * VirtualNetwork: Traffic stays within the VNet address space
   * - Used for communication between subnets in the same VNet
   * - Used for VNet peering connections
   * - Automatically includes all address spaces in the VNet
   */
  VIRTUAL_NETWORK = 'VirtualNetwork',

  /**
   * Internet: Traffic goes to the public internet
   * - Azure provides automatic SNAT for outbound connections
   * - Default route for any destination not covered by other routes
   * - Can be overridden to force traffic through NVA or disable internet
   */
  INTERNET = 'Internet',

  /**
   * None: Traffic is dropped (blackholed)
   * - Used to explicitly block traffic to specific destinations
   * - Common for security policies and private endpoints
   * - More explicit than relying on NSG rules
   */
  NONE = 'None',

  /**
   * VirtualAppliance: Traffic goes to a Network Virtual Appliance
   * - Used for firewalls, routers, or other network devices
   * - Requires the IP address of the NVA as next hop address
   * - Must have IP forwarding enabled on the NVA NIC
   */
  VIRTUAL_APPLIANCE = 'VirtualAppliance',

  /**
   * VirtualNetworkGateway: Traffic goes through VPN or ExpressRoute
   * - Used for hybrid connectivity to on-premises networks
   * - Requires a VPN Gateway or ExpressRoute Gateway
   * - Can propagate routes via BGP
   */
  VIRTUAL_NETWORK_GATEWAY = 'VirtualNetworkGateway',

  /**
   * VNetLocalRoute: Special system route for VNet local traffic
   * - Automatically created for each subnet's address range
   * - Cannot be modified or deleted
   * - Ensures intra-VNet connectivity
   */
  VNET_LOCAL = 'VNetLocal'
}

/**
 * Azure System Route Interface
 *
 * Represents a default route automatically created by Azure
 */
export interface AzureSystemRoute {
  /** Human-readable name for the route */
  name: string
  /** Destination address prefix in CIDR notation */
  addressPrefix: string
  /** Next hop type determining where traffic is forwarded */
  nextHopType: AzureNextHopType
  /** Description explaining the route's purpose */
  description: string
  /** Whether this route can be overridden with a UDR */
  canOverride: boolean
}

/**
 * Default System Routes
 *
 * These routes are automatically created for every subnet in Azure VNets
 */
export const AZURE_DEFAULT_SYSTEM_ROUTES: readonly AzureSystemRoute[] = Object.freeze([
  {
    name: 'VNet-Local',
    addressPrefix: '<VNet Address Space>',
    nextHopType: AzureNextHopType.VIRTUAL_NETWORK,
    description:
      'Routes traffic within the VNet address space. Automatically includes all address prefixes defined in the VNet configuration and connected peered VNets.',
    canOverride: false
  },
  {
    name: 'Internet-Default',
    addressPrefix: '0.0.0.0/0',
    nextHopType: AzureNextHopType.INTERNET,
    description:
      'Default route for internet-bound traffic. Can be overridden to force tunnel through NVA or VPN Gateway, or disabled by routing to None.',
    canOverride: true
  }
])

/**
 * Azure Reserved Address Ranges
 *
 * These are special address ranges with automatic routing behavior in Azure
 */
export const AZURE_RESERVED_ADDRESS_RANGES = Object.freeze({
  /**
   * Azure Platform Services
   * These ranges have implicit system routes to enable Azure services
   */
  PLATFORM_SERVICES: [
    {
      prefix: '168.63.129.16/32',
      description: 'Azure Virtual Network DNS, DHCP, and health probes',
      behavior: 'Always routed via Azure infrastructure, cannot be overridden'
    },
    {
      prefix: '169.254.169.254/32',
      description: 'Azure Instance Metadata Service (IMDS)',
      behavior: 'Always routed via Azure infrastructure, cannot be overridden'
    }
  ],

  /**
   * Private Address Spaces (RFC 1918)
   * No default routes - must be explicitly configured or VNet local
   */
  PRIVATE_RANGES: [
    {
      prefix: '10.0.0.0/8',
      description: 'Private Class A address space'
    },
    {
      prefix: '172.16.0.0/12',
      description: 'Private Class B address space'
    },
    {
      prefix: '192.168.0.0/16',
      description: 'Private Class C address space'
    }
  ]
})

/**
 * Common Custom Route Scenarios
 *
 * Examples of User-Defined Routes (UDRs) that override default behavior
 */
export const AZURE_COMMON_ROUTE_SCENARIOS = Object.freeze({
  FORCE_TUNNEL_INTERNET: {
    description: 'Force all internet traffic through a Network Virtual Appliance',
    route: {
      addressPrefix: '0.0.0.0/0',
      nextHopType: AzureNextHopType.VIRTUAL_APPLIANCE,
      nextHopAddress: '<NVA-IP-Address>'
    }
  },
  DISABLE_INTERNET: {
    description: 'Completely disable internet access from subnet',
    route: {
      addressPrefix: '0.0.0.0/0',
      nextHopType: AzureNextHopType.NONE
    }
  },
  ROUTE_TO_ONPREM: {
    description: 'Route specific on-premises network through VPN/ExpressRoute',
    route: {
      addressPrefix: '192.168.0.0/16',
      nextHopType: AzureNextHopType.VIRTUAL_NETWORK_GATEWAY
    }
  },
  ROUTE_SUBNET_THROUGH_FW: {
    description: 'Route traffic to another subnet through a firewall',
    route: {
      addressPrefix: '10.0.2.0/24',
      nextHopType: AzureNextHopType.VIRTUAL_APPLIANCE,
      nextHopAddress: '<Firewall-IP>'
    }
  }
})

/**
 * Route Table Best Practices
 */
export const AZURE_ROUTING_BEST_PRACTICES = Object.freeze({
  PLANNING: [
    'Document all custom routes and their purpose',
    'Use consistent naming conventions for route tables',
    'Plan for route aggregation to minimize route table entries',
    'Consider route propagation from VPN/ExpressRoute gateways'
  ],
  SECURITY: [
    'Use Network Security Groups (NSGs) in combination with routes',
    'Implement least-privilege routing (block by default, allow specific)',
    'Review and audit route changes regularly',
    'Use Azure Firewall or NVA for centralized security inspection'
  ],
  OPERATIONS: [
    'Test connectivity after route changes in non-production first',
    'Use Azure Network Watcher for route troubleshooting',
    'Monitor effective routes on NICs to verify routing behavior',
    'Keep route tables simple - complex routing can impact performance'
  ],
  HIGH_AVAILABILITY: [
    'Deploy redundant NVAs when using VirtualAppliance next hop',
    'Use Azure Load Balancer for NVA high availability',
    'Consider ExpressRoute redundancy for critical on-premises connectivity',
    'Test failover scenarios for gateway routes'
  ]
})

/**
 * Helper function to get default route for a specific destination type
 *
 * @param destinationType - The type of destination (vnet, internet, none)
 * @returns The corresponding default system route
 */
export function getAzureDefaultRoute(
  destinationType: 'vnet' | 'internet'
): AzureSystemRoute | undefined {
  return AZURE_DEFAULT_SYSTEM_ROUTES.find((route) => {
    if (destinationType === 'vnet') {
      return route.nextHopType === AzureNextHopType.VIRTUAL_NETWORK
    }
    if (destinationType === 'internet') {
      return route.nextHopType === AzureNextHopType.INTERNET
    }
    return false
  })
}

/**
 * Helper function to check if an address prefix requires a custom route
 *
 * @param prefix - CIDR prefix to check
 * @param vnetAddressSpace - Array of VNet address spaces
 * @returns True if custom route is needed, false if covered by default routes
 */
export function requiresCustomRoute(prefix: string, vnetAddressSpace: string[]): boolean {
  if (prefix === '0.0.0.0/0') {
    return false
  }

  for (const vnetPrefix of vnetAddressSpace) {
    if (isSubnetOf(prefix, vnetPrefix) || isSubnetOf(vnetPrefix, prefix)) {
      return false
    }
  }

  return true
}

/**
 * Helper function to check if one CIDR is a subnet of another
 * Simplified version for demonstration purposes
 *
 * @param subnet - Potential subnet CIDR
 * @param network - Network CIDR to check against
 * @returns True if subnet is contained within network
 */
function isSubnetOf(subnet: string, network: string): boolean {
  return subnet === network
}
