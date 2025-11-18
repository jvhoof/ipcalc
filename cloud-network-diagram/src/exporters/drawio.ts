import type { Diagram, DiagramNode, Connection, DrawioCell } from '@/types'

// Draw.io style mappings for cloud components
const nodeStyles: Record<string, string> = {
  // Azure styles
  'vnet': 'rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;',
  'subnet': 'rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;',
  'vm': 'shape=mxgraph.azure.virtual_machine;fillColor=#0078D4;strokeColor=#ffffff;',
  'load-balancer': 'shape=mxgraph.azure.load_balancer;fillColor=#0078D4;strokeColor=#ffffff;',
  'load-balancer-internal': 'shape=mxgraph.azure.load_balancer;fillColor=#0078D4;strokeColor=#ffffff;',
  'nat-gateway': 'shape=mxgraph.azure.nat;fillColor=#0078D4;strokeColor=#ffffff;',
  'nsg': 'shape=mxgraph.azure.network_security_group;fillColor=#0078D4;strokeColor=#ffffff;',
  'firewall': 'shape=mxgraph.azure.azure_firewall;fillColor=#0078D4;strokeColor=#ffffff;',
  'vpn-gateway': 'shape=mxgraph.azure.vpn_gateway;fillColor=#0078D4;strokeColor=#ffffff;',
  'storage': 'shape=mxgraph.azure.storage;fillColor=#0078D4;strokeColor=#ffffff;',
  'database': 'shape=mxgraph.azure.sql_database;fillColor=#0078D4;strokeColor=#ffffff;',

  // AWS styles
  'vpc': 'rounded=1;whiteSpace=wrap;html=1;fillColor=#E7F4E4;strokeColor=#7AA116;',
  'ec2': 'shape=mxgraph.aws4.ec2;fillColor=#ED7100;strokeColor=#ffffff;',
  'elb': 'shape=mxgraph.aws4.application_load_balancer;fillColor=#8C4FFF;strokeColor=#ffffff;',
  'alb': 'shape=mxgraph.aws4.application_load_balancer;fillColor=#8C4FFF;strokeColor=#ffffff;',
  'nlb': 'shape=mxgraph.aws4.network_load_balancer;fillColor=#8C4FFF;strokeColor=#ffffff;',
  's3': 'shape=mxgraph.aws4.s3;fillColor=#277116;strokeColor=#ffffff;',
  'rds': 'shape=mxgraph.aws4.rds;fillColor=#3334FF;strokeColor=#ffffff;',
  'security-group': 'shape=mxgraph.aws4.security_group;fillColor=#DD3522;strokeColor=#ffffff;',
  'internet-gateway': 'shape=mxgraph.aws4.internet_gateway;fillColor=#8C4FFF;strokeColor=#ffffff;',

  // GCP styles
  'compute-engine': 'shape=mxgraph.gcp2.compute_engine;fillColor=#4285F4;strokeColor=#ffffff;',
  'cloud-storage': 'shape=mxgraph.gcp2.cloud_storage;fillColor=#4285F4;strokeColor=#ffffff;',
  'cloud-sql': 'shape=mxgraph.gcp2.cloud_sql;fillColor=#4285F4;strokeColor=#ffffff;',
  'cloud-nat': 'shape=mxgraph.gcp2.cloud_nat;fillColor=#4285F4;strokeColor=#ffffff;',
  'cloud-vpn': 'shape=mxgraph.gcp2.cloud_vpn;fillColor=#4285F4;strokeColor=#ffffff;',

  // Generic/fallback
  'generic': 'rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;'
}

// Connection style mappings
const connectionStyles: Record<string, string> = {
  'solid': 'endArrow=classic;html=1;strokeWidth=2;',
  'dashed': 'endArrow=classic;html=1;strokeWidth=2;dashed=1;',
  'dotted': 'endArrow=classic;html=1;strokeWidth=2;dashed=1;dashPattern=1 2;'
}

export function exportToDrawio(diagram: Diagram): string {
  const cells: DrawioCell[] = []

  // Root cells required by draw.io
  cells.push({
    id: '0',
    value: '',
    style: '',
    parent: ''
  })

  cells.push({
    id: '1',
    value: '',
    style: '',
    parent: '0'
  })

  // Process nodes - sort by parentId to ensure parents come before children
  const sortedNodes = [...diagram.nodes].sort((a, b) => {
    if (!a.parentId && b.parentId) return -1
    if (a.parentId && !b.parentId) return 1
    return 0
  })

  for (const node of sortedNodes) {
    const cell = nodeToDrawioCell(node)
    cells.push(cell)
  }

  // Process connections
  for (const connection of diagram.connections) {
    const cell = connectionToDrawioCell(connection, diagram.nodes)
    cells.push(cell)
  }

  // Generate XML
  return generateDrawioXml(cells, diagram.name)
}

function nodeToDrawioCell(node: DiagramNode): DrawioCell {
  let style = nodeStyles[node.type] || nodeStyles['generic']

  // Apply custom styles
  if (node.style) {
    if (node.style.fill) {
      style += `fillColor=${node.style.fill};`
    }
    if (node.style.stroke) {
      style += `strokeColor=${node.style.stroke};`
    }
    if (node.style.strokeWidth) {
      style += `strokeWidth=${node.style.strokeWidth};`
    }
    if (node.style.opacity !== undefined) {
      style += `opacity=${node.style.opacity * 100};`
    }
  }

  return {
    id: node.id,
    value: node.label,
    style,
    vertex: true,
    parent: node.parentId || '1',
    geometry: {
      x: node.position.x,
      y: node.position.y,
      width: node.size.width,
      height: node.size.height
    }
  }
}

function connectionToDrawioCell(connection: Connection, nodes: DiagramNode[]): DrawioCell {
  let style = connectionStyles[connection.style?.style || 'solid']

  // Apply custom stroke color
  if (connection.style?.stroke) {
    style += `strokeColor=${connection.style.stroke};`
  }

  // Apply stroke width
  if (connection.style?.strokeWidth) {
    style += `strokeWidth=${connection.style.strokeWidth};`
  }

  // Handle arrow types
  if (connection.style?.sourceArrow === 'arrow') {
    style += 'startArrow=classic;startFill=1;'
  }

  if (connection.style?.targetArrow === 'none') {
    style = style.replace('endArrow=classic;', 'endArrow=none;')
  }

  // Calculate entry/exit points based on anchor positions
  const exitPoint = getExitPoint(connection.source.position)
  const entryPoint = getEntryPoint(connection.target.position)

  style += `exitX=${exitPoint.x};exitY=${exitPoint.y};exitDx=0;exitDy=0;`
  style += `entryX=${entryPoint.x};entryY=${entryPoint.y};entryDx=0;entryDy=0;`

  const cell: DrawioCell = {
    id: connection.id,
    value: connection.label || '',
    style,
    edge: true,
    parent: '1',
    source: connection.source.nodeId,
    target: connection.target.nodeId
  }

  // Add waypoints if present
  if (connection.waypoints && connection.waypoints.length > 0) {
    cell.geometry = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      relative: true,
      points: connection.waypoints.map(p => ({ x: p.x, y: p.y }))
    }
  }

  return cell
}

function getExitPoint(anchor: string): { x: number; y: number } {
  switch (anchor) {
    case 'top': return { x: 0.5, y: 0 }
    case 'right': return { x: 1, y: 0.5 }
    case 'bottom': return { x: 0.5, y: 1 }
    case 'left': return { x: 0, y: 0.5 }
    case 'center': return { x: 0.5, y: 0.5 }
    default: return { x: 0.5, y: 0.5 }
  }
}

function getEntryPoint(anchor: string): { x: number; y: number } {
  return getExitPoint(anchor)
}

function generateDrawioXml(cells: DrawioCell[], diagramName: string): string {
  const cellsXml = cells.map(cell => cellToXml(cell)).join('\n      ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="cloud-network-diagram" version="1.0.0">
  <diagram id="diagram-1" name="${escapeXml(diagramName)}">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827">
      <root>
      ${cellsXml}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`
}

function cellToXml(cell: DrawioCell): string {
  const attrs: string[] = [
    `id="${escapeXml(cell.id)}"`,
    `value="${escapeXml(cell.value)}"`
  ]

  if (cell.style) {
    attrs.push(`style="${escapeXml(cell.style)}"`)
  }

  if (cell.vertex) {
    attrs.push('vertex="1"')
  }

  if (cell.edge) {
    attrs.push('edge="1"')
  }

  if (cell.parent) {
    attrs.push(`parent="${escapeXml(cell.parent)}"`)
  }

  if (cell.source) {
    attrs.push(`source="${escapeXml(cell.source)}"`)
  }

  if (cell.target) {
    attrs.push(`target="${escapeXml(cell.target)}"`)
  }

  if (cell.geometry) {
    const geo = cell.geometry
    let geoAttrs = `x="${geo.x}" y="${geo.y}" width="${geo.width}" height="${geo.height}"`

    if (geo.relative) {
      geoAttrs += ' relative="1"'
    }

    let pointsXml = ''
    if (geo.points && geo.points.length > 0) {
      const points = geo.points.map(p => `<mxPoint x="${p.x}" y="${p.y}"/>`).join('')
      pointsXml = `<Array as="points">${points}</Array>`
    }

    return `<mxCell ${attrs.join(' ')}>
          <mxGeometry ${geoAttrs} as="geometry">${pointsXml}</mxGeometry>
        </mxCell>`
  }

  return `<mxCell ${attrs.join(' ')}/>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
