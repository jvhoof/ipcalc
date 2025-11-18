import { ref } from 'vue'
import type { Diagram, ShapeLibrary, CloudProvider, ImportOptions, CustomShape } from '@/types'
import { importFromDrawio, importShapeLibrary } from '@/importers/drawio'

export function useImport() {
  const isImporting = ref(false)
  const importError = ref<string | null>(null)
  const customLibraries = ref<ShapeLibrary[]>([])

  // Import a draw.io diagram file
  async function importDiagram(
    file: File,
    options: ImportOptions = {}
  ): Promise<Diagram> {
    isImporting.value = true
    importError.value = null

    try {
      const content = await file.text()
      const diagram = importFromDrawio(content, options.provider || 'azure')

      // Apply offset if specified
      if (options.offsetX || options.offsetY) {
        diagram.nodes.forEach(node => {
          node.position.x += options.offsetX || 0
          node.position.y += options.offsetY || 0
        })
      }

      return diagram
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import diagram'
      importError.value = message
      throw new Error(message)
    } finally {
      isImporting.value = false
    }
  }

  // Import a shape library
  async function importLibrary(file: File): Promise<ShapeLibrary> {
    isImporting.value = true
    importError.value = null

    try {
      const content = await file.text()
      const library = importShapeLibrary(content)

      // Add to custom libraries
      customLibraries.value.push(library)

      return library
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import library'
      importError.value = message
      throw new Error(message)
    } finally {
      isImporting.value = false
    }
  }

  // Remove a custom library
  function removeLibrary(libraryId: string): void {
    customLibraries.value = customLibraries.value.filter(lib => lib.id !== libraryId)
  }

  // Get all custom shapes from all libraries
  function getAllCustomShapes(): CustomShape[] {
    return customLibraries.value.flatMap(lib => lib.shapes)
  }

  // Create a file input and trigger file selection
  function selectFile(
    accept: string = '.drawio,.xml'
  ): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept
      input.style.display = 'none'

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0] || null
        document.body.removeChild(input)
        resolve(file)
      }

      input.oncancel = () => {
        document.body.removeChild(input)
        resolve(null)
      }

      document.body.appendChild(input)
      input.click()
    })
  }

  // Import diagram from file picker
  async function importDiagramFromFile(
    options: ImportOptions = {}
  ): Promise<Diagram | null> {
    const file = await selectFile('.drawio,.xml')
    if (!file) return null

    return importDiagram(file, options)
  }

  // Import library from file picker
  async function importLibraryFromFile(): Promise<ShapeLibrary | null> {
    const file = await selectFile('.xml')
    if (!file) return null

    return importLibrary(file)
  }

  // Import from JSON
  function importFromJson(jsonContent: string): Diagram {
    try {
      const diagram = JSON.parse(jsonContent) as Diagram

      // Validate required fields
      if (!diagram.id || !diagram.provider || !Array.isArray(diagram.nodes)) {
        throw new Error('Invalid diagram format')
      }

      return diagram
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse JSON'
      importError.value = message
      throw new Error(message)
    }
  }

  // Merge imported diagram with existing
  function mergeDiagrams(
    existing: Diagram,
    imported: Diagram,
    offsetX: number = 100,
    offsetY: number = 100
  ): Diagram {
    // Generate new IDs to avoid conflicts
    const idMap = new Map<string, string>()

    const newNodes = imported.nodes.map(node => {
      const newId = `${node.id}-${Date.now()}`
      idMap.set(node.id, newId)

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY
        },
        parentId: node.parentId ? idMap.get(node.parentId) || node.parentId : undefined
      }
    })

    const newConnections = imported.connections.map(conn => ({
      ...conn,
      id: `${conn.id}-${Date.now()}`,
      source: {
        ...conn.source,
        nodeId: idMap.get(conn.source.nodeId) || conn.source.nodeId
      },
      target: {
        ...conn.target,
        nodeId: idMap.get(conn.target.nodeId) || conn.target.nodeId
      }
    }))

    return {
      ...existing,
      nodes: [...existing.nodes, ...newNodes],
      connections: [...existing.connections, ...newConnections],
      metadata: {
        ...existing.metadata,
        modified: new Date().toISOString()
      }
    }
  }

  return {
    // State
    isImporting,
    importError,
    customLibraries,

    // Methods
    importDiagram,
    importLibrary,
    removeLibrary,
    getAllCustomShapes,
    selectFile,
    importDiagramFromFile,
    importLibraryFromFile,
    importFromJson,
    mergeDiagrams
  }
}
