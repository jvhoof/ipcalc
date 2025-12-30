<template>
  <div
    class="subnet-node"
    :class="{ 'is-dragging': isDragging, 'has-route-table': hasRouteTable }"
    :style="nodeStyle"
  >
    <Handle
      type="target"
      :position="Position.Top"
      class="node-handle"
    />
    
    <div class="node-header">
      <v-icon class="node-icon" size="small">mdi-sitemap</v-icon>
      <span class="node-title">{{ data.name || 'Subnet' }}</span>
      <v-icon
        v-if="hasRouteTable"
        class="route-indicator"
        size="x-small"
        title="Route table attached"
      >
        mdi-routes
      </v-icon>
    </div>
    
    <div class="node-body">
      <div class="node-property">
        <span class="property-label">CIDR:</span>
        <span class="property-value">{{ data.cidr }}</span>
      </div>
      
      <div v-if="data.usableIPs !== undefined" class="node-property">
        <span class="property-label">Usable IPs:</span>
        <span class="property-value">{{ data.usableIPs }}</span>
      </div>
      
      <div v-if="data.serviceEndpoints && data.serviceEndpoints.length > 0" class="node-property secondary">
        <v-icon size="x-small" class="mr-1">mdi-api</v-icon>
        <span class="property-value">{{ data.serviceEndpoints.length }} endpoint(s)</span>
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

interface SubnetNodeData {
  name?: string
  cidr: string
  usableIPs?: number
  routeTableId?: string
  serviceEndpoints?: string[]
  isDragging?: boolean
}

const props = defineProps<NodeProps<SubnetNodeData>>()

const isDragging = computed(() => props.data?.isDragging ?? false)
const hasRouteTable = computed(() => !!props.data?.routeTableId)

const nodeStyle = computed(() => ({
  minWidth: '240px',
  minHeight: '160px',
  padding: '10px',
  border: hasRouteTable.value ? '2px solid #ff6b00' : '2px solid #50e6ff',
  borderRadius: '6px',
  backgroundColor: isDragging.value ? 'rgba(80, 230, 255, 0.08)' : 'rgba(80, 230, 255, 0.03)',
  boxShadow: isDragging.value ? '0 3px 10px rgba(80, 230, 255, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease'
}))
</script>

<style scoped>
.subnet-node {
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: 'Roboto', sans-serif;
}

.subnet-node.is-dragging {
  cursor: grabbing;
}

.subnet-node.has-route-table .node-header {
  background: linear-gradient(135deg, #ff6b00, #cc5500);
}

.node-handle {
  width: 8px;
  height: 8px;
  border: 2px solid #50e6ff;
  background: white;
  border-radius: 50%;
}

.subnet-node.has-route-table .node-handle {
  border-color: #ff6b00;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #50e6ff, #00b7c3);
  color: white;
  border-radius: 4px;
  margin-bottom: 10px;
  font-weight: 600;
  font-size: 0.85rem;
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

.route-indicator {
  color: #fff3cd !important;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.node-body {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  margin-bottom: 6px;
}

.node-property {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 3px 0;
  font-size: 0.75rem;
}

.node-property.secondary {
  color: #666;
  font-size: 0.7rem;
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
  min-height: 60px;
  padding: 6px;
  border: 2px dashed rgba(80, 230, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  position: relative;
}

.subnet-node.has-route-table .containment-area {
  border-color: rgba(255, 107, 0, 0.2);
}

.containment-area:empty::before {
  content: 'Drop VMs here';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(80, 230, 255, 0.4);
  font-size: 0.75rem;
  font-style: italic;
  pointer-events: none;
}
</style>
