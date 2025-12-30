<template>
  <div
    class="vnet-node"
    :class="{ 'is-dragging': isDragging }"
    :style="nodeStyle"
  >
    <Handle
      type="target"
      :position="Position.Top"
      class="node-handle"
    />
    
    <div class="node-header">
      <v-icon class="node-icon" size="small">mdi-network</v-icon>
      <span class="node-title">{{ data.name || 'Virtual Network' }}</span>
    </div>
    
    <div class="node-body">
      <div class="node-property">
        <span class="property-label">CIDR:</span>
        <span class="property-value">{{ data.cidr }}</span>
      </div>
      
      <div v-if="data.routeTableCount" class="node-property">
        <v-icon size="x-small" class="mr-1">mdi-routes</v-icon>
        <span class="property-value">{{ data.routeTableCount }} route table(s)</span>
      </div>
      
      <div v-if="data.location" class="node-property secondary">
        <v-icon size="x-small" class="mr-1">mdi-map-marker</v-icon>
        <span class="property-value">{{ data.location }}</span>
      </div>
    </div>
    
    <div class="containment-area">
      <slot />
    </div>
    
    <Handle
      type="source"
      :position="Position.Bottom"
      class="node-handle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

interface VNetNodeData {
  name?: string
  cidr: string
  location?: string
  routeTableCount?: number
  isDragging?: boolean
}

const props = defineProps<NodeProps<VNetNodeData>>()

const isDragging = computed(() => props.data?.isDragging ?? false)

const nodeStyle = computed(() => ({
  minWidth: '320px',
  minHeight: '240px',
  padding: '12px',
  border: '2px solid #0078d4',
  borderRadius: '8px',
  backgroundColor: isDragging.value ? 'rgba(0, 120, 212, 0.05)' : 'rgba(0, 120, 212, 0.02)',
  boxShadow: isDragging.value ? '0 4px 12px rgba(0, 120, 212, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease'
}))
</script>

<style scoped>
.vnet-node {
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: 'Roboto', sans-serif;
}

.vnet-node.is-dragging {
  cursor: grabbing;
}

.node-handle {
  width: 10px;
  height: 10px;
  border: 2px solid #0078d4;
  background: white;
  border-radius: 50%;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #0078d4, #005a9e);
  color: white;
  border-radius: 4px;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 0.9rem;
}

.node-icon {
  color: white !important;
}

.node-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-body {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  margin-bottom: 8px;
}

.node-property {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0;
  font-size: 0.8rem;
}

.node-property.secondary {
  color: #666;
  font-size: 0.75rem;
}

.property-label {
  font-weight: 600;
  color: #333;
}

.property-value {
  color: #555;
  font-family: 'Courier New', monospace;
}

.containment-area {
  flex: 1;
  min-height: 120px;
  padding: 8px;
  border: 2px dashed rgba(0, 120, 212, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  position: relative;
}

.containment-area:empty::before {
  content: 'Drop subnets here';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(0, 120, 212, 0.4);
  font-size: 0.85rem;
  font-style: italic;
  pointer-events: none;
}
</style>
