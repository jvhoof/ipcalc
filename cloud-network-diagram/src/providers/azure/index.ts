import type { ProviderConfig, NodeDefinition } from '@/types'

export const azureNodes: NodeDefinition[] = [
  {
    type: 'vnet',
    label: 'Virtual Network',
    icon: 'vnet',
    defaultSize: { width: 400, height: 300 },
    isContainer: true,
    allowedChildren: ['subnet'],
    style: { fill: '#e6f2ff', stroke: '#0078D4' }
  },
  {
    type: 'subnet',
    label: 'Subnet',
    icon: 'subnet',
    defaultSize: { width: 300, height: 200 },
    isContainer: true,
    allowedChildren: ['vm', 'load-balancer', 'load-balancer-internal', 'firewall', 'nat-gateway'],
    style: { fill: '#fff4e6', stroke: '#f59f00' }
  },
  {
    type: 'vm',
    label: 'Virtual Machine',
    icon: 'vm',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'load-balancer',
    label: 'Load Balancer',
    icon: 'load-balancer',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'load-balancer-internal',
    label: 'Internal Load Balancer',
    icon: 'load-balancer-internal',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'nat-gateway',
    label: 'NAT Gateway',
    icon: 'nat-gateway',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'nsg',
    label: 'Network Security Group',
    icon: 'nsg',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'application-gateway',
    label: 'Application Gateway',
    icon: 'application-gateway',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'firewall',
    label: 'Azure Firewall',
    icon: 'firewall',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'vpn-gateway',
    label: 'VPN Gateway',
    icon: 'vpn-gateway',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'express-route',
    label: 'ExpressRoute',
    icon: 'express-route',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'storage',
    label: 'Storage Account',
    icon: 'storage',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  },
  {
    type: 'database',
    label: 'SQL Database',
    icon: 'database',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#0078D4', stroke: '#005a9e' }
  }
]

export const azureConfig: ProviderConfig = {
  name: 'Microsoft Azure',
  provider: 'azure',
  nodes: azureNodes,
  colors: {
    primary: '#0078D4',
    secondary: '#50e6ff',
    accent: '#773adc'
  }
}
