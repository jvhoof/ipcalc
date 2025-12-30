import { ref, computed } from 'vue'
import type {
  NetworkDiagram,
  AzureVirtualNetwork,
  AzureSubnet,
  AzureVM,
  RouteTable,
  Route
} from '../types/networkDesigner'
import type { TemplateData, Subnet } from '../utils/templateProcessor'
import {
  parseIP,
  parseCIDR,
  ipToNumber,
  numberToIP,
  cidrToMask
} from '../cli/ipCalculator'

interface ValidationResult {
  valid: boolean
  error?: string
}

export function useAzureNetworkDesigner() {
  const diagram = ref<NetworkDiagram>({
    id: crypto.randomUUID(),
    name: 'New Network Diagram',
    description: '',
    virtualNetworks: [],
    routeTables: [],
    vms: [],
    createdAt: new Date(),
    updatedAt: new Date()
  })

  const updateTimestamp = () => {
    diagram.value.updatedAt = new Date()
  }

  const createVNet = (
    name: string,
    addressSpace: string[],
    location: string,
    resourceGroup: string
  ): AzureVirtualNetwork => {
    const vnet: AzureVirtualNetwork = {
      id: crypto.randomUUID(),
      name,
      addressSpace,
      subnets: [],
      enableDdosProtection: false,
      enableVmProtection: false,
      location,
      resourceGroup
    }
    diagram.value.virtualNetworks.push(vnet)
    updateTimestamp()
    return vnet
  }

  const updateVNet = (
    vnetId: string,
    updates: Partial<Omit<AzureVirtualNetwork, 'id' | 'subnets'>>
  ): AzureVirtualNetwork | null => {
    const vnet = diagram.value.virtualNetworks.find(v => v.id === vnetId)
    if (!vnet) return null

    Object.assign(vnet, updates)
    updateTimestamp()
    return vnet
  }

  const deleteVNet = (vnetId: string): boolean => {
    const index = diagram.value.virtualNetworks.findIndex(v => v.id === vnetId)
    if (index === -1) return false

    const vnet = diagram.value.virtualNetworks[index]
    const subnetIds = vnet.subnets.map(s => s.id)
    diagram.value.vms = diagram.value.vms.filter(vm => !subnetIds.includes(vm.subnetId))

    diagram.value.virtualNetworks.splice(index, 1)
    updateTimestamp()
    return true
  }

  const getVNet = (vnetId: string): AzureVirtualNetwork | null => {
    return diagram.value.virtualNetworks.find(v => v.id === vnetId) || null
  }

  const createSubnet = (
    vnetId: string,
    name: string,
    addressPrefix: string
  ): AzureSubnet | null => {
    const vnet = diagram.value.virtualNetworks.find(v => v.id === vnetId)
    if (!vnet) return null

    const validation = validateSubnetCIDR(addressPrefix, vnet.addressSpace)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const subnet: AzureSubnet = {
      id: crypto.randomUUID(),
      name,
      addressPrefix
    }

    vnet.subnets.push(subnet)
    updateTimestamp()
    return subnet
  }

  const updateSubnet = (
    vnetId: string,
    subnetId: string,
    updates: Partial<Omit<AzureSubnet, 'id'>>
  ): AzureSubnet | null => {
    const vnet = diagram.value.virtualNetworks.find(v => v.id === vnetId)
    if (!vnet) return null

    const subnet = vnet.subnets.find(s => s.id === subnetId)
    if (!subnet) return null

    if (updates.addressPrefix && updates.addressPrefix !== subnet.addressPrefix) {
      const validation = validateSubnetCIDR(updates.addressPrefix, vnet.addressSpace)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    Object.assign(subnet, updates)
    updateTimestamp()
    return subnet
  }

  const deleteSubnet = (vnetId: string, subnetId: string): boolean => {
    const vnet = diagram.value.virtualNetworks.find(v => v.id === vnetId)
    if (!vnet) return false

    const index = vnet.subnets.findIndex(s => s.id === subnetId)
    if (index === -1) return false

    diagram.value.vms = diagram.value.vms.filter(vm => vm.subnetId !== subnetId)

    vnet.subnets.splice(index, 1)
    updateTimestamp()
    return true
  }

  const getSubnet = (vnetId: string, subnetId: string): AzureSubnet | null => {
    const vnet = diagram.value.virtualNetworks.find(v => v.id === vnetId)
    if (!vnet) return null
    return vnet.subnets.find(s => s.id === subnetId) || null
  }

  const createVM = (vm: Omit<AzureVM, 'id'>): AzureVM => {
    const subnet = findSubnetById(vm.subnetId)
    if (!subnet) {
      throw new Error('Subnet not found')
    }

    const validation = validateIPInSubnet(vm.privateIpAddress, subnet.addressPrefix)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const newVm: AzureVM = {
      ...vm,
      id: crypto.randomUUID()
    }

    diagram.value.vms.push(newVm)
    updateTimestamp()
    return newVm
  }

  const updateVM = (vmId: string, updates: Partial<Omit<AzureVM, 'id'>>): AzureVM | null => {
    const vm = diagram.value.vms.find(v => v.id === vmId)
    if (!vm) return null

    if (updates.subnetId && updates.subnetId !== vm.subnetId) {
      const subnet = findSubnetById(updates.subnetId)
      if (!subnet) {
        throw new Error('Subnet not found')
      }

      const ipToValidate = updates.privateIpAddress || vm.privateIpAddress
      const validation = validateIPInSubnet(ipToValidate, subnet.addressPrefix)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    } else if (updates.privateIpAddress && updates.privateIpAddress !== vm.privateIpAddress) {
      const subnet = findSubnetById(vm.subnetId)
      if (!subnet) {
        throw new Error('Subnet not found')
      }

      const validation = validateIPInSubnet(updates.privateIpAddress, subnet.addressPrefix)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    Object.assign(vm, updates)
    updateTimestamp()
    return vm
  }

  const deleteVM = (vmId: string): boolean => {
    const index = diagram.value.vms.findIndex(v => v.id === vmId)
    if (index === -1) return false

    diagram.value.vms.splice(index, 1)
    updateTimestamp()
    return true
  }

  const getVM = (vmId: string): AzureVM | null => {
    return diagram.value.vms.find(v => v.id === vmId) || null
  }

  const createRouteTable = (name: string, disableBgpRoutePropagation = false): RouteTable => {
    const routeTable: RouteTable = {
      id: crypto.randomUUID(),
      name,
      routes: [],
      disableBgpRoutePropagation
    }

    diagram.value.routeTables.push(routeTable)
    updateTimestamp()
    return routeTable
  }

  const updateRouteTable = (
    routeTableId: string,
    updates: Partial<Omit<RouteTable, 'id' | 'routes'>>
  ): RouteTable | null => {
    const routeTable = diagram.value.routeTables.find(rt => rt.id === routeTableId)
    if (!routeTable) return null

    Object.assign(routeTable, updates)
    updateTimestamp()
    return routeTable
  }

  const deleteRouteTable = (routeTableId: string): boolean => {
    const index = diagram.value.routeTables.findIndex(rt => rt.id === routeTableId)
    if (index === -1) return false

    diagram.value.virtualNetworks.forEach(vnet => {
      vnet.subnets.forEach(subnet => {
        if (subnet.routeTableId === routeTableId) {
          subnet.routeTableId = undefined
        }
      })
    })

    diagram.value.routeTables.splice(index, 1)
    updateTimestamp()
    return true
  }

  const getRouteTable = (routeTableId: string): RouteTable | null => {
    return diagram.value.routeTables.find(rt => rt.id === routeTableId) || null
  }

  const addRoute = (routeTableId: string, route: Omit<Route, 'id'>): Route | null => {
    const routeTable = diagram.value.routeTables.find(rt => rt.id === routeTableId)
    if (!routeTable) return null

    const validation = validateCIDR(route.addressPrefix)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const newRoute: Route = {
      ...route,
      id: crypto.randomUUID()
    }

    routeTable.routes.push(newRoute)
    updateTimestamp()
    return newRoute
  }

  const updateRoute = (
    routeTableId: string,
    routeId: string,
    updates: Partial<Omit<Route, 'id'>>
  ): Route | null => {
    const routeTable = diagram.value.routeTables.find(rt => rt.id === routeTableId)
    if (!routeTable) return null

    const route = routeTable.routes.find(r => r.id === routeId)
    if (!route) return null

    if (updates.addressPrefix && updates.addressPrefix !== route.addressPrefix) {
      const validation = validateCIDR(updates.addressPrefix)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    Object.assign(route, updates)
    updateTimestamp()
    return route
  }

  const deleteRoute = (routeTableId: string, routeId: string): boolean => {
    const routeTable = diagram.value.routeTables.find(rt => rt.id === routeTableId)
    if (!routeTable) return false

    const index = routeTable.routes.findIndex(r => r.id === routeId)
    if (index === -1) return false

    routeTable.routes.splice(index, 1)
    updateTimestamp()
    return true
  }

  const associateRouteTable = (vnetId: string, subnetId: string, routeTableId: string): boolean => {
    const subnet = getSubnet(vnetId, subnetId)
    if (!subnet) return false

    const routeTable = diagram.value.routeTables.find(rt => rt.id === routeTableId)
    if (!routeTable) return false

    subnet.routeTableId = routeTableId
    updateTimestamp()
    return true
  }

  const dissociateRouteTable = (vnetId: string, subnetId: string): boolean => {
    const subnet = getSubnet(vnetId, subnetId)
    if (!subnet) return false

    subnet.routeTableId = undefined
    updateTimestamp()
    return true
  }

  const validateCIDR = (cidr: string): ValidationResult => {
    const parsed = parseCIDR(cidr, 0, 32)
    if (!parsed) {
      return {
        valid: false,
        error: 'Invalid CIDR notation. Use format: 10.0.0.0/16'
      }
    }
    return { valid: true }
  }

  const validateSubnetCIDR = (subnetCidr: string, vnetAddressSpace: string[]): ValidationResult => {
    const subnetValidation = validateCIDR(subnetCidr)
    if (!subnetValidation.valid) {
      return subnetValidation
    }

    const subnetParsed = parseCIDR(subnetCidr, 0, 32)
    if (!subnetParsed) {
      return {
        valid: false,
        error: 'Invalid subnet CIDR notation'
      }
    }

    const subnetNetworkNum = ipToNumber(subnetParsed.ip) & (0xFFFFFFFF << (32 - subnetParsed.prefix))
    const subnetSize = Math.pow(2, 32 - subnetParsed.prefix)
    const subnetStart = subnetNetworkNum
    const subnetEnd = subnetNetworkNum + subnetSize - 1

    for (const vnetCidr of vnetAddressSpace) {
      const vnetParsed = parseCIDR(vnetCidr, 0, 32)
      if (!vnetParsed) continue

      const vnetNetworkNum = ipToNumber(vnetParsed.ip) & (0xFFFFFFFF << (32 - vnetParsed.prefix))
      const vnetSize = Math.pow(2, 32 - vnetParsed.prefix)
      const vnetStart = vnetNetworkNum
      const vnetEnd = vnetNetworkNum + vnetSize - 1

      if (subnetStart >= vnetStart && subnetEnd <= vnetEnd) {
        return { valid: true }
      }
    }

    return {
      valid: false,
      error: `Subnet ${subnetCidr} is not within VNet address space: ${vnetAddressSpace.join(', ')}`
    }
  }

  const validateIPInSubnet = (ipAddress: string, subnetCidr: string): ValidationResult => {
    const ip = parseIP(ipAddress)
    if (!ip) {
      return {
        valid: false,
        error: 'Invalid IP address format'
      }
    }

    const subnetParsed = parseCIDR(subnetCidr, 0, 32)
    if (!subnetParsed) {
      return {
        valid: false,
        error: 'Invalid subnet CIDR notation'
      }
    }

    const ipNum = ipToNumber(ip)
    const subnetNetworkNum = ipToNumber(subnetParsed.ip) & (0xFFFFFFFF << (32 - subnetParsed.prefix))
    const subnetSize = Math.pow(2, 32 - subnetParsed.prefix)
    const subnetEnd = subnetNetworkNum + subnetSize - 1

    if (ipNum < subnetNetworkNum || ipNum > subnetEnd) {
      return {
        valid: false,
        error: `IP address ${ipAddress} is not within subnet ${subnetCidr}`
      }
    }

    return { valid: true }
  }

  const calculateSubnetIPs = (subnetCidr: string, reservedIpCount = 5): {
    network: string
    totalIPs: number
    usableIPs: number
    reserved: string[]
    firstUsable: string
    lastUsable: string
  } | null => {
    const parsed = parseCIDR(subnetCidr, 0, 32)
    if (!parsed) return null

    const { ip, prefix } = parsed
    const subnetNetworkNum = ipToNumber(ip) & (0xFFFFFFFF << (32 - prefix))
    const subnetNetwork = numberToIP(subnetNetworkNum)
    const totalIPs = Math.pow(2, 32 - prefix)

    const reserved: string[] = []
    for (let j = 0; j < Math.ceil(reservedIpCount / 2); j++) {
      reserved.push(numberToIP(subnetNetworkNum + j).join('.'))
    }
    for (let j = Math.floor(reservedIpCount / 2); j > 0; j--) {
      reserved.push(numberToIP(subnetNetworkNum + totalIPs - j).join('.'))
    }

    const usableIPs = totalIPs - reservedIpCount
    const firstUsableOffset = Math.ceil(reservedIpCount / 2)
    const lastUsableOffset = Math.floor(reservedIpCount / 2) + 1

    const firstUsable = numberToIP(subnetNetworkNum + firstUsableOffset).join('.')
    const lastUsable = numberToIP(subnetNetworkNum + totalIPs - lastUsableOffset).join('.')

    return {
      network: subnetNetwork.join('.'),
      totalIPs,
      usableIPs,
      reserved,
      firstUsable,
      lastUsable
    }
  }

  const convertToTemplateData = (): TemplateData => {
    if (diagram.value.virtualNetworks.length === 0) {
      return {
        vnetCidr: '10.0.0.0/16',
        subnets: []
      }
    }

    const vnet = diagram.value.virtualNetworks[0]
    const vnetCidr = vnet.addressSpace[0] || '10.0.0.0/16'

    const subnets: Subnet[] = vnet.subnets.map(subnet => {
      const subnetInfo = calculateSubnetIPs(subnet.addressPrefix)
      if (!subnetInfo) {
        return {
          network: '0.0.0.0',
          cidr: subnet.addressPrefix,
          mask: '255.255.255.0',
          totalIPs: 256,
          usableIPs: 251,
          reserved: [],
          usableRange: '0.0.0.1 - 0.0.0.254'
        }
      }

      const parsed = parseCIDR(subnet.addressPrefix, 0, 32)
      const mask = parsed ? cidrToMask(parsed.prefix).join('.') : '255.255.255.0'

      return {
        network: subnetInfo.network,
        cidr: subnet.addressPrefix,
        mask: mask,
        totalIPs: subnetInfo.totalIPs,
        usableIPs: subnetInfo.usableIPs,
        reserved: subnetInfo.reserved,
        usableRange: `${subnetInfo.firstUsable} - ${subnetInfo.lastUsable}`,
        availabilityZone: `${vnet.location}-1`,
        region: vnet.location,
        availabilityDomain: `${vnet.location}-1`,
        zone: `${vnet.location}-1`
      }
    })

    return {
      vnetCidr,
      subnets
    }
  }

  const findSubnetById = (subnetId: string): AzureSubnet | null => {
    for (const vnet of diagram.value.virtualNetworks) {
      const subnet = vnet.subnets.find(s => s.id === subnetId)
      if (subnet) return subnet
    }
    return null
  }

  const getVMsBySubnet = (subnetId: string): AzureVM[] => {
    return diagram.value.vms.filter(vm => vm.subnetId === subnetId)
  }

  const getRouteTableAssociations = (routeTableId: string): AzureSubnet[] => {
    const associations: AzureSubnet[] = []
    for (const vnet of diagram.value.virtualNetworks) {
      for (const subnet of vnet.subnets) {
        if (subnet.routeTableId === routeTableId) {
          associations.push(subnet)
        }
      }
    }
    return associations
  }

  const totalVNets = computed(() => diagram.value.virtualNetworks.length)
  const totalSubnets = computed(() => 
    diagram.value.virtualNetworks.reduce((sum, vnet) => sum + vnet.subnets.length, 0)
  )
  const totalVMs = computed(() => diagram.value.vms.length)
  const totalRouteTables = computed(() => diagram.value.routeTables.length)

  return {
    diagram,
    createVNet,
    updateVNet,
    deleteVNet,
    getVNet,
    createSubnet,
    updateSubnet,
    deleteSubnet,
    getSubnet,
    createVM,
    updateVM,
    deleteVM,
    getVM,
    createRouteTable,
    updateRouteTable,
    deleteRouteTable,
    getRouteTable,
    addRoute,
    updateRoute,
    deleteRoute,
    associateRouteTable,
    dissociateRouteTable,
    validateCIDR,
    validateSubnetCIDR,
    validateIPInSubnet,
    calculateSubnetIPs,
    convertToTemplateData,
    findSubnetById,
    getVMsBySubnet,
    getRouteTableAssociations,
    totalVNets,
    totalSubnets,
    totalVMs,
    totalRouteTables
  }
}
