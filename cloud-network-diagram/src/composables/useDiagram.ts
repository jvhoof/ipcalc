import { ref, computed, watch } from 'vue'
import type {
  Diagram,
  DiagramNode,
  Connection,
  Position,
  Size,
  CanvasState,
  SelectionState,
  ToolType,
  Anchor
} from '@/types'

export function useDiagram(initialDiagram?: Diagram) {
  // Core diagram state
  const diagram = ref<Diagram>(initialDiagram || {
    id: generateId(),
    name: 'Untitled Diagram',
    provider: 'azure',
    nodes: [],
    connections: [],
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }
  })

  // Canvas state
  const canvasState = ref<CanvasState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    gridSize: 20,
    showGrid: true,
    snapToGrid: true
  })

  // Selection state
  const selection = ref<SelectionState>({
    selectedNodes: [],
    selectedConnections: []
  })

  // Current tool
  const currentTool = ref<ToolType>('select')

  // Undo/redo history
  const history = ref<string[]>([])
  const historyIndex = ref(-1)
  const maxHistory = 50

  // Helper to generate unique IDs
  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Save state to history
  function saveToHistory(): void {
    const state = JSON.stringify(diagram.value)

    // Remove any redo states
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    history.value.push(state)

    // Limit history size
    if (history.value.length > maxHistory) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  // Undo
  function undo(): void {
    if (historyIndex.value > 0) {
      historyIndex.value--
      diagram.value = JSON.parse(history.value[historyIndex.value])
    }
  }

  // Redo
  function redo(): void {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      diagram.value = JSON.parse(history.value[historyIndex.value])
    }
  }

  // Node operations
  function addNode(node: Omit<DiagramNode, 'id'>): string {
    const id = generateId()
    const newNode: DiagramNode = {
      ...node,
      id,
      visible: true,
      locked: false
    }

    // Snap to grid if enabled
    if (canvasState.value.snapToGrid) {
      newNode.position = snapToGrid(newNode.position)
    }

    diagram.value.nodes.push(newNode)
    saveToHistory()

    return id
  }

  function updateNode(id: string, updates: Partial<DiagramNode>): void {
    const index = diagram.value.nodes.findIndex(n => n.id === id)
    if (index !== -1) {
      diagram.value.nodes[index] = {
        ...diagram.value.nodes[index],
        ...updates
      }
      diagram.value.metadata!.modified = new Date().toISOString()
      saveToHistory()
    }
  }

  function removeNode(id: string): void {
    // Remove the node
    diagram.value.nodes = diagram.value.nodes.filter(n => n.id !== id)

    // Remove any connections to/from this node
    diagram.value.connections = diagram.value.connections.filter(
      c => c.source.nodeId !== id && c.target.nodeId !== id
    )

    // Remove from selection
    selection.value.selectedNodes = selection.value.selectedNodes.filter(nid => nid !== id)

    saveToHistory()
  }

  function moveNode(id: string, position: Position): void {
    const node = diagram.value.nodes.find(n => n.id === id)
    if (node && !node.locked) {
      let newPosition = position

      if (canvasState.value.snapToGrid) {
        newPosition = snapToGrid(position)
      }

      node.position = newPosition
      diagram.value.metadata!.modified = new Date().toISOString()
    }
  }

  function resizeNode(id: string, size: Size, position?: Position): void {
    const node = diagram.value.nodes.find(n => n.id === id)
    if (node && !node.locked) {
      node.size = size
      if (position) {
        node.position = canvasState.value.snapToGrid
          ? snapToGrid(position)
          : position
      }
      diagram.value.metadata!.modified = new Date().toISOString()
      saveToHistory()
    }
  }

  // Connection operations
  function addConnection(
    source: Anchor,
    target: Anchor,
    label?: string
  ): string {
    const id = generateId()
    const connection: Connection = {
      id,
      source,
      target,
      label,
      style: {
        stroke: '#333',
        strokeWidth: 2,
        style: 'solid',
        targetArrow: 'arrow'
      }
    }

    diagram.value.connections.push(connection)
    saveToHistory()

    return id
  }

  function updateConnection(id: string, updates: Partial<Connection>): void {
    const index = diagram.value.connections.findIndex(c => c.id === id)
    if (index !== -1) {
      diagram.value.connections[index] = {
        ...diagram.value.connections[index],
        ...updates
      }
      saveToHistory()
    }
  }

  function removeConnection(id: string): void {
    diagram.value.connections = diagram.value.connections.filter(c => c.id !== id)
    selection.value.selectedConnections = selection.value.selectedConnections.filter(
      cid => cid !== id
    )
    saveToHistory()
  }

  // Selection operations
  function selectNode(id: string, addToSelection = false): void {
    if (addToSelection) {
      if (!selection.value.selectedNodes.includes(id)) {
        selection.value.selectedNodes.push(id)
      }
    } else {
      selection.value.selectedNodes = [id]
      selection.value.selectedConnections = []
    }
  }

  function selectConnection(id: string, addToSelection = false): void {
    if (addToSelection) {
      if (!selection.value.selectedConnections.includes(id)) {
        selection.value.selectedConnections.push(id)
      }
    } else {
      selection.value.selectedConnections = [id]
      selection.value.selectedNodes = []
    }
  }

  function clearSelection(): void {
    selection.value.selectedNodes = []
    selection.value.selectedConnections = []
  }

  function selectAll(): void {
    selection.value.selectedNodes = diagram.value.nodes.map(n => n.id)
    selection.value.selectedConnections = diagram.value.connections.map(c => c.id)
  }

  function deleteSelected(): void {
    // Delete selected nodes (and their connections)
    selection.value.selectedNodes.forEach(id => removeNode(id))

    // Delete selected connections
    selection.value.selectedConnections.forEach(id => removeConnection(id))

    clearSelection()
  }

  // Canvas operations
  function setZoom(zoom: number): void {
    canvasState.value.zoom = Math.max(0.1, Math.min(3, zoom))
  }

  function zoomIn(): void {
    setZoom(canvasState.value.zoom * 1.2)
  }

  function zoomOut(): void {
    setZoom(canvasState.value.zoom / 1.2)
  }

  function resetView(): void {
    canvasState.value.zoom = 1
    canvasState.value.panX = 0
    canvasState.value.panY = 0
  }

  function pan(deltaX: number, deltaY: number): void {
    canvasState.value.panX += deltaX
    canvasState.value.panY += deltaY
  }

  // Grid snapping
  function snapToGrid(position: Position): Position {
    const gridSize = canvasState.value.gridSize
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    }
  }

  // Get nodes by parent (for container support)
  const getChildNodes = computed(() => {
    return (parentId: string) => {
      return diagram.value.nodes.filter(n => n.parentId === parentId)
    }
  })

  // Get root nodes (no parent)
  const rootNodes = computed(() => {
    return diagram.value.nodes.filter(n => !n.parentId)
  })

  // Get selected nodes data
  const selectedNodesData = computed(() => {
    return diagram.value.nodes.filter(n =>
      selection.value.selectedNodes.includes(n.id)
    )
  })

  // Can undo/redo
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // Initialize history
  saveToHistory()

  return {
    // State
    diagram,
    canvasState,
    selection,
    currentTool,

    // Computed
    rootNodes,
    getChildNodes,
    selectedNodesData,
    canUndo,
    canRedo,

    // Node operations
    addNode,
    updateNode,
    removeNode,
    moveNode,
    resizeNode,

    // Connection operations
    addConnection,
    updateConnection,
    removeConnection,

    // Selection operations
    selectNode,
    selectConnection,
    clearSelection,
    selectAll,
    deleteSelected,

    // Canvas operations
    setZoom,
    zoomIn,
    zoomOut,
    resetView,
    pan,
    snapToGrid,

    // History
    undo,
    redo,

    // Utilities
    generateId
  }
}
