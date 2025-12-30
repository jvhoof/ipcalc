<template>
  <div class="network-canvas-container">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :default-viewport="defaultViewport"
      :min-zoom="0.2"
      :max-zoom="4"
      :snap-to-grid="true"
      :snap-grid="[15, 15]"
      class="vue-flow-canvas"
    >
      <Background
        :pattern-color="isDarkMode ? '#2a2a2a' : '#e0e0e0'"
        :gap="15"
        :size="1"
        pattern="dots"
      />

      <Controls
        :show-zoom="true"
        :show-fit-view="true"
        :show-interactive="true"
        position="bottom-right"
      />

      <MiniMap
        :node-color="getNodeColor"
        :node-stroke-width="3"
        :mask-color="isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)'"
        position="bottom-left"
        pannable
        zoomable
      />

      <template #node-vnet="{ data }">
        <div class="custom-node vnet-node">
          <div class="node-header">
            <v-icon size="small" class="mr-1">mdi-lan</v-icon>
            <span class="node-title">{{ data.label }}</span>
          </div>
          <div class="node-content">
            <div class="node-detail">{{ data.cidr }}</div>
          </div>
        </div>
      </template>

      <template #node-subnet="{ data }">
        <div class="custom-node subnet-node">
          <div class="node-header">
            <v-icon size="small" class="mr-1">mdi-network</v-icon>
            <span class="node-title">{{ data.label }}</span>
          </div>
          <div class="node-content">
            <div class="node-detail">{{ data.cidr }}</div>
            <div class="node-detail-small">{{ data.usableIPs }} IPs</div>
          </div>
        </div>
      </template>

      <template #node-vm="{ data }">
        <div class="custom-node vm-node">
          <div class="node-header">
            <v-icon size="small" class="mr-1">mdi-server</v-icon>
            <span class="node-title">{{ data.label }}</span>
          </div>
          <div class="node-content">
            <div class="node-detail-small">{{ data.ip }}</div>
          </div>
        </div>
      </template>
    </VueFlow>

    <div class="toolbar">
      <v-card
        :style="{
          backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#000000'
        }"
        elevation="4"
      >
        <v-card-text class="pa-2">
          <div class="d-flex ga-2 align-center">
            <v-tooltip location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  variant="flat"
                  color="primary"
                  @click="addVNet"
                >
                  <v-icon>mdi-lan</v-icon>
                </v-btn>
              </template>
              <span>Add VNet</span>
            </v-tooltip>

            <v-tooltip location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  variant="flat"
                  color="secondary"
                  @click="addSubnet"
                >
                  <v-icon>mdi-network</v-icon>
                </v-btn>
              </template>
              <span>Add Subnet</span>
            </v-tooltip>

            <v-tooltip location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  variant="flat"
                  color="accent"
                  @click="addVM"
                >
                  <v-icon>mdi-server</v-icon>
                </v-btn>
              </template>
              <span>Add VM</span>
            </v-tooltip>

            <v-divider vertical class="mx-1" />

            <v-tooltip location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  variant="text"
                  @click="clearCanvas"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
              <span>Clear Canvas</span>
            </v-tooltip>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, type Ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge } from '@vue-flow/core'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const isDarkMode = inject<Ref<boolean>>('isDarkMode', ref(false))

const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])

const defaultViewport = {
  zoom: 1,
  x: 0,
  y: 0
}

let nodeId = 0

const { addNodes } = useVueFlow()

const getNodeColor = (node: Node): string => {
  switch (node.type) {
    case 'vnet':
      return '#0078d4'
    case 'subnet':
      return '#00bcf2'
    case 'vm':
      return '#7fba00'
    default:
      return '#737373'
  }
}

const addVNet = () => {
  const id = `vnet-${nodeId++}`
  const newNode: Node = {
    id,
    type: 'vnet',
    position: { x: Math.random() * 500, y: Math.random() * 300 },
    data: {
      label: `VNet ${nodeId}`,
      cidr: '10.0.0.0/16'
    },
    style: {
      width: 200,
      height: 100
    }
  }
  addNodes([newNode])
}

const addSubnet = () => {
  const id = `subnet-${nodeId++}`
  const newNode: Node = {
    id,
    type: 'subnet',
    position: { x: Math.random() * 500, y: Math.random() * 300 },
    data: {
      label: `Subnet ${nodeId}`,
      cidr: '10.0.1.0/24',
      usableIPs: 251
    },
    style: {
      width: 180,
      height: 90
    }
  }
  addNodes([newNode])
}

const addVM = () => {
  const id = `vm-${nodeId++}`
  const newNode: Node = {
    id,
    type: 'vm',
    position: { x: Math.random() * 500, y: Math.random() * 300 },
    data: {
      label: `VM ${nodeId}`,
      ip: '10.0.1.10'
    },
    style: {
      width: 150,
      height: 70
    }
  }
  addNodes([newNode])
}

const clearCanvas = () => {
  nodes.value = []
  edges.value = []
  nodeId = 0
}
</script>

<style scoped>
.network-canvas-container {
  width: 100%;
  height: 100vh;
  position: relative;
  background-color: #f5f5f5;
}

.vue-flow-canvas {
  width: 100%;
  height: 100%;
}

.toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

.custom-node {
  padding: 0;
  border-radius: 8px;
  border: 2px solid;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.custom-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.vnet-node {
  border-color: #0078d4;
}

.vnet-node .node-header {
  background: linear-gradient(135deg, #0078d4 0%, #0063b1 100%);
}

.subnet-node {
  border-color: #00bcf2;
}

.subnet-node .node-header {
  background: linear-gradient(135deg, #00bcf2 0%, #00a0d2 100%);
}

.vm-node {
  border-color: #7fba00;
}

.vm-node .node-header {
  background: linear-gradient(135deg, #7fba00 0%, #6ca000 100%);
}

.node-header {
  padding: 8px 12px;
  color: white;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  border-radius: 6px 6px 0 0;
}

.node-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-content {
  padding: 10px 12px;
  font-size: 12px;
  color: #333;
}

.node-detail {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #0078d4;
  margin-bottom: 4px;
  font-weight: 600;
}

.node-detail-small {
  font-size: 10px;
  color: #666;
}

:deep(.vue-flow__minimap) {
  border: 2px solid #ccc;
  border-radius: 4px;
  background: white;
}

:deep(.vue-flow__controls) {
  border: 2px solid #ccc;
  border-radius: 4px;
  background: white;
}

:deep(.vue-flow__controls button) {
  border-bottom: 1px solid #eee;
}

:deep(.vue-flow__controls button:hover) {
  background: #f5f5f5;
}

:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  background: #555;
  border: 2px solid white;
}

:deep(.vue-flow__handle:hover) {
  background: #0078d4;
}

:deep(.vue-flow__edge-path) {
  stroke: #b1b1b7;
  stroke-width: 2;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #0078d4;
}

:deep(.vue-flow__node.selected) {
  box-shadow: 0 0 0 3px #0078d4;
}
</style>
