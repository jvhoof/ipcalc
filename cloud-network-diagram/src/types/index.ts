// Cloud providers
export type CloudProvider = 'azure' | 'aws' | 'gcp'

// Node types by provider
export type AzureNodeType =
  | 'vnet'
  | 'subnet'
  | 'vm'
  | 'load-balancer'
  | 'load-balancer-internal'
  | 'nat-gateway'
  | 'nsg'
  | 'application-gateway'
  | 'firewall'
  | 'vpn-gateway'
  | 'express-route'
  | 'storage'
  | 'database'

export type AwsNodeType =
  | 'vpc'
  | 'subnet'
  | 'ec2'
  | 'elb'
  | 'alb'
  | 'nlb'
  | 'nat-gateway'
  | 'security-group'
  | 'internet-gateway'
  | 'vpn-gateway'
  | 's3'
  | 'rds'

export type GcpNodeType =
  | 'vpc'
  | 'subnet'
  | 'compute-engine'
  | 'load-balancer'
  | 'cloud-nat'
  | 'firewall-rule'
  | 'cloud-vpn'
  | 'cloud-storage'
  | 'cloud-sql'

export type NodeType = AzureNodeType | AwsNodeType | GcpNodeType | 'generic'

// Position and dimensions
export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Bounds extends Position, Size {}

// Connection anchor points
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left' | 'center'

export interface Anchor {
  nodeId: string
  position: AnchorPosition
}

// Node properties
export interface NodeStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  fontSize?: number
  fontColor?: string
}

export interface DiagramNode {
  id: string
  type: NodeType
  provider: CloudProvider
  label: string
  position: Position
  size: Size
  parentId?: string  // For nested nodes (e.g., VM inside subnet)
  style?: NodeStyle
  properties?: Record<string, unknown>
  locked?: boolean
  visible?: boolean
}

// Connection properties
export type ConnectionStyle = 'solid' | 'dashed' | 'dotted'
export type ArrowType = 'none' | 'arrow' | 'diamond' | 'circle'

export interface ConnectionLineStyle {
  stroke?: string
  strokeWidth?: number
  style?: ConnectionStyle
  sourceArrow?: ArrowType
  targetArrow?: ArrowType
}

export interface Connection {
  id: string
  source: Anchor
  target: Anchor
  label?: string
  style?: ConnectionLineStyle
  waypoints?: Position[]  // For routing lines
}

// Diagram state
export interface Diagram {
  id: string
  name: string
  provider: CloudProvider
  nodes: DiagramNode[]
  connections: Connection[]
  metadata?: {
    created?: string
    modified?: string
    author?: string
    description?: string
  }
}

// Canvas state
export interface CanvasState {
  zoom: number
  panX: number
  panY: number
  gridSize: number
  showGrid: boolean
  snapToGrid: boolean
}

// Selection state
export interface SelectionState {
  selectedNodes: string[]
  selectedConnections: string[]
}

// Tool types
export type ToolType = 'select' | 'pan' | 'connect' | 'text'

// Events
export interface NodeDragEvent {
  nodeId: string
  position: Position
  delta: Position
}

export interface NodeResizeEvent {
  nodeId: string
  size: Size
  position: Position
}

export interface ConnectionEvent {
  connectionId: string
  source: Anchor
  target: Anchor
}

// Export options
export interface ExportOptions {
  format: 'drawio' | 'svg' | 'png' | 'json'
  includeGrid?: boolean
  background?: string
  scale?: number
}

// Draw.io specific types
export interface DrawioCell {
  id: string
  value: string
  style: string
  vertex?: boolean
  edge?: boolean
  parent: string
  source?: string
  target?: string
  geometry?: {
    x: number
    y: number
    width: number
    height: number
    relative?: boolean
    points?: Array<{ x: number; y: number }>
  }
}

// Component props
export interface CloudCanvasProps {
  modelValue: Diagram
  width?: number
  height?: number
  readonly?: boolean
  showToolbar?: boolean
  showProperties?: boolean
}

// Provider node definition
export interface NodeDefinition {
  type: NodeType
  label: string
  icon: string
  defaultSize: Size
  isContainer: boolean
  allowedChildren?: NodeType[]
  style?: NodeStyle
}

// Provider configuration
export interface ProviderConfig {
  name: string
  provider: CloudProvider
  nodes: NodeDefinition[]
  colors: {
    primary: string
    secondary: string
    accent: string
  }
}

// Custom shape types
export interface CustomShape {
  id: string
  name: string
  style: string
  width: number
  height: number
  icon?: string
}

export interface ShapeLibrary {
  id: string
  name: string
  shapes: CustomShape[]
}

// Import options
export interface ImportOptions {
  provider?: CloudProvider
  mergeWithCurrent?: boolean
  offsetX?: number
  offsetY?: number
}
