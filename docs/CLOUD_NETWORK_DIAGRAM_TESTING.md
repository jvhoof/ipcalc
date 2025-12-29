# Cloud Network Diagram - Testing Guide

This document provides a comprehensive testing guide for the cloud network diagram feature added to the ipcalc project.

## Overview

The `cloud-network-diagram` library is a Vue.js component library for creating interactive cloud network diagrams with draw.io export/import capabilities. This guide covers both manual testing procedures and recommendations for automated testing.

## Quick Start - Running Locally

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation and Running

1. Navigate to the cloud-network-diagram directory:
```bash
cd cloud-network-diagram
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser at the URL shown in the terminal (typically `http://localhost:5173`)

The demo application will display a sample Azure network architecture with VNets, subnets, load balancers, and FortiGate VMs.

## Manual Testing Checklist

### 1. Multi-Cloud Provider Switching
- [ ] Load the demo application
- [ ] Verify initial Azure diagram is displayed
- [ ] Use the provider dropdown in the header
- [ ] Switch to AWS provider
  - [ ] Verify diagram resets
  - [ ] Verify AWS-specific components are available
- [ ] Switch to GCP provider
  - [ ] Verify diagram resets
  - [ ] Verify GCP-specific components are available
- [ ] Switch back to Azure
  - [ ] Verify provider-specific components update correctly

### 2. Node Management

#### Adding Nodes
- [ ] Click the "Add" button in the toolbar
- [ ] Select a container node (VNet/VPC)
- [ ] Verify node appears on canvas
- [ ] Add a subnet node
- [ ] Add resource nodes (VM, load balancer, etc.)

#### Moving Nodes
- [ ] Click and drag a node
- [ ] Verify node follows mouse cursor
- [ ] Release mouse button
- [ ] Verify node stays in new position
- [ ] Test moving nested nodes (e.g., VM inside subnet)
- [ ] Verify parent-child relationships are maintained

#### Resizing Nodes
- [ ] Select a container node (VNet/subnet)
- [ ] Locate resize handles (corners/edges)
- [ ] Drag a resize handle
- [ ] Verify node resizes correctly
- [ ] Verify child nodes remain inside resized container

#### Deleting Nodes
- [ ] Select a node
- [ ] Use delete functionality (keyboard or button)
- [ ] Verify node is removed from canvas
- [ ] Verify connections to deleted node are also removed

#### Nested Nodes
- [ ] Create a VNet/VPC container
- [ ] Create a subnet inside the VNet
- [ ] Place VMs/resources inside the subnet
- [ ] Verify visual hierarchy (nested rendering)
- [ ] Move the parent container
- [ ] Verify children move with parent

### 3. Connection Testing

#### Creating Connections
- [ ] Hover over a node
- [ ] Locate green anchor points (top, right, bottom, left)
- [ ] Click and drag from an anchor point
- [ ] Drag to another node's anchor point
- [ ] Release to create connection
- [ ] Verify connection line appears

#### Connection Styles
- [ ] Select a connection
- [ ] Change line style to solid
- [ ] Change line style to dashed
- [ ] Change line style to dotted
- [ ] Verify visual changes

#### Arrow Types
- [ ] Select a connection
- [ ] Set source arrow to none/arrow/diamond/circle
- [ ] Set target arrow to none/arrow/diamond/circle
- [ ] Verify arrows render correctly

#### Connection Labels
- [ ] Select a connection
- [ ] Add a label (e.g., "Inbound", "East-West")
- [ ] Verify label appears on connection
- [ ] Edit label text
- [ ] Verify changes update

### 4. Properties Panel

#### Node Properties
- [ ] Select a node
- [ ] Open properties panel
- [ ] Edit node label
- [ ] Change node color (fill)
- [ ] Change border color (stroke)
- [ ] Adjust size (width/height)
- [ ] Verify all changes reflect in real-time on canvas

#### Connection Properties
- [ ] Select a connection
- [ ] Open properties panel
- [ ] Edit connection label
- [ ] Change line color
- [ ] Change line width
- [ ] Change line style
- [ ] Verify changes reflect in real-time

### 5. Export Functionality

#### Draw.io Export
- [ ] Click export button in toolbar
- [ ] Select "Draw.io (.drawio)" format
- [ ] Verify file downloads
- [ ] Open file in draw.io (https://app.diagrams.net)
- [ ] Verify all nodes render correctly
- [ ] Verify all connections render correctly
- [ ] Verify labels are preserved
- [ ] Verify colors and styles are preserved

#### SVG Export
- [ ] Click export button
- [ ] Select "SVG" format
- [ ] Verify file downloads
- [ ] Open SVG in browser or image viewer
- [ ] Verify diagram renders as vector image
- [ ] Verify no loss of quality when zooming

#### PNG Export
- [ ] Click export button
- [ ] Select "PNG" format
- [ ] Verify file downloads
- [ ] Open PNG in image viewer
- [ ] Verify diagram renders clearly
- [ ] Verify appropriate resolution

#### JSON Export
- [ ] Click export button
- [ ] Select "JSON" format
- [ ] Verify file downloads
- [ ] Open JSON in text editor
- [ ] Verify structure contains:
  - [ ] Diagram metadata
  - [ ] All nodes with properties
  - [ ] All connections with properties
  - [ ] Valid JSON syntax

### 6. Import Functionality

#### Draw.io Import
- [ ] Create a simple diagram in draw.io (https://app.diagrams.net)
- [ ] Save as .drawio file
- [ ] In demo app, click import button
- [ ] Select "Import Draw.io Diagram"
- [ ] Choose the .drawio file
- [ ] Verify nodes are imported correctly
- [ ] Verify connections are imported correctly
- [ ] Verify positions and sizes are preserved
- [ ] Verify labels are preserved

#### Export-Import Round Trip
- [ ] Create a diagram in demo app
- [ ] Export to draw.io format
- [ ] Clear the canvas
- [ ] Import the exported file
- [ ] Verify diagram is identical to original
- [ ] Verify all properties are preserved

#### Shape Library Import
- [ ] Create a custom shape library in draw.io
- [ ] Save as .xml shape library
- [ ] In demo app, click import button
- [ ] Select "Import Shape Library"
- [ ] Choose the library file
- [ ] Verify custom shapes appear in toolbar
- [ ] Verify shapes can be added to diagram

### 7. Canvas Operations

#### Zoom
- [ ] Use zoom in button (+)
- [ ] Verify canvas zooms in
- [ ] Use zoom out button (-)
- [ ] Verify canvas zooms out
- [ ] Use mouse wheel to zoom
- [ ] Verify smooth zoom behavior
- [ ] Use zoom reset button
- [ ] Verify canvas returns to 100%

#### Pan
- [ ] Click and drag canvas background
- [ ] Verify canvas pans (moves)
- [ ] Pan in all directions
- [ ] Verify nodes move with canvas

#### Grid
- [ ] Toggle grid visibility
- [ ] Verify grid shows/hides
- [ ] Toggle snap-to-grid
- [ ] Drag a node with snap enabled
- [ ] Verify node snaps to grid intersections
- [ ] Disable snap-to-grid
- [ ] Verify free positioning works

### 8. Selection and Multi-Selection

#### Single Selection
- [ ] Click a node
- [ ] Verify node is selected (highlight/border)
- [ ] Click another node
- [ ] Verify previous node deselects
- [ ] Verify new node selects

#### Multi-Selection
- [ ] Hold Ctrl/Cmd and click multiple nodes
- [ ] Verify all clicked nodes are selected
- [ ] Drag selection
- [ ] Verify all selected nodes move together
- [ ] Press Delete
- [ ] Verify all selected nodes are deleted

#### Marquee Selection
- [ ] Click and drag on canvas background
- [ ] Verify selection rectangle appears
- [ ] Drag over multiple nodes
- [ ] Release mouse
- [ ] Verify all enclosed nodes are selected

## Automated Testing Recommendations

### Test Suite Structure

#### 1. Unit Tests - Composables (Business Logic)

**File: `tests/composables/useDiagram.test.ts`**
```typescript
describe('useDiagram', () => {
  // Test node creation, deletion, update
  test('should create a new node')
  test('should delete a node')
  test('should update node properties')
  test('should handle nested nodes correctly')

  // Test connection creation, deletion
  test('should create a connection between nodes')
  test('should delete a connection')
  test('should remove connections when node is deleted')

  // Test selection management
  test('should select a single node')
  test('should select multiple nodes')
  test('should deselect nodes')

  // Test undo/redo functionality
  test('should undo last action')
  test('should redo undone action')
})
```

**File: `tests/composables/useDragDrop.test.ts`**
```typescript
describe('useDragDrop', () => {
  // Test node dragging calculations
  test('should calculate correct position during drag')
  test('should respect parent boundaries')

  // Test snap-to-grid logic
  test('should snap to grid when enabled')
  test('should allow free positioning when disabled')

  // Test boundary detection
  test('should prevent dragging outside canvas bounds')
  test('should keep children inside parent container')
})
```

**File: `tests/composables/useExport.test.ts`**
```typescript
describe('useExport', () => {
  // Test JSON export structure
  test('should export diagram to valid JSON')
  test('should include all nodes in export')
  test('should include all connections in export')
  test('should preserve metadata')

  // Test draw.io XML generation
  test('should generate valid draw.io XML')
  test('should convert nodes to draw.io cells')
  test('should convert connections to draw.io edges')
  test('should preserve styles in draw.io format')

  // Test SVG generation
  test('should generate valid SVG markup')
  test('should include all visual elements')

  // Test PNG export
  test('should generate PNG blob')
  test('should render at correct scale')
})
```

**File: `tests/composables/useImport.test.ts`**
```typescript
describe('useImport', () => {
  // Test draw.io XML parsing
  test('should parse valid draw.io XML')
  test('should extract nodes from draw.io cells')
  test('should extract connections from draw.io edges')
  test('should handle nested nodes correctly')

  // Test shape library import
  test('should parse shape library XML')
  test('should extract custom shapes')

  // Test error handling
  test('should handle invalid XML gracefully')
  test('should handle malformed files')
  test('should provide meaningful error messages')
})
```

#### 2. Unit Tests - Providers (Component Definitions)

**File: `tests/providers/azure.test.ts`**
```typescript
describe('Azure Provider', () => {
  test('should define all Azure node types')
  test('should have correct default sizes')
  test('should have correct default styles')
  test('should mark containers correctly (VNet, subnet)')
  test('should define allowed children for containers')
  test('should use Azure brand colors')
})
```

**File: `tests/providers/aws.test.ts`**
```typescript
describe('AWS Provider', () => {
  test('should define all AWS node types')
  test('should have correct default sizes')
  test('should have correct default styles')
  test('should mark containers correctly (VPC, subnet)')
  test('should define allowed children for containers')
  test('should use AWS brand colors')
})
```

**File: `tests/providers/gcp.test.ts`**
```typescript
describe('GCP Provider', () => {
  test('should define all GCP node types')
  test('should have correct default sizes')
  test('should have correct default styles')
  test('should mark containers correctly (VPC, subnet)')
  test('should define allowed children for containers')
  test('should use GCP brand colors')
})
```

#### 3. Unit Tests - Exporters/Importers (Format Conversion)

**File: `tests/exporters/drawio.test.ts`**
```typescript
describe('Draw.io Exporter', () => {
  // Test node to drawio cell conversion
  test('should convert simple node to drawio cell')
  test('should convert container node to drawio cell')
  test('should preserve node position and size')

  // Test connection to drawio edge conversion
  test('should convert connection to drawio edge')
  test('should preserve connection style')
  test('should set correct source and target')

  // Test style string generation
  test('should generate correct style string')
  test('should include fill color')
  test('should include stroke color and width')

  // Test nested node hierarchy preservation
  test('should set correct parent relationships')
  test('should maintain hierarchy depth')
})
```

**File: `tests/importers/drawio.test.ts`**
```typescript
describe('Draw.io Importer', () => {
  // Test drawio XML parsing
  test('should parse valid drawio XML')
  test('should extract mxGraphModel')
  test('should extract root cells')

  // Test node extraction
  test('should convert drawio cell to node')
  test('should extract position and size')
  test('should parse style string')

  // Test connection extraction
  test('should convert drawio edge to connection')
  test('should identify source and target nodes')
  test('should extract connection style')

  // Test custom shape library parsing
  test('should parse shape library XML')
  test('should extract shape definitions')
  test('should handle custom styles')
})
```

#### 4. Component Tests (Vue Components)

**File: `tests/components/CloudCanvas.test.ts`**
```typescript
describe('CloudCanvas', () => {
  // Test canvas rendering
  test('should render canvas element')
  test('should apply width and height props')

  // Test toolbar integration
  test('should show toolbar when showToolbar is true')
  test('should hide toolbar when showToolbar is false')

  // Test properties panel integration
  test('should show properties when showProperties is true')
  test('should hide properties when showProperties is false')

  // Test event emissions
  test('should emit export event')
  test('should emit import event')
  test('should emit node-select event')
  test('should emit node-double-click event')
})
```

**File: `tests/components/BaseNode.test.ts`**
```typescript
describe('BaseNode', () => {
  // Test node rendering with different types
  test('should render Azure VNet node')
  test('should render AWS VPC node')
  test('should render GCP VPC node')
  test('should apply custom styles')

  // Test selection behavior
  test('should apply selected class when selected')
  test('should remove selected class when deselected')

  // Test drag events
  test('should emit drag events on mouse move')
  test('should calculate correct drag position')

  // Test anchor point positioning
  test('should render anchor points')
  test('should position anchors correctly (top, right, bottom, left)')
})
```

**File: `tests/components/ConnectionLine.test.ts`**
```typescript
describe('ConnectionLine', () => {
  // Test line path calculation
  test('should calculate straight line path')
  test('should calculate path with waypoints')
  test('should connect correct anchor positions')

  // Test arrow rendering
  test('should render target arrow when specified')
  test('should render source arrow when specified')
  test('should render correct arrow type (arrow, diamond, circle)')

  // Test label positioning
  test('should position label at midpoint')
  test('should render label text')
})
```

#### 5. Integration Tests

**File: `tests/integration/diagram-workflow.test.ts`**
```typescript
describe('Complete Diagram Workflow', () => {
  test('should create diagram, export, and import', async () => {
    // 1. Create a new diagram
    const diagram = createEmptyDiagram('azure')

    // 2. Add nodes
    addNode(diagram, 'vnet', { x: 100, y: 100 })
    addNode(diagram, 'subnet', { x: 120, y: 140 })
    addNode(diagram, 'vm', { x: 150, y: 160 })

    // 3. Add connections
    addConnection(diagram, 'subnet', 'vm')

    // 4. Export to draw.io
    const exported = exportToDrawio(diagram)

    // 5. Import the exported data
    const imported = importFromDrawio(exported)

    // 6. Verify data integrity
    expect(imported.nodes).toHaveLength(diagram.nodes.length)
    expect(imported.connections).toHaveLength(diagram.connections.length)
  })
})
```

**File: `tests/integration/provider-switching.test.ts`**
```typescript
describe('Provider Switching', () => {
  test('should switch providers and update available nodes', () => {
    // 1. Start with Azure
    const canvas = createCanvas('azure')
    expect(getAvailableNodeTypes()).toContain('vnet')

    // 2. Switch to AWS
    switchProvider('aws')
    expect(getAvailableNodeTypes()).toContain('vpc')
    expect(getAvailableNodeTypes()).not.toContain('vnet')

    // 3. Switch to GCP
    switchProvider('gcp')
    expect(getAvailableNodeTypes()).toContain('vpc')
    expect(getProvider()).toBe('gcp')
  })
})
```

#### 6. E2E Tests (Optional - Playwright/Cypress)

**File: `e2e/demo.spec.ts`**
```typescript
describe('Demo Application E2E', () => {
  test('should load demo with sample diagram', async () => {
    await page.goto('http://localhost:5173')
    await expect(page.locator('h1')).toContainText('Cloud Network Diagram')
    await expect(page.locator('.node')).toHaveCount(7) // Sample diagram nodes
  })

  test('should add new node via toolbar', async () => {
    await page.click('[data-testid="add-button"]')
    await page.click('[data-testid="node-type-vm"]')
    await page.click('.canvas', { position: { x: 300, y: 300 } })
    await expect(page.locator('.node')).toHaveCount(8)
  })

  test('should export diagram', async () => {
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-button"]')
    await page.click('[data-testid="export-drawio"]')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.drawio$/)
  })

  test('should import diagram', async () => {
    await page.click('[data-testid="import-button"]')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./fixtures/sample-diagram.drawio')
    await expect(page.locator('.node')).toHaveCount.greaterThan(0)
  })
})
```

### Setting Up Testing Environment

#### 1. Install Testing Dependencies

```bash
cd cloud-network-diagram
npm install --save-dev vitest @vitest/ui @vue/test-utils happy-dom
```

#### 2. Add Vitest Configuration

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

#### 3. Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

#### 4. Create Test Directory Structure

```
cloud-network-diagram/
├── tests/
│   ├── composables/
│   │   ├── useDiagram.test.ts
│   │   ├── useDragDrop.test.ts
│   │   ├── useExport.test.ts
│   │   └── useImport.test.ts
│   ├── providers/
│   │   ├── azure.test.ts
│   │   ├── aws.test.ts
│   │   └── gcp.test.ts
│   ├── exporters/
│   │   └── drawio.test.ts
│   ├── importers/
│   │   └── drawio.test.ts
│   ├── components/
│   │   ├── CloudCanvas.test.ts
│   │   ├── BaseNode.test.ts
│   │   └── ConnectionLine.test.ts
│   ├── integration/
│   │   ├── diagram-workflow.test.ts
│   │   └── provider-switching.test.ts
│   └── fixtures/
│       ├── sample-diagram.drawio
│       └── sample-library.xml
```

## Test Priority

Focus testing efforts in this order:

1. **High Priority** - Core Functionality
   - Draw.io export/import (primary feature)
   - Node creation and positioning
   - Connection creation
   - Provider configurations

2. **Medium Priority** - User Interactions
   - Drag and drop
   - Selection management
   - Properties editing
   - Canvas operations (zoom, pan)

3. **Low Priority** - Edge Cases
   - Error handling
   - Large diagrams (performance)
   - Browser compatibility
   - Accessibility features

## Known Limitations

Document any known issues or limitations during testing:

- Maximum number of nodes tested: ___
- Browser compatibility tested: ___
- File size limits for import: ___
- Performance considerations: ___

## Test Results Template

When performing manual tests, use this template to record results:

```
Date: ___________
Tester: ___________
Browser: ___________
Version: ___________

Test Case: ___________
Status: [ ] Pass [ ] Fail [ ] Blocked
Notes: ___________

Issues Found:
- Issue #1: ___________
- Issue #2: ___________
```

## Reporting Issues

When reporting issues found during testing, include:

1. Test case that failed
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Browser/environment details
6. Screenshots or screen recordings
7. Console errors (if any)

## Next Steps

After completing testing:

1. Document all test results
2. File issues for any bugs found
3. Update this testing guide based on findings
4. Add any missing test cases
5. Create automated tests for critical paths
6. Set up CI/CD pipeline for automated testing
