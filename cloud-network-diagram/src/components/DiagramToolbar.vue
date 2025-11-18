<template>
  <div class="diagram-toolbar">
    <!-- Tool selection -->
    <div class="toolbar-group">
      <button
        :class="['toolbar-btn', { active: currentTool === 'select' }]"
        title="Select (V)"
        @click="$emit('tool-select', 'select')"
      >
        <span class="icon">↖</span>
      </button>
      <button
        :class="['toolbar-btn', { active: currentTool === 'pan' }]"
        title="Pan (H)"
        @click="$emit('tool-select', 'pan')"
      >
        <span class="icon">✋</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Add nodes dropdown -->
    <div class="toolbar-group">
      <div class="dropdown">
        <button class="toolbar-btn dropdown-toggle" title="Add Component">
          <span class="icon">+</span>
          <span class="label">Add</span>
        </button>
        <div class="dropdown-menu">
          <div class="dropdown-header">{{ providerName }}</div>
          <button
            v-for="nodeDef in nodeDefinitions"
            :key="nodeDef.type"
            class="dropdown-item"
            @click="$emit('add-node', nodeDef.type)"
          >
            <span class="node-icon">{{ getIconSymbol(nodeDef.type) }}</span>
            {{ nodeDef.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Undo/Redo -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :disabled="!canUndo"
        title="Undo (Ctrl+Z)"
        @click="$emit('undo')"
      >
        <span class="icon">↶</span>
      </button>
      <button
        class="toolbar-btn"
        :disabled="!canRedo"
        title="Redo (Ctrl+Y)"
        @click="$emit('redo')"
      >
        <span class="icon">↷</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Zoom controls -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        title="Zoom Out"
        @click="$emit('zoom-out')"
      >
        <span class="icon">−</span>
      </button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button
        class="toolbar-btn"
        title="Zoom In"
        @click="$emit('zoom-in')"
      >
        <span class="icon">+</span>
      </button>
      <button
        class="toolbar-btn"
        title="Reset View"
        @click="$emit('reset-view')"
      >
        <span class="icon">⊡</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- Grid toggle -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        title="Toggle Grid"
        @click="$emit('toggle-grid')"
      >
        <span class="icon">#</span>
      </button>
    </div>

    <div class="toolbar-spacer"></div>

    <!-- Import dropdown -->
    <div class="toolbar-group">
      <div class="dropdown">
        <button class="toolbar-btn dropdown-toggle" title="Import">
          <span class="icon">↑</span>
          <span class="label">Import</span>
        </button>
        <div class="dropdown-menu dropdown-menu-right">
          <button class="dropdown-item" @click="$emit('import-diagram')">
            Import Draw.io Diagram
          </button>
          <button class="dropdown-item" @click="$emit('import-library')">
            Import Shape Library
          </button>
          <button class="dropdown-item" @click="$emit('import-json')">
            Import from JSON
          </button>
          <div v-if="customLibraries.length > 0" class="dropdown-divider"></div>
          <div v-if="customLibraries.length > 0" class="dropdown-header">Custom Libraries</div>
          <div
            v-for="library in customLibraries"
            :key="library.id"
            class="library-item"
          >
            <span class="library-name">{{ library.name }}</span>
            <span class="library-count">{{ library.shapes.length }} shapes</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Export dropdown -->
    <div class="toolbar-group">
      <div class="dropdown">
        <button class="toolbar-btn dropdown-toggle" title="Export">
          <span class="icon">↓</span>
          <span class="label">Export</span>
        </button>
        <div class="dropdown-menu dropdown-menu-right">
          <button class="dropdown-item" @click="$emit('export', 'drawio')">
            Export to Draw.io
          </button>
          <button class="dropdown-item" @click="$emit('export', 'svg')">
            Export as SVG
          </button>
          <button class="dropdown-item" @click="$emit('export', 'png')">
            Export as PNG
          </button>
          <button class="dropdown-item" @click="$emit('export', 'json')">
            Export as JSON
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CloudProvider, ToolType, NodeType, ShapeLibrary } from '@/types'
import { getProvider, getAllNodeDefinitions } from '@/providers'

const props = defineProps<{
  provider: CloudProvider
  currentTool: ToolType
  canUndo: boolean
  canRedo: boolean
  zoom: number
  customLibraries?: ShapeLibrary[]
}>()

defineEmits<{
  (e: 'tool-select', tool: ToolType): void
  (e: 'add-node', nodeType: NodeType): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'reset-view'): void
  (e: 'toggle-grid'): void
  (e: 'export', format: 'drawio' | 'svg' | 'png' | 'json'): void
  (e: 'import-diagram'): void
  (e: 'import-library'): void
  (e: 'import-json'): void
}>()

const customLibraries = computed(() => props.customLibraries || [])

const providerConfig = computed(() => getProvider(props.provider))
const providerName = computed(() => providerConfig.value.name)
const nodeDefinitions = computed(() => getAllNodeDefinitions(props.provider))

function getIconSymbol(type: string): string {
  const symbols: Record<string, string> = {
    'vnet': '🌐',
    'vpc': '🌐',
    'subnet': '📦',
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
    'internet-gateway': '🌐',
    'application-gateway': '🚪',
    'express-route': '⚡'
  }
  return symbols[type] || '📦'
}
</script>

<style scoped>
.diagram-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  gap: 4px;
  height: 48px;
  box-sizing: border-box;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 8px;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;
}

.toolbar-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background: #d0d0d0;
}

.toolbar-btn .icon {
  font-size: 16px;
}

.toolbar-btn .label {
  font-size: 12px;
}

.zoom-level {
  font-size: 12px;
  min-width: 40px;
  text-align: center;
  color: #666;
}

/* Dropdown */
.dropdown {
  position: relative;
}

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-menu-right {
  left: auto;
  right: 0;
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  border-bottom: 1px solid #e0e0e0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.node-icon {
  font-size: 14px;
}

.dropdown-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}

.library-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
}

.library-name {
  color: #333;
}

.library-count {
  color: #999;
  font-size: 11px;
}
</style>
