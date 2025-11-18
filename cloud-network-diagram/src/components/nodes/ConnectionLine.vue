<template>
  <g
    :class="['connection-line', { selected: isSelected }]"
    @mousedown.stop="handleClick"
  >
    <!-- Clickable area (wider for easier selection) -->
    <path
      :d="pathData"
      fill="none"
      stroke="transparent"
      stroke-width="10"
      class="connection-hitarea"
    />

    <!-- Visible line -->
    <path
      :d="pathData"
      fill="none"
      :stroke="isSelected ? '#2196F3' : lineStyle.stroke"
      :stroke-width="lineStyle.strokeWidth"
      :stroke-dasharray="strokeDasharray"
      :marker-end="hasEndArrow ? 'url(#arrow-end)' : undefined"
      :marker-start="hasStartArrow ? 'url(#arrow-start)' : undefined"
    />

    <!-- Label -->
    <text
      v-if="connection.label"
      :x="labelPosition.x"
      :y="labelPosition.y"
      text-anchor="middle"
      font-size="10"
      fill="#666"
      class="connection-label"
    >
      {{ connection.label }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Connection, DiagramNode, ConnectionLineStyle } from '@/types'

const props = defineProps<{
  connection: Connection
  nodes: DiagramNode[]
  isSelected: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string, addToSelection: boolean): void
}>()

// Find source and target nodes
const sourceNode = computed(() =>
  props.nodes.find(n => n.id === props.connection.source.nodeId)
)

const targetNode = computed(() =>
  props.nodes.find(n => n.id === props.connection.target.nodeId)
)

// Calculate anchor positions
const sourcePosition = computed(() => {
  if (!sourceNode.value) return { x: 0, y: 0 }
  return getAnchorPosition(sourceNode.value, props.connection.source.position)
})

const targetPosition = computed(() => {
  if (!targetNode.value) return { x: 0, y: 0 }
  return getAnchorPosition(targetNode.value, props.connection.target.position)
})

// Generate path data
const pathData = computed(() => {
  const start = sourcePosition.value
  const end = targetPosition.value

  // If there are waypoints, create a path through them
  if (props.connection.waypoints && props.connection.waypoints.length > 0) {
    const points = [start, ...props.connection.waypoints, end]
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')
  }

  // Otherwise create a simple curved line
  const dx = end.x - start.x
  const dy = end.y - start.y
  const midX = start.x + dx / 2
  const midY = start.y + dy / 2

  // Determine if we should use curves based on anchor positions
  const sourceAnchor = props.connection.source.position
  const targetAnchor = props.connection.target.position

  if (sourceAnchor === 'left' || sourceAnchor === 'right' ||
      targetAnchor === 'left' || targetAnchor === 'right') {
    // Horizontal-first routing
    return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`
  } else {
    // Vertical-first routing
    return `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`
  }
})

// Label position (middle of the line)
const labelPosition = computed(() => {
  const start = sourcePosition.value
  const end = targetPosition.value
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2 - 8
  }
})

// Line style
const lineStyle = computed((): ConnectionLineStyle => ({
  stroke: props.connection.style?.stroke || '#333',
  strokeWidth: props.connection.style?.strokeWidth || 2,
  style: props.connection.style?.style || 'solid',
  sourceArrow: props.connection.style?.sourceArrow || 'none',
  targetArrow: props.connection.style?.targetArrow || 'arrow'
}))

// Stroke dasharray based on style
const strokeDasharray = computed(() => {
  switch (lineStyle.value.style) {
    case 'dashed': return '8,4'
    case 'dotted': return '2,4'
    default: return 'none'
  }
})

// Arrow markers
const hasEndArrow = computed(() => lineStyle.value.targetArrow === 'arrow')
const hasStartArrow = computed(() => lineStyle.value.sourceArrow === 'arrow')

function getAnchorPosition(
  node: DiagramNode,
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

function handleClick(event: MouseEvent): void {
  emit('select', props.connection.id, event.shiftKey || event.ctrlKey || event.metaKey)
}
</script>

<style scoped>
.connection-line {
  cursor: pointer;
}

.connection-line.selected path:not(.connection-hitarea) {
  filter: drop-shadow(0 0 2px rgba(33, 150, 243, 0.8));
}

.connection-hitarea {
  cursor: pointer;
}

.connection-label {
  pointer-events: none;
  user-select: none;
}
</style>
