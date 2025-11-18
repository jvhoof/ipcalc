<template>
  <div class="cloud-canvas-wrapper" :style="{ width: `${width}px`, height: `${height}px` }">
    <!-- Toolbar -->
    <DiagramToolbar
      v-if="showToolbar"
      :provider="diagram.provider"
      :current-tool="currentTool"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :zoom="canvasState.zoom"
      :custom-libraries="customLibraries"
      @tool-select="currentTool = $event"
      @add-node="handleAddNode"
      @undo="undo"
      @redo="redo"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-view="resetView"
      @export="handleExport"
      @import-diagram="handleImportDiagram"
      @import-library="handleImportLibrary"
      @import-json="handleImportJson"
      @toggle-grid="canvasState.showGrid = !canvasState.showGrid"
    />

    <div class="canvas-container">
      <!-- Main SVG Canvas -->
      <svg
        ref="svgRef"
        class="diagram-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="handleCanvasMouseDown"
        @wheel.prevent="handleWheel"
        @contextmenu.prevent
      >
        <!-- Definitions -->
        <defs>
          <!-- Arrow markers -->
          <marker
            id="arrow-end"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#333" />
          </marker>
          <marker
            id="arrow-start"
            markerWidth="10"
            markerHeight="10"
            refX="0"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M9,0 L9,6 L0,3 z" fill="#333" />
          </marker>

          <!-- Grid pattern -->
          <pattern
            id="grid"
            :width="canvasState.gridSize"
            :height="canvasState.gridSize"
            patternUnits="userSpaceOnUse"
          >
            <path
              :d="`M ${canvasState.gridSize} 0 L 0 0 0 ${canvasState.gridSize}`"
              fill="none"
              stroke="#e0e0e0"
              stroke-width="0.5"
            />
          </pattern>
        </defs>

        <!-- Transform group for pan/zoom -->
        <g :transform="`translate(${canvasState.panX}, ${canvasState.panY}) scale(${canvasState.zoom})`">
          <!-- Grid background -->
          <rect
            v-if="canvasState.showGrid"
            x="-5000"
            y="-5000"
            width="10000"
            height="10000"
            fill="url(#grid)"
          />

          <!-- Connections (render first, behind nodes) -->
          <ConnectionLine
            v-for="connection in diagram.connections"
            :key="connection.id"
            :connection="connection"
            :nodes="diagram.nodes"
            :is-selected="selection.selectedConnections.includes(connection.id)"
            @select="selectConnection"
          />

          <!-- Nodes -->
          <BaseNode
            v-for="node in diagram.nodes"
            :key="node.id"
            :node="node"
            :is-selected="selection.selectedNodes.includes(node.id)"
            :readonly="readonly"
            @select="selectNode"
            @drag-start="handleNodeDragStart"
            @drag="handleNodeDrag"
            @drag-end="handleNodeDragEnd"
            @connection-start="handleConnectionStart"
            @double-click="handleNodeDoubleClick"
          />

          <!-- Connection being drawn -->
          <line
            v-if="isDrawingConnection"
            :x1="connectionStart.x"
            :y1="connectionStart.y"
            :x2="connectionEnd.x"
            :y2="connectionEnd.y"
            stroke="#4CAF50"
            stroke-width="2"
            stroke-dasharray="5,5"
          />
        </g>
      </svg>

      <!-- Properties Panel -->
      <PropertiesPanel
        v-if="showProperties && selectedNodesData.length > 0"
        :nodes="selectedNodesData"
        :provider="diagram.provider"
        @update="handleNodeUpdate"
        @delete="deleteSelected"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide, onMounted, onUnmounted } from 'vue'
import type { Diagram, DiagramNode, Position, AnchorPosition, CloudProvider, NodeType, ExportOptions, ShapeLibrary } from '@/types'
import { useDiagram } from '@/composables/useDiagram'
import { useExport } from '@/composables/useExport'
import { useImport } from '@/composables/useImport'
import { getNodeDefinition } from '@/providers'
import BaseNode from './nodes/BaseNode.vue'
import ConnectionLine from './nodes/ConnectionLine.vue'
import DiagramToolbar from './DiagramToolbar.vue'
import PropertiesPanel from './PropertiesPanel.vue'

const props = withDefaults(defineProps<{
  modelValue: Diagram
  width?: number
  height?: number
  readonly?: boolean
  showToolbar?: boolean
  showProperties?: boolean
}>(), {
  width: 1200,
  height: 800,
  readonly: false,
  showToolbar: true,
  showProperties: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Diagram): void
  (e: 'export', format: string, content: string | Blob): void
  (e: 'import', diagram: Diagram): void
  (e: 'import-library', library: ShapeLibrary): void
  (e: 'node-select', nodeIds: string[]): void
  (e: 'node-double-click', nodeId: string): void
}>()

const svgRef = ref<SVGSVGElement | null>(null)

// Initialize diagram state management
const {
  diagram,
  canvasState,
  selection,
  currentTool,
  rootNodes,
  selectedNodesData,
  canUndo,
  canRedo,
  addNode,
  updateNode,
  removeNode,
  moveNode,
  addConnection,
  selectNode,
  selectConnection,
  clearSelection,
  deleteSelected,
  setZoom,
  zoomIn,
  zoomOut,
  resetView,
  pan,
  undo,
  redo,
  generateId
} = useDiagram(props.modelValue)

const { exportDiagram, downloadFile } = useExport()

const {
  customLibraries,
  importDiagramFromFile,
  importLibraryFromFile,
  importFromJson,
  mergeDiagrams,
  selectFile
} = useImport()

// Sync with v-model
watch(diagram, (newDiagram) => {
  emit('update:modelValue', newDiagram)
}, { deep: true })

watch(() => props.modelValue, (newValue) => {
  if (JSON.stringify(newValue) !== JSON.stringify(diagram.value)) {
    diagram.value = newValue
  }
}, { deep: true })

// Watch selection changes
watch(() => selection.value.selectedNodes, (nodeIds) => {
  emit('node-select', nodeIds)
})

// Canvas dimensions accounting for toolbar
const canvasWidth = computed(() => props.width)
const canvasHeight = computed(() => props.showToolbar ? props.height - 48 : props.height)

// Connection drawing state
const isDrawingConnection = ref(false)
const connectionSourceNode = ref<string | null>(null)
const connectionSourceAnchor = ref<AnchorPosition | null>(null)
const connectionStart = ref<Position>({ x: 0, y: 0 })
const connectionEnd = ref<Position>({ x: 0, y: 0 })

// Handle canvas mouse down (for panning and clearing selection)
function handleCanvasMouseDown(event: MouseEvent): void {
  if (event.target === svgRef.value) {
    clearSelection()
  }

  // Middle mouse button for panning
  if (event.button === 1 || currentTool.value === 'pan') {
    startPanning(event)
  }
}

// Panning state
const isPanning = ref(false)
const panStart = ref<Position>({ x: 0, y: 0 })

function startPanning(event: MouseEvent): void {
  isPanning.value = true
  panStart.value = { x: event.clientX, y: event.clientY }

  document.addEventListener('mousemove', handlePanMove)
  document.addEventListener('mouseup', stopPanning)
}

function handlePanMove(event: MouseEvent): void {
  if (!isPanning.value) return

  const deltaX = event.clientX - panStart.value.x
  const deltaY = event.clientY - panStart.value.y

  panStart.value = { x: event.clientX, y: event.clientY }

  pan(deltaX, deltaY)
}

function stopPanning(): void {
  isPanning.value = false
  document.removeEventListener('mousemove', handlePanMove)
  document.removeEventListener('mouseup', stopPanning)
}

// Handle mouse wheel for zooming
function handleWheel(event: WheelEvent): void {
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const newZoom = canvasState.value.zoom + delta
  setZoom(newZoom)
}

// Handle adding new node from toolbar
function handleAddNode(nodeType: NodeType): void {
  const def = getNodeDefinition(diagram.value.provider, nodeType)
  if (!def) return

  // Calculate center position of visible canvas
  const centerX = (canvasWidth.value / 2 - canvasState.value.panX) / canvasState.value.zoom
  const centerY = (canvasHeight.value / 2 - canvasState.value.panY) / canvasState.value.zoom

  const nodeId = addNode({
    type: nodeType,
    provider: diagram.value.provider,
    label: def.label,
    position: {
      x: centerX - def.defaultSize.width / 2,
      y: centerY - def.defaultSize.height / 2
    },
    size: { ...def.defaultSize },
    style: def.style ? { ...def.style } : undefined
  })

  // Select the new node
  selectNode(nodeId, false)
}

// Handle node drag events
function handleNodeDragStart(nodeId: string, position: Position): void {
  // Could be used for undo state
}

function handleNodeDrag(nodeId: string, delta: Position): void {
  const node = diagram.value.nodes.find(n => n.id === nodeId)
  if (node) {
    const newPosition = {
      x: node.position.x + delta.x / canvasState.value.zoom,
      y: node.position.y + delta.y / canvasState.value.zoom
    }
    moveNode(nodeId, newPosition)
  }
}

function handleNodeDragEnd(nodeId: string): void {
  // Save to undo history
}

// Handle connection start
function handleConnectionStart(nodeId: string, anchor: AnchorPosition): void {
  if (props.readonly) return

  const node = diagram.value.nodes.find(n => n.id === nodeId)
  if (!node) return

  isDrawingConnection.value = true
  connectionSourceNode.value = nodeId
  connectionSourceAnchor.value = anchor

  // Calculate anchor position
  const anchorPos = getAnchorPosition(node, anchor)
  connectionStart.value = anchorPos
  connectionEnd.value = anchorPos

  document.addEventListener('mousemove', handleConnectionMove)
  document.addEventListener('mouseup', handleConnectionEnd)
}

function handleConnectionMove(event: MouseEvent): void {
  if (!isDrawingConnection.value || !svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  connectionEnd.value = {
    x: (event.clientX - rect.left - canvasState.value.panX) / canvasState.value.zoom,
    y: (event.clientY - rect.top - canvasState.value.panY) / canvasState.value.zoom
  }
}

function handleConnectionEnd(event: MouseEvent): void {
  if (!isDrawingConnection.value) return

  isDrawingConnection.value = false

  document.removeEventListener('mousemove', handleConnectionMove)
  document.removeEventListener('mouseup', handleConnectionEnd)

  // Find if we're over a node anchor
  const targetNode = findNodeAtPosition(connectionEnd.value)
  if (targetNode && targetNode.id !== connectionSourceNode.value) {
    // Determine the best anchor based on position
    const targetAnchor = findBestAnchor(targetNode, connectionEnd.value)

    // Create the connection
    addConnection(
      {
        nodeId: connectionSourceNode.value!,
        position: connectionSourceAnchor.value!
      },
      {
        nodeId: targetNode.id,
        position: targetAnchor
      }
    )
  }

  connectionSourceNode.value = null
  connectionSourceAnchor.value = null
}

function getAnchorPosition(node: DiagramNode, anchor: string): Position {
  const { x, y } = node.position
  const { width, height } = node.size

  switch (anchor) {
    case 'top': return { x: x + width / 2, y }
    case 'right': return { x: x + width, y: y + height / 2 }
    case 'bottom': return { x: x + width / 2, y: y + height }
    case 'left': return { x, y: y + height / 2 }
    default: return { x: x + width / 2, y: y + height / 2 }
  }
}

function findNodeAtPosition(position: Position): DiagramNode | null {
  return diagram.value.nodes.find(node => {
    return (
      position.x >= node.position.x &&
      position.x <= node.position.x + node.size.width &&
      position.y >= node.position.y &&
      position.y <= node.position.y + node.size.height
    )
  }) || null
}

function findBestAnchor(node: DiagramNode, position: Position): AnchorPosition {
  const centerX = node.position.x + node.size.width / 2
  const centerY = node.position.y + node.size.height / 2

  const dx = position.x - centerX
  const dy = position.y - centerY

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left'
  } else {
    return dy > 0 ? 'bottom' : 'top'
  }
}

// Handle node update from properties panel
function handleNodeUpdate(nodeId: string, updates: Partial<DiagramNode>): void {
  updateNode(nodeId, updates)
}

// Handle node double click
function handleNodeDoubleClick(nodeId: string): void {
  emit('node-double-click', nodeId)
}

// Handle export
async function handleExport(format: 'drawio' | 'svg' | 'png' | 'json'): Promise<void> {
  const options: ExportOptions = { format }
  const content = await exportDiagram(diagram.value, options)

  emit('export', format, content)

  // Also trigger download
  const extensions: Record<string, string> = {
    drawio: 'drawio',
    svg: 'svg',
    png: 'png',
    json: 'json'
  }
  const filename = `${diagram.value.name || 'diagram'}.${extensions[format]}`
  downloadFile(content, filename)
}

// Handle import diagram
async function handleImportDiagram(): Promise<void> {
  try {
    const imported = await importDiagramFromFile({ provider: diagram.value.provider })
    if (imported) {
      // Ask user if they want to replace or merge
      const shouldMerge = diagram.value.nodes.length > 0

      if (shouldMerge) {
        // Merge with existing diagram
        const merged = mergeDiagrams(diagram.value, imported)
        diagram.value = merged
      } else {
        // Replace current diagram
        diagram.value = imported
      }

      emit('import', diagram.value)
    }
  } catch (error) {
    console.error('Failed to import diagram:', error)
  }
}

// Handle import shape library
async function handleImportLibrary(): Promise<void> {
  try {
    const library = await importLibraryFromFile()
    if (library) {
      emit('import-library', library)
    }
  } catch (error) {
    console.error('Failed to import library:', error)
  }
}

// Handle import from JSON
async function handleImportJson(): Promise<void> {
  try {
    const file = await selectFile('.json')
    if (file) {
      const content = await file.text()
      const imported = importFromJson(content)

      // Merge or replace based on current state
      if (diagram.value.nodes.length > 0) {
        const merged = mergeDiagrams(diagram.value, imported)
        diagram.value = merged
      } else {
        diagram.value = imported
      }

      emit('import', diagram.value)
    }
  } catch (error) {
    console.error('Failed to import JSON:', error)
  }
}

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent): void {
  if (props.readonly) return

  // Delete selected
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selection.value.selectedNodes.length > 0 || selection.value.selectedConnections.length > 0) {
      event.preventDefault()
      deleteSelected()
    }
  }

  // Ctrl/Cmd + Z = Undo
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undo()
  }

  // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
  if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
    event.preventDefault()
    redo()
  }

  // Ctrl/Cmd + A = Select all
  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    event.preventDefault()
    selection.value.selectedNodes = diagram.value.nodes.map(n => n.id)
  }

  // Escape = Clear selection
  if (event.key === 'Escape') {
    clearSelection()
    isDrawingConnection.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// Expose methods for external use
defineExpose({
  addNode,
  removeNode,
  updateNode,
  addConnection,
  clearSelection,
  undo,
  redo,
  exportDiagram: handleExport,
  importDiagram: handleImportDiagram,
  importLibrary: handleImportLibrary,
  importJson: handleImportJson,
  customLibraries
})
</script>

<style scoped>
.cloud-canvas-wrapper {
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: #fafafa;
}

.canvas-container {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.diagram-canvas {
  flex: 1;
  background: #ffffff;
  cursor: default;
}

.diagram-canvas:active {
  cursor: grabbing;
}
</style>
