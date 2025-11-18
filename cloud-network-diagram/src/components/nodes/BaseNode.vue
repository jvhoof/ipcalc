<template>
  <g
    :transform="`translate(${node.position.x}, ${node.position.y})`"
    :class="['diagram-node', { selected: isSelected, dragging: isDragging }]"
    @mousedown.stop="handleMouseDown"
    @dblclick.stop="handleDoubleClick"
  >
    <!-- Node background -->
    <rect
      :width="node.size.width"
      :height="node.size.height"
      :rx="isContainer ? 8 : 4"
      :ry="isContainer ? 8 : 4"
      :fill="nodeStyle.fill"
      :stroke="isSelected ? '#2196F3' : nodeStyle.stroke"
      :stroke-width="isSelected ? 2 : nodeStyle.strokeWidth"
      :opacity="nodeStyle.opacity"
      class="node-background"
    />

    <!-- Icon placeholder (for non-container nodes) -->
    <g v-if="!isContainer" :transform="`translate(${node.size.width / 2 - 20}, 10)`">
      <rect width="40" height="40" fill="none" />
      <!-- Icon would be rendered here based on node type -->
      <text
        x="20"
        y="25"
        text-anchor="middle"
        :fill="nodeStyle.fontColor"
        font-size="24"
      >
        {{ getIconSymbol(node.type) }}
      </text>
    </g>

    <!-- Label -->
    <text
      :x="node.size.width / 2"
      :y="isContainer ? 20 : node.size.height - 10"
      text-anchor="middle"
      :fill="nodeStyle.fontColor"
      :font-size="nodeStyle.fontSize"
      class="node-label"
    >
      {{ node.label }}
    </text>

    <!-- Selection handles -->
    <g v-if="isSelected && !readonly">
      <!-- Resize handles -->
      <rect
        v-for="handle in resizeHandles"
        :key="handle.position"
        :x="handle.x - 4"
        :y="handle.y - 4"
        width="8"
        height="8"
        fill="#2196F3"
        stroke="#fff"
        stroke-width="1"
        :cursor="handle.cursor"
        @mousedown.stop="(e) => handleResizeStart(e, handle.position)"
      />

      <!-- Connection anchors -->
      <circle
        v-for="anchor in connectionAnchors"
        :key="anchor.position"
        :cx="anchor.x"
        :cy="anchor.y"
        r="6"
        fill="#4CAF50"
        stroke="#fff"
        stroke-width="1"
        class="connection-anchor"
        cursor="crosshair"
        @mousedown.stop="(e) => handleConnectionStart(e, anchor.position)"
      />
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DiagramNode, Position, AnchorPosition, NodeStyle } from '@/types'
import { getNodeDefinition } from '@/providers'

const props = defineProps<{
  node: DiagramNode
  isSelected: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string, addToSelection: boolean): void
  (e: 'dragStart', id: string, position: Position): void
  (e: 'drag', id: string, delta: Position): void
  (e: 'dragEnd', id: string): void
  (e: 'resizeStart', id: string, position: string): void
  (e: 'resize', id: string, size: { width: number; height: number }, position: Position): void
  (e: 'resizeEnd', id: string): void
  (e: 'connectionStart', id: string, anchor: AnchorPosition): void
  (e: 'doubleClick', id: string): void
}>()

const isDragging = ref(false)
let startMousePos = { x: 0, y: 0 }

// Check if this is a container node
const isContainer = computed(() => {
  const def = getNodeDefinition(props.node.provider, props.node.type)
  return def?.isContainer || false
})

// Merged node style with defaults
const nodeStyle = computed((): NodeStyle => ({
  fill: props.node.style?.fill || '#ffffff',
  stroke: props.node.style?.stroke || '#333333',
  strokeWidth: props.node.style?.strokeWidth || 1,
  opacity: props.node.style?.opacity || 1,
  fontSize: props.node.style?.fontSize || 12,
  fontColor: props.node.style?.fontColor || '#333333'
}))

// Resize handles positions
const resizeHandles = computed(() => {
  const w = props.node.size.width
  const h = props.node.size.height

  return [
    { position: 'nw', x: 0, y: 0, cursor: 'nw-resize' },
    { position: 'n', x: w / 2, y: 0, cursor: 'n-resize' },
    { position: 'ne', x: w, y: 0, cursor: 'ne-resize' },
    { position: 'e', x: w, y: h / 2, cursor: 'e-resize' },
    { position: 'se', x: w, y: h, cursor: 'se-resize' },
    { position: 's', x: w / 2, y: h, cursor: 's-resize' },
    { position: 'sw', x: 0, y: h, cursor: 'sw-resize' },
    { position: 'w', x: 0, y: h / 2, cursor: 'w-resize' }
  ]
})

// Connection anchor positions
const connectionAnchors = computed(() => {
  const w = props.node.size.width
  const h = props.node.size.height

  return [
    { position: 'top' as AnchorPosition, x: w / 2, y: 0 },
    { position: 'right' as AnchorPosition, x: w, y: h / 2 },
    { position: 'bottom' as AnchorPosition, x: w / 2, y: h },
    { position: 'left' as AnchorPosition, x: 0, y: h / 2 }
  ]
})

function getIconSymbol(type: string): string {
  const symbols: Record<string, string> = {
    'vm': '💻',
    'ec2': '💻',
    'compute-engine': '💻',
    'load-balancer': '⚖️',
    'load-balancer-internal': '⚖️',
    'elb': '⚖️',
    'alb': '⚖️',
    'nlb': '⚖️',
    'nat-gateway': '🔀',
    'storage': '💾',
    's3': '💾',
    'cloud-storage': '💾',
    'database': '🗄️',
    'rds': '🗄️',
    'cloud-sql': '🗄️',
    'firewall': '🔥',
    'firewall-rule': '🔥',
    'nsg': '🛡️',
    'security-group': '🛡️',
    'vpn-gateway': '🔒',
    'cloud-vpn': '🔒',
    'internet-gateway': '🌐'
  }
  return symbols[type] || '📦'
}

function handleMouseDown(event: MouseEvent): void {
  if (props.readonly) return

  emit('select', props.node.id, event.shiftKey || event.ctrlKey || event.metaKey)

  startMousePos = { x: event.clientX, y: event.clientY }
  isDragging.value = true

  emit('dragStart', props.node.id, { x: event.clientX, y: event.clientY })

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(event: MouseEvent): void {
  if (!isDragging.value) return

  const delta = {
    x: event.clientX - startMousePos.x,
    y: event.clientY - startMousePos.y
  }

  startMousePos = { x: event.clientX, y: event.clientY }

  emit('drag', props.node.id, delta)
}

function handleMouseUp(): void {
  if (!isDragging.value) return

  isDragging.value = false
  emit('dragEnd', props.node.id)

  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

function handleResizeStart(event: MouseEvent, position: string): void {
  if (props.readonly) return
  emit('resizeStart', props.node.id, position)
}

function handleConnectionStart(event: MouseEvent, anchor: AnchorPosition): void {
  if (props.readonly) return
  emit('connectionStart', props.node.id, anchor)
}

function handleDoubleClick(): void {
  emit('doubleClick', props.node.id)
}
</script>

<style scoped>
.diagram-node {
  cursor: move;
}

.diagram-node.selected .node-background {
  filter: drop-shadow(0 0 4px rgba(33, 150, 243, 0.5));
}

.diagram-node.dragging {
  opacity: 0.8;
}

.node-label {
  pointer-events: none;
  user-select: none;
}

.connection-anchor {
  opacity: 0;
  transition: opacity 0.2s;
}

.diagram-node:hover .connection-anchor,
.diagram-node.selected .connection-anchor {
  opacity: 1;
}
</style>
