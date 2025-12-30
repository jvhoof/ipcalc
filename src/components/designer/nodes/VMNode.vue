<template>
  <div
    class="vm-node"
    :class="{ 'is-dragging': isDragging, 'is-windows': isWindows, 'is-linux': isLinux }"
    :style="nodeStyle"
  >
    <Handle
      type="target"
      :position="Position.Top"
      class="node-handle"
    />
    
    <div class="node-header">
      <v-icon class="node-icon" size="small">{{ osIcon }}</v-icon>
      <span class="node-title">{{ data.name || 'Virtual Machine' }}</span>
    </div>
    
    <div class="node-body">
      <div class="node-property">
        <span class="property-label">Private IP:</span>
        <span class="property-value">{{ data.privateIpAddress }}</span>
      </div>
      
      <div v-if="data.publicIpAddress" class="node-property">
        <v-icon size="x-small" class="mr-1">mdi-earth</v-icon>
        <span class="property-value">{{ data.publicIpAddress }}</span>
      </div>
      
      <div v-if="data.vmSize" class="node-property secondary">
        <span class="property-label">Size:</span>
        <span class="property-value">{{ data.vmSize }}</span>
      </div>
      
      <div v-if="data.availabilityZone" class="node-property secondary">
        <v-icon size="x-small" class="mr-1">mdi-server</v-icon>
        <span class="property-value">Zone {{ data.availabilityZone }}</span>
      </div>
      
      <div v-if="data.networkSecurityGroupId" class="node-property secondary">
        <v-icon size="x-small" class="mr-1">mdi-shield-check</v-icon>
        <span class="property-value">NSG attached</span>
      </div>
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

interface VMNodeData {
  name?: string
  privateIpAddress: string
  publicIpAddress?: string
  vmSize?: string
  osType?: 'Windows' | 'Linux'
  availabilityZone?: string
  networkSecurityGroupId?: string
  isDragging?: boolean
}

const props = defineProps<NodeProps<VMNodeData>>()

const isDragging = computed(() => props.data?.isDragging ?? false)
const isWindows = computed(() => props.data?.osType === 'Windows')
const isLinux = computed(() => props.data?.osType === 'Linux')

const osIcon = computed(() => {
  if (isWindows.value) return 'mdi-microsoft-windows'
  if (isLinux.value) return 'mdi-linux'
  return 'mdi-monitor'
})

const nodeStyle = computed(() => {
  let borderColor = '#8b8d98'
  let bgColor = 'rgba(139, 141, 152, 0.03)'
  
  if (isWindows.value) {
    borderColor = '#00bcf2'
    bgColor = isDragging.value ? 'rgba(0, 188, 242, 0.08)' : 'rgba(0, 188, 242, 0.03)'
  } else if (isLinux.value) {
    borderColor = '#ffa500'
    bgColor = isDragging.value ? 'rgba(255, 165, 0, 0.08)' : 'rgba(255, 165, 0, 0.03)'
  }
  
  return {
    minWidth: '200px',
    padding: '8px',
    border: `2px solid ${borderColor}`,
    borderRadius: '6px',
    backgroundColor: bgColor,
    boxShadow: isDragging.value ? `0 3px 10px ${borderColor}40` : '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease'
  }
})
</script>

<style scoped>
.vm-node {
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: 'Roboto', sans-serif;
}

.vm-node.is-dragging {
  cursor: grabbing;
}

.node-handle {
  width: 8px;
  height: 8px;
  border: 2px solid #8b8d98;
  background: white;
  border-radius: 50%;
}

.vm-node.is-windows .node-handle {
  border-color: #00bcf2;
}

.vm-node.is-linux .node-handle {
  border-color: #ffa500;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #8b8d98, #6d6f7a);
  color: white;
  border-radius: 4px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.8rem;
}

.vm-node.is-windows .node-header {
  background: linear-gradient(135deg, #00bcf2, #0078d4);
}

.vm-node.is-linux .node-header {
  background: linear-gradient(135deg, #ffa500, #ff8c00);
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
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
}

.node-property {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 3px 0;
  font-size: 0.7rem;
}

.node-property.secondary {
  color: #666;
  font-size: 0.65rem;
}

.property-label {
  font-weight: 600;
  color: #333;
}

.property-value {
  color: #555;
  font-family: 'Courier New', monospace;
}
</style>
