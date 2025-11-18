import type { ProviderConfig, NodeDefinition } from '@/types'

export const gcpNodes: NodeDefinition[] = [
  {
    type: 'vpc',
    label: 'VPC Network',
    icon: 'vpc',
    defaultSize: { width: 400, height: 300 },
    isContainer: true,
    allowedChildren: ['subnet'],
    style: { fill: '#E8F0FE', stroke: '#4285F4' }
  },
  {
    type: 'subnet',
    label: 'Subnet',
    icon: 'subnet',
    defaultSize: { width: 300, height: 200 },
    isContainer: true,
    allowedChildren: ['compute-engine', 'load-balancer', 'cloud-nat', 'cloud-sql'],
    style: { fill: '#FEF7E0', stroke: '#F9AB00' }
  },
  {
    type: 'compute-engine',
    label: 'Compute Engine',
    icon: 'compute-engine',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#4285F4', stroke: '#3367D6' }
  },
  {
    type: 'load-balancer',
    label: 'Cloud Load Balancing',
    icon: 'load-balancer',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#4285F4', stroke: '#3367D6' }
  },
  {
    type: 'cloud-nat',
    label: 'Cloud NAT',
    icon: 'cloud-nat',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#4285F4', stroke: '#3367D6' }
  },
  {
    type: 'firewall-rule',
    label: 'Firewall Rule',
    icon: 'firewall-rule',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#EA4335', stroke: '#C5221F' }
  },
  {
    type: 'cloud-vpn',
    label: 'Cloud VPN',
    icon: 'cloud-vpn',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#4285F4', stroke: '#3367D6' }
  },
  {
    type: 'cloud-storage',
    label: 'Cloud Storage',
    icon: 'cloud-storage',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#4285F4', stroke: '#3367D6' }
  },
  {
    type: 'cloud-sql',
    label: 'Cloud SQL',
    icon: 'cloud-sql',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#4285F4', stroke: '#3367D6' }
  }
]

export const gcpConfig: ProviderConfig = {
  name: 'Google Cloud Platform',
  provider: 'gcp',
  nodes: gcpNodes,
  colors: {
    primary: '#4285F4',
    secondary: '#34A853',
    accent: '#FBBC05'
  }
}
