import { ref, onMounted, onUnmounted } from 'vue'
import type { Position } from '@/types'

export interface DragState {
  isDragging: boolean
  startPosition: Position
  currentPosition: Position
  delta: Position
}

export function useDragDrop(
  onDragStart?: (position: Position) => void,
  onDrag?: (position: Position, delta: Position) => void,
  onDragEnd?: (position: Position) => void
) {
  const dragState = ref<DragState>({
    isDragging: false,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    delta: { x: 0, y: 0 }
  })

  let element: HTMLElement | null = null

  function handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return // Only left mouse button

    event.preventDefault()
    event.stopPropagation()

    const position = { x: event.clientX, y: event.clientY }

    dragState.value = {
      isDragging: true,
      startPosition: position,
      currentPosition: position,
      delta: { x: 0, y: 0 }
    }

    onDragStart?.(position)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!dragState.value.isDragging) return

    const currentPosition = { x: event.clientX, y: event.clientY }
    const delta = {
      x: currentPosition.x - dragState.value.currentPosition.x,
      y: currentPosition.y - dragState.value.currentPosition.y
    }

    dragState.value.currentPosition = currentPosition
    dragState.value.delta = delta

    onDrag?.(currentPosition, delta)
  }

  function handleMouseUp(event: MouseEvent): void {
    if (!dragState.value.isDragging) return

    const position = { x: event.clientX, y: event.clientY }

    dragState.value.isDragging = false

    onDragEnd?.(position)

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  function attachTo(el: HTMLElement): void {
    element = el
    element.addEventListener('mousedown', handleMouseDown)
  }

  function detach(): void {
    if (element) {
      element.removeEventListener('mousedown', handleMouseDown)
      element = null
    }
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  return {
    dragState,
    attachTo,
    detach,
    handleMouseDown
  }
}

// Composable for handling canvas panning
export function useCanvasPan(
  onPan: (deltaX: number, deltaY: number) => void
) {
  const isPanning = ref(false)
  const lastPosition = ref<Position>({ x: 0, y: 0 })

  function handleMouseDown(event: MouseEvent): void {
    // Middle mouse button or space + left click
    if (event.button === 1) {
      event.preventDefault()
      startPan(event)
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault()
    }
  }

  function startPan(event: MouseEvent): void {
    isPanning.value = true
    lastPosition.value = { x: event.clientX, y: event.clientY }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!isPanning.value) return

    const deltaX = event.clientX - lastPosition.value.x
    const deltaY = event.clientY - lastPosition.value.y

    lastPosition.value = { x: event.clientX, y: event.clientY }

    onPan(deltaX, deltaY)
  }

  function handleMouseUp(): void {
    isPanning.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  return {
    isPanning,
    handleMouseDown,
    handleKeyDown,
    startPan
  }
}

// Composable for handling zoom with mouse wheel
export function useCanvasZoom(
  onZoom: (delta: number, center: Position) => void
) {
  function handleWheel(event: WheelEvent): void {
    event.preventDefault()

    const delta = event.deltaY > 0 ? -0.1 : 0.1
    const center = { x: event.clientX, y: event.clientY }

    onZoom(delta, center)
  }

  return {
    handleWheel
  }
}
