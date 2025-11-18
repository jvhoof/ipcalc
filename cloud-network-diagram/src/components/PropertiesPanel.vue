<template>
  <div class="properties-panel">
    <div class="panel-header">
      <h3>Properties</h3>
      <button class="delete-btn" title="Delete" @click="$emit('delete')">
        🗑️
      </button>
    </div>

    <div v-if="nodes.length === 1" class="panel-content">
      <div class="property-group">
        <label>Label</label>
        <input
          type="text"
          :value="nodes[0].label"
          @input="updateProperty('label', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="property-group">
        <label>Type</label>
        <div class="property-value">{{ getNodeTypeLabel(nodes[0].type) }}</div>
      </div>

      <div class="property-group">
        <label>Position</label>
        <div class="property-row">
          <div class="property-field">
            <span>X:</span>
            <input
              type="number"
              :value="Math.round(nodes[0].position.x)"
              @input="updatePosition('x', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="property-field">
            <span>Y:</span>
            <input
              type="number"
              :value="Math.round(nodes[0].position.y)"
              @input="updatePosition('y', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <div class="property-group">
        <label>Size</label>
        <div class="property-row">
          <div class="property-field">
            <span>W:</span>
            <input
              type="number"
              :value="nodes[0].size.width"
              @input="updateSize('width', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="property-field">
            <span>H:</span>
            <input
              type="number"
              :value="nodes[0].size.height"
              @input="updateSize('height', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <div class="property-group">
        <label>Style</label>
        <div class="property-row">
          <div class="property-field">
            <span>Fill:</span>
            <input
              type="color"
              :value="nodes[0].style?.fill || '#ffffff'"
              @input="updateStyle('fill', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="property-field">
            <span>Stroke:</span>
            <input
              type="color"
              :value="nodes[0].style?.stroke || '#333333'"
              @input="updateStyle('stroke', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <div class="property-group">
        <label>
          <input
            type="checkbox"
            :checked="nodes[0].locked"
            @change="updateProperty('locked', ($event.target as HTMLInputElement).checked)"
          />
          Locked
        </label>
      </div>
    </div>

    <div v-else class="panel-content">
      <div class="multi-select-info">
        {{ nodes.length }} items selected
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiagramNode, CloudProvider } from '@/types'
import { getNodeDefinition } from '@/providers'

const props = defineProps<{
  nodes: DiagramNode[]
  provider: CloudProvider
}>()

const emit = defineEmits<{
  (e: 'update', nodeId: string, updates: Partial<DiagramNode>): void
  (e: 'delete'): void
}>()

function getNodeTypeLabel(type: string): string {
  const def = getNodeDefinition(props.provider, type)
  return def?.label || type
}

function updateProperty(key: keyof DiagramNode, value: unknown): void {
  if (props.nodes.length === 1) {
    emit('update', props.nodes[0].id, { [key]: value })
  }
}

function updatePosition(axis: 'x' | 'y', value: string): void {
  if (props.nodes.length === 1) {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue)) {
      emit('update', props.nodes[0].id, {
        position: {
          ...props.nodes[0].position,
          [axis]: numValue
        }
      })
    }
  }
}

function updateSize(dimension: 'width' | 'height', value: string): void {
  if (props.nodes.length === 1) {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0) {
      emit('update', props.nodes[0].id, {
        size: {
          ...props.nodes[0].size,
          [dimension]: numValue
        }
      })
    }
  }
}

function updateStyle(property: string, value: string): void {
  if (props.nodes.length === 1) {
    emit('update', props.nodes[0].id, {
      style: {
        ...props.nodes[0].style,
        [property]: value
      }
    })
  }
}
</script>

<style scoped>
.properties-panel {
  width: 240px;
  background: #f9f9f9;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.delete-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
}

.delete-btn:hover {
  background: #ffebee;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.property-group {
  margin-bottom: 12px;
}

.property-group label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.property-group input[type="text"],
.property-group input[type="number"] {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  box-sizing: border-box;
}

.property-group input[type="text"]:focus,
.property-group input[type="number"]:focus {
  outline: none;
  border-color: #2196F3;
}

.property-value {
  font-size: 12px;
  color: #333;
  padding: 6px 0;
}

.property-row {
  display: flex;
  gap: 8px;
}

.property-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.property-field span {
  font-size: 11px;
  color: #666;
}

.property-field input[type="number"] {
  width: 100%;
}

.property-field input[type="color"] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.property-group input[type="checkbox"] {
  margin-right: 6px;
}

.multi-select-info {
  text-align: center;
  color: #666;
  font-size: 12px;
  padding: 20px;
}
</style>
