import type { ProviderConfig, NodeDefinition } from '@/types'

export const awsNodes: NodeDefinition[] = [
  {
    type: 'vpc',
    label: 'VPC',
    icon: 'vpc',
    defaultSize: { width: 400, height: 300 },
    isContainer: true,
    allowedChildren: ['subnet'],
    style: { fill: '#E7F4E4', stroke: '#7AA116' }
  },
  {
    type: 'subnet',
    label: 'Subnet',
    icon: 'subnet',
    defaultSize: { width: 300, height: 200 },
    isContainer: true,
    allowedChildren: ['ec2', 'elb', 'alb', 'nlb', 'nat-gateway', 'rds'],
    style: { fill: '#E6F3FF', stroke: '#147EB4' }
  },
  {
    type: 'ec2',
    label: 'EC2 Instance',
    icon: 'ec2',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#ED7100', stroke: '#c45f00' }
  },
  {
    type: 'elb',
    label: 'Elastic Load Balancer',
    icon: 'elb',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#8C4FFF', stroke: '#6b3dcc' }
  },
  {
    type: 'alb',
    label: 'Application Load Balancer',
    icon: 'alb',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#8C4FFF', stroke: '#6b3dcc' }
  },
  {
    type: 'nlb',
    label: 'Network Load Balancer',
    icon: 'nlb',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#8C4FFF', stroke: '#6b3dcc' }
  },
  {
    type: 'nat-gateway',
    label: 'NAT Gateway',
    icon: 'nat-gateway',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#8C4FFF', stroke: '#6b3dcc' }
  },
  {
    type: 'security-group',
    label: 'Security Group',
    icon: 'security-group',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#DD3522', stroke: '#b02b1b' }
  },
  {
    type: 'internet-gateway',
    label: 'Internet Gateway',
    icon: 'internet-gateway',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#8C4FFF', stroke: '#6b3dcc' }
  },
  {
    type: 'vpn-gateway',
    label: 'VPN Gateway',
    icon: 'vpn-gateway',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#8C4FFF', stroke: '#6b3dcc' }
  },
  {
    type: 's3',
    label: 'S3 Bucket',
    icon: 's3',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#277116', stroke: '#1d5510' }
  },
  {
    type: 'rds',
    label: 'RDS Database',
    icon: 'rds',
    defaultSize: { width: 80, height: 80 },
    isContainer: false,
    style: { fill: '#3334FF', stroke: '#2829cc' }
  }
]

export const awsConfig: ProviderConfig = {
  name: 'Amazon Web Services',
  provider: 'aws',
  nodes: awsNodes,
  colors: {
    primary: '#FF9900',
    secondary: '#232F3E',
    accent: '#1A73E8'
  }
}
