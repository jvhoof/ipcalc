<template>
  <div id="app">
    <header>
      <h1>Cloud Network Diagram</h1>
      <div class="provider-select">
        <label>Provider:</label>
        <select v-model="selectedProvider" @change="handleProviderChange">
          <option value="azure">Microsoft Azure</option>
          <option value="aws">Amazon Web Services</option>
          <option value="gcp">Google Cloud Platform</option>
        </select>
      </div>
    </header>

    <main>
      <CloudCanvas
        ref="canvasRef"
        v-model="diagram"
        :width="1200"
        :height="700"
        :show-toolbar="true"
        :show-properties="true"
        @export="handleExport"
        @node-select="handleNodeSelect"
        @node-double-click="handleNodeDoubleClick"
      />
    </main>

    <footer>
      <p>
        Click "Add" to add components | Drag to move | Connect nodes via green anchors |
        Export to Draw.io, SVG, PNG, or JSON
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { CloudCanvas } from '../src'
import type { Diagram, CloudProvider } from '../src'

const canvasRef = ref<InstanceType<typeof CloudCanvas> | null>(null)

const selectedProvider = ref<CloudProvider>('azure')

// Initial diagram with sample Azure architecture
const diagram = ref<Diagram>({
  id: 'demo-diagram',
  name: 'Sample Network Architecture',
  provider: 'azure',
  nodes: [
    {
      id: 'vnet-1',
      type: 'vnet',
      provider: 'azure',
      label: 'Production VNet',
      position: { x: 100, y: 100 },
      size: { width: 500, height: 400 },
      style: { fill: '#e6f2ff', stroke: '#0078D4' }
    },
    {
      id: 'subnet-external',
      type: 'subnet',
      provider: 'azure',
      label: 'External Subnet',
      position: { x: 120, y: 140 },
      size: { width: 220, height: 160 },
      parentId: 'vnet-1',
      style: { fill: '#fff4e6', stroke: '#f59f00' }
    },
    {
      id: 'subnet-internal',
      type: 'subnet',
      provider: 'azure',
      label: 'Internal Subnet',
      position: { x: 360, y: 140 },
      size: { width: 220, height: 160 },
      parentId: 'vnet-1',
      style: { fill: '#fff4e6', stroke: '#f59f00' }
    },
    {
      id: 'lb-external',
      type: 'load-balancer',
      provider: 'azure',
      label: 'External LB',
      position: { x: 180, y: 180 },
      size: { width: 80, height: 80 },
      parentId: 'subnet-external',
      style: { fill: '#0078D4', stroke: '#005a9e' }
    },
    {
      id: 'vm-1',
      type: 'vm',
      provider: 'azure',
      label: 'FortiGate 1',
      position: { x: 400, y: 160 },
      size: { width: 80, height: 80 },
      parentId: 'subnet-internal',
      style: { fill: '#0078D4', stroke: '#005a9e' }
    },
    {
      id: 'vm-2',
      type: 'vm',
      provider: 'azure',
      label: 'FortiGate 2',
      position: { x: 400, y: 260 },
      size: { width: 80, height: 80 },
      parentId: 'subnet-internal',
      style: { fill: '#0078D4', stroke: '#005a9e' }
    },
    {
      id: 'lb-internal',
      type: 'load-balancer-internal',
      provider: 'azure',
      label: 'Internal LB',
      position: { x: 180, y: 340 },
      size: { width: 80, height: 80 },
      parentId: 'vnet-1',
      style: { fill: '#0078D4', stroke: '#005a9e' }
    }
  ],
  connections: [
    {
      id: 'conn-1',
      source: { nodeId: 'lb-external', position: 'right' },
      target: { nodeId: 'vm-1', position: 'left' },
      label: 'Inbound',
      style: { stroke: '#333', strokeWidth: 2, style: 'solid', targetArrow: 'arrow' }
    },
    {
      id: 'conn-2',
      source: { nodeId: 'lb-external', position: 'right' },
      target: { nodeId: 'vm-2', position: 'left' },
      style: { stroke: '#333', strokeWidth: 2, style: 'solid', targetArrow: 'arrow' }
    },
    {
      id: 'conn-3',
      source: { nodeId: 'vm-1', position: 'bottom' },
      target: { nodeId: 'lb-internal', position: 'top' },
      label: 'East-West',
      style: { stroke: '#666', strokeWidth: 2, style: 'dashed', targetArrow: 'arrow' }
    },
    {
      id: 'conn-4',
      source: { nodeId: 'vm-2', position: 'bottom' },
      target: { nodeId: 'lb-internal', position: 'right' },
      style: { stroke: '#666', strokeWidth: 2, style: 'dashed', targetArrow: 'arrow' }
    }
  ],
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    author: 'Demo',
    description: 'Sample Azure network architecture with FortiGate firewalls'
  }
})

function handleProviderChange(): void {
  // Reset diagram for new provider
  diagram.value = {
    id: `${selectedProvider.value}-diagram`,
    name: `${selectedProvider.value.toUpperCase()} Network`,
    provider: selectedProvider.value,
    nodes: [],
    connections: [],
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }
  }
}

function handleExport(format: string, content: string | Blob): void {
  console.log(`Exported to ${format}`)
}

function handleNodeSelect(nodeIds: string[]): void {
  console.log('Selected nodes:', nodeIds)
}

function handleNodeDoubleClick(nodeId: string): void {
  console.log('Double-clicked node:', nodeId)
}
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #f0f0f0;
}

#app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.provider-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-select label {
  font-size: 14px;
  color: #666;
}

.provider-select select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

main {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

footer {
  margin-top: 20px;
  text-align: center;
}

footer p {
  margin: 0;
  font-size: 12px;
  color: #666;
}
</style>
