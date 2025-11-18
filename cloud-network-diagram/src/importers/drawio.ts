import type { Diagram, DiagramNode, Connection, CloudProvider, NodeType, AnchorPosition } from '@/types'

interface MxCell {
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

interface ParsedDrawio {
  name: string
  cells: MxCell[]
}

// Style to node type mapping (reverse of export)
const styleToNodeType: Record<string, NodeType> = {
  'mxgraph.azure.virtual_machine': 'vm',
  'mxgraph.azure.load_balancer': 'load-balancer',
  'mxgraph.azure.nat': 'nat-gateway',
  'mxgraph.azure.network_security_group': 'nsg',
  'mxgraph.azure.azure_firewall': 'firewall',
  'mxgraph.azure.vpn_gateway': 'vpn-gateway',
  'mxgraph.azure.storage': 'storage',
  'mxgraph.azure.sql_database': 'database',
  'mxgraph.aws4.ec2': 'ec2',
  'mxgraph.aws4.application_load_balancer': 'alb',
  'mxgraph.aws4.network_load_balancer': 'nlb',
  'mxgraph.aws4.s3': 's3',
  'mxgraph.aws4.rds': 'rds',
  'mxgraph.aws4.security_group': 'security-group',
  'mxgraph.aws4.internet_gateway': 'internet-gateway',
  'mxgraph.gcp2.compute_engine': 'compute-engine',
  'mxgraph.gcp2.cloud_storage': 'cloud-storage',
  'mxgraph.gcp2.cloud_sql': 'cloud-sql',
  'mxgraph.gcp2.cloud_nat': 'cloud-nat',
  'mxgraph.gcp2.cloud_vpn': 'cloud-vpn'
}

export function importFromDrawio(
  xmlContent: string,
  provider: CloudProvider = 'azure'
): Diagram {
  const parsed = parseDrawioXml(xmlContent)

  const nodes: DiagramNode[] = []
  const connections: Connection[] = []

  // Process cells
  for (const cell of parsed.cells) {
    // Skip root cells
    if (cell.id === '0' || cell.id === '1') continue

    if (cell.vertex && cell.geometry) {
      const node = cellToNode(cell, provider)
      nodes.push(node)
    } else if (cell.edge) {
      const connection = cellToConnection(cell)
      if (connection) {
        connections.push(connection)
      }
    }
  }

  return {
    id: `imported-${Date.now()}`,
    name: parsed.name || 'Imported Diagram',
    provider,
    nodes,
    connections,
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      description: 'Imported from draw.io'
    }
  }
}

function parseDrawioXml(xmlContent: string): ParsedDrawio {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlContent, 'text/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Invalid XML format')
  }

  // Get diagram name
  const diagramEl = doc.querySelector('diagram')
  const name = diagramEl?.getAttribute('name') || 'Imported Diagram'

  // Get all mxCell elements
  const cellElements = doc.querySelectorAll('mxCell')
  const cells: MxCell[] = []

  cellElements.forEach(cellEl => {
    const cell: MxCell = {
      id: cellEl.getAttribute('id') || '',
      value: cellEl.getAttribute('value') || '',
      style: cellEl.getAttribute('style') || '',
      vertex: cellEl.getAttribute('vertex') === '1',
      edge: cellEl.getAttribute('edge') === '1',
      parent: cellEl.getAttribute('parent') || '1',
      source: cellEl.getAttribute('source') || undefined,
      target: cellEl.getAttribute('target') || undefined
    }

    // Parse geometry
    const geoEl = cellEl.querySelector('mxGeometry')
    if (geoEl) {
      cell.geometry = {
        x: parseFloat(geoEl.getAttribute('x') || '0'),
        y: parseFloat(geoEl.getAttribute('y') || '0'),
        width: parseFloat(geoEl.getAttribute('width') || '100'),
        height: parseFloat(geoEl.getAttribute('height') || '100'),
        relative: geoEl.getAttribute('relative') === '1'
      }

      // Parse waypoints
      const pointElements = geoEl.querySelectorAll('mxPoint')
      if (pointElements.length > 0) {
        cell.geometry.points = []
        pointElements.forEach(pointEl => {
          cell.geometry!.points!.push({
            x: parseFloat(pointEl.getAttribute('x') || '0'),
            y: parseFloat(pointEl.getAttribute('y') || '0')
          })
        })
      }
    }

    cells.push(cell)
  })

  return { name, cells }
}

function cellToNode(cell: MxCell, provider: CloudProvider): DiagramNode {
  const style = parseStyle(cell.style)
  const nodeType = detectNodeType(style, provider)

  return {
    id: cell.id,
    type: nodeType,
    provider,
    label: cell.value || nodeType,
    position: {
      x: cell.geometry?.x || 0,
      y: cell.geometry?.y || 0
    },
    size: {
      width: cell.geometry?.width || 100,
      height: cell.geometry?.height || 100
    },
    parentId: cell.parent !== '1' ? cell.parent : undefined,
    style: {
      fill: style.fillColor || '#ffffff',
      stroke: style.strokeColor || '#333333',
      strokeWidth: parseInt(style.strokeWidth || '1', 10),
      opacity: style.opacity ? parseInt(style.opacity, 10) / 100 : 1
    },
    properties: {
      originalStyle: cell.style // Preserve original style for custom shapes
    }
  }
}

function cellToConnection(cell: MxCell): Connection | null {
  if (!cell.source || !cell.target) return null

  const style = parseStyle(cell.style)

  // Determine anchor positions from style
  const sourceAnchor = getAnchorFromStyle(style, 'exit')
  const targetAnchor = getAnchorFromStyle(style, 'entry')

  return {
    id: cell.id,
    source: {
      nodeId: cell.source,
      position: sourceAnchor
    },
    target: {
      nodeId: cell.target,
      position: targetAnchor
    },
    label: cell.value || undefined,
    style: {
      stroke: style.strokeColor || '#333',
      strokeWidth: parseInt(style.strokeWidth || '2', 10),
      style: style.dashed === '1' ? 'dashed' : 'solid',
      sourceArrow: style.startArrow === 'classic' ? 'arrow' : 'none',
      targetArrow: style.endArrow === 'none' ? 'none' : 'arrow'
    },
    waypoints: cell.geometry?.points
  }
}

function parseStyle(styleString: string): Record<string, string> {
  const style: Record<string, string> = {}

  if (!styleString) return style

  const parts = styleString.split(';')
  for (const part of parts) {
    if (part.includes('=')) {
      const [key, value] = part.split('=')
      style[key.trim()] = value.trim()
    } else if (part.trim()) {
      // Shape name without value
      style.shape = part.trim()
    }
  }

  return style
}

function detectNodeType(style: Record<string, string>, provider: CloudProvider): NodeType {
  // Check for known shape patterns
  const shape = style.shape || ''

  for (const [pattern, nodeType] of Object.entries(styleToNodeType)) {
    if (shape.includes(pattern)) {
      return nodeType
    }
  }

  // Detect container types by style
  const fillColor = (style.fillColor || '').toLowerCase()

  if (provider === 'azure') {
    if (fillColor.includes('dae8fc') || fillColor.includes('e6f2ff')) return 'vnet'
    if (fillColor.includes('fff2cc') || fillColor.includes('fff4e6')) return 'subnet'
  } else if (provider === 'aws') {
    if (fillColor.includes('e7f4e4')) return 'vpc'
    if (fillColor.includes('e6f3ff')) return 'subnet'
  } else if (provider === 'gcp') {
    if (fillColor.includes('e8f0fe')) return 'vpc'
    if (fillColor.includes('fef7e0')) return 'subnet'
  }

  return 'generic'
}

function getAnchorFromStyle(
  style: Record<string, string>,
  prefix: 'exit' | 'entry'
): AnchorPosition {
  const x = parseFloat(style[`${prefix}X`] || '0.5')
  const y = parseFloat(style[`${prefix}Y`] || '0.5')

  if (y === 0) return 'top'
  if (y === 1) return 'bottom'
  if (x === 0) return 'left'
  if (x === 1) return 'right'

  return 'center'
}

// Import custom shape library
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

export function importShapeLibrary(xmlContent: string): ShapeLibrary {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlContent, 'text/xml')

  const libraryEl = doc.querySelector('mxlibrary')
  if (!libraryEl) {
    throw new Error('Invalid shape library format')
  }

  const libraryName = libraryEl.getAttribute('name') || 'Custom Library'
  const shapes: CustomShape[] = []

  // Parse JSON content if present (draw.io library format)
  const content = libraryEl.textContent?.trim()
  if (content) {
    try {
      const shapeData = JSON.parse(content)
      if (Array.isArray(shapeData)) {
        shapeData.forEach((item: { xml?: string; w?: number; h?: number; title?: string }, index: number) => {
          if (item.xml) {
            // Decode the XML
            const shapeXml = decodeURIComponent(item.xml)
            const shapeDoc = parser.parseFromString(shapeXml, 'text/xml')
            const cellEl = shapeDoc.querySelector('mxCell')

            if (cellEl) {
              shapes.push({
                id: `custom-${index}`,
                name: item.title || `Shape ${index + 1}`,
                style: cellEl.getAttribute('style') || '',
                width: item.w || 100,
                height: item.h || 100
              })
            }
          }
        })
      }
    } catch {
      // Not JSON format, try XML format
    }
  }

  // Also parse direct mxCell elements
  const cellElements = doc.querySelectorAll('mxCell[vertex="1"]')
  cellElements.forEach((cellEl, index) => {
    const geoEl = cellEl.querySelector('mxGeometry')
    shapes.push({
      id: `custom-${shapes.length + index}`,
      name: cellEl.getAttribute('value') || `Shape ${shapes.length + index + 1}`,
      style: cellEl.getAttribute('style') || '',
      width: parseFloat(geoEl?.getAttribute('width') || '100'),
      height: parseFloat(geoEl?.getAttribute('height') || '100')
    })
  })

  return {
    id: `library-${Date.now()}`,
    name: libraryName,
    shapes
  }
}

// Parse a .drawio file which may be compressed
export async function parseDrawioFile(file: File): Promise<string> {
  const content = await file.text()

  // Check if it's compressed (starts with <mxfile> with compressed content)
  if (content.includes('compressed="true"')) {
    // Find the diagram content
    const match = content.match(/<diagram[^>]*>(.*?)<\/diagram>/s)
    if (match && match[1]) {
      // Decompress using pako or similar
      // For now, we'll just extract uncompressed content
      try {
        const decoded = atob(match[1])
        const inflated = pako_inflate(decoded)
        return new TextDecoder().decode(inflated)
      } catch {
        // Return as-is if decompression fails
        return content
      }
    }
  }

  return content
}

// Simple inflate function (for compressed draw.io files)
function pako_inflate(data: string): Uint8Array {
  // This is a simplified version - in production, use the pako library
  // For now, we'll handle uncompressed files only
  const bytes = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) {
    bytes[i] = data.charCodeAt(i)
  }
  return bytes
}
