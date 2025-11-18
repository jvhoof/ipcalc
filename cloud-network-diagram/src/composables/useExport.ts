import type { Diagram, ExportOptions } from '@/types'
import { exportToDrawio } from '@/exporters/drawio'

export function useExport() {

  async function exportDiagram(
    diagram: Diagram,
    options: ExportOptions
  ): Promise<string | Blob> {
    switch (options.format) {
      case 'drawio':
        return exportToDrawio(diagram)

      case 'json':
        return JSON.stringify(diagram, null, 2)

      case 'svg':
        return exportToSvg(diagram, options)

      case 'png':
        return exportToPng(diagram, options)

      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  function exportToSvg(diagram: Diagram, options: ExportOptions): string {
    // Calculate bounds
    const bounds = calculateBounds(diagram)
    const padding = 20

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${bounds.width + padding * 2}"
     height="${bounds.height + padding * 2}"
     viewBox="${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}">
`

    // Add background if specified
    if (options.background) {
      svg += `  <rect x="${bounds.x - padding}" y="${bounds.y - padding}"
                     width="${bounds.width + padding * 2}" height="${bounds.height + padding * 2}"
                     fill="${options.background}"/>\n`
    }

    // Add connections first (so they appear behind nodes)
    for (const connection of diagram.connections) {
      const sourceNode = diagram.nodes.find(n => n.id === connection.source.nodeId)
      const targetNode = diagram.nodes.find(n => n.id === connection.target.nodeId)

      if (sourceNode && targetNode) {
        const sourcePos = getAnchorPosition(sourceNode, connection.source.position)
        const targetPos = getAnchorPosition(targetNode, connection.target.position)

        svg += `  <line x1="${sourcePos.x}" y1="${sourcePos.y}"
                       x2="${targetPos.x}" y2="${targetPos.y}"
                       stroke="${connection.style?.stroke || '#333'}"
                       stroke-width="${connection.style?.strokeWidth || 2}"
                       ${connection.style?.style === 'dashed' ? 'stroke-dasharray="5,5"' : ''}
                       marker-end="${connection.style?.targetArrow === 'arrow' ? 'url(#arrow)' : ''}"/>\n`
      }
    }

    // Add nodes
    for (const node of diagram.nodes) {
      const fill = node.style?.fill || '#ffffff'
      const stroke = node.style?.stroke || '#333333'

      svg += `  <g transform="translate(${node.position.x}, ${node.position.y})">
    <rect width="${node.size.width}" height="${node.size.height}"
          fill="${fill}" stroke="${stroke}" stroke-width="${node.style?.strokeWidth || 1}" rx="4"/>
    <text x="${node.size.width / 2}" y="${node.size.height / 2}"
          text-anchor="middle" dominant-baseline="middle"
          font-size="${node.style?.fontSize || 12}"
          fill="${node.style?.fontColor || '#333'}">${escapeXml(node.label)}</text>
  </g>\n`
    }

    // Add arrow marker definition
    svg += `  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3"
            orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#333"/>
    </marker>
  </defs>\n`

    svg += '</svg>'

    return svg
  }

  async function exportToPng(diagram: Diagram, options: ExportOptions): Promise<Blob> {
    const svg = exportToSvg(diagram, options)
    const scale = options.scale || 2

    return new Promise((resolve, reject) => {
      const img = new Image()
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Could not create PNG blob'))
          }
        }, 'image/png')
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Could not load SVG image'))
      }

      img.src = url
    })
  }

  function calculateBounds(diagram: Diagram): { x: number; y: number; width: number; height: number } {
    if (diagram.nodes.length === 0) {
      return { x: 0, y: 0, width: 800, height: 600 }
    }

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    for (const node of diagram.nodes) {
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + node.size.width)
      maxY = Math.max(maxY, node.position.y + node.size.height)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  function getAnchorPosition(
    node: { position: { x: number; y: number }; size: { width: number; height: number } },
    anchor: string
  ): { x: number; y: number } {
    const { x, y } = node.position
    const { width, height } = node.size

    switch (anchor) {
      case 'top':
        return { x: x + width / 2, y }
      case 'right':
        return { x: x + width, y: y + height / 2 }
      case 'bottom':
        return { x: x + width / 2, y: y + height }
      case 'left':
        return { x, y: y + height / 2 }
      case 'center':
      default:
        return { x: x + width / 2, y: y + height / 2 }
    }
  }

  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  function downloadFile(content: string | Blob, filename: string): void {
    const blob = typeof content === 'string'
      ? new Blob([content], { type: 'text/plain;charset=utf-8' })
      : content

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    exportDiagram,
    downloadFile
  }
}
