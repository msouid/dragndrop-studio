import { useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchItems, type Item as DraggableItem } from '../utils/items'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import {
  useCanvasHistory,
  useCanvasSize,
  useKeyboardShortcuts,
  useItemOperations,
  useExportImage,
} from '../hooks/useCanvasHooks'
import { useCanvasDragDrop } from '../hooks/useCanvasDragDrop'

// Sub-components
import { DroppableCanvas } from './canvas/DroppableCanvas'
import { ItemsPanel } from './canvas/ItemsPanel'
import { CanvasHeader } from './canvas/CanvasHeader'

interface PhotoCanvasProps {
  photoUrl: string
  onRetake: () => void
}

export default function PhotoCanvas({ photoUrl, onRetake }: PhotoCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLImageElement>(null)

  // Use custom hooks for canvas logic
  const {
    placedItems,
    saveToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasHistory()

  const canvasSize = useCanvasSize(photoRef)

  const { handleRotate, handleResize, handleRemoveItem: hookHandleRemoveItem } = useItemOperations(
    placedItems,
    saveToHistory
  )

  const { handleExport, isExporting } = useExportImage(photoRef, placedItems, canvasSize)

  // Fetch items using React Query
  const { data: items, isLoading, error } = useQuery<DraggableItem[]>({
    queryKey: ['draggableItems'],
    queryFn: fetchItems,
  })

  // Drag and drop logic
  const {
    sensors,
    activeId,
    selectedItemId,
    setSelectedItemId,
    handleDragStart,
    handleDragEnd,
    handleDeselect,
    handleSelectItem,
    snapCenterToCursor,
  } = useCanvasDragDrop(placedItems, saveToHistory, canvasSize, items, canvasRef)

  // Wrapper for handleRemoveItem to also deselect
  const handleRemoveItem = useCallback((itemId: string) => {
    hookHandleRemoveItem(itemId)
    setSelectedItemId(null)
  }, [hookHandleRemoveItem, setSelectedItemId])

  // Handle keyboard shortcuts including deselect
  useKeyboardShortcuts(undo, redo, selectedItemId, handleRemoveItem)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Canvas Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <CanvasHeader
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onRetake={onRetake}
              onExport={handleExport}
              isExporting={isExporting}
              hasPlacedItems={placedItems.length > 0}
            />
            <DroppableCanvas
              canvasRef={canvasRef}
              photoRef={photoRef}
              photoUrl={photoUrl}
              placedItems={placedItems}
              selectedItemId={selectedItemId}
              onDeselect={handleDeselect}
              onSelectItem={handleSelectItem}
              onRotate={handleRotate}
              onResize={handleResize}
              onRemove={handleRemoveItem}
            />
          </div>
        </div>

        {/* Items Panel */}
        <ItemsPanel items={items} isLoading={isLoading} error={error} />
      </div>

      <DragOverlay dropAnimation={null} style={{ zIndex: 9999 }}>
        {activeId && (() => {
          // Check if dragging from list
          const listItem = items?.find((item) => item.id === activeId)
          if (listItem) {
            return (
              <div className="w-12 h-12 opacity-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                <img
                  src={listItem.image}
                  alt={listItem.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )
          }
          // Check if dragging placed item
          const placedItem = placedItems.find((item) => item.id === activeId)
          if (placedItem) {
            return (
              <div
                style={{
                  width: `${placedItem.width}px`,
                  height: `${placedItem.height}px`,
                  rotate: `${placedItem.rotation}deg`,
                }}
                className="opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]"
              >
                <img
                  src={placedItem.image}
                  alt="Decoration"
                  className="w-full h-full object-contain"
                />
              </div>
            )
          }
          return null
        })()}
      </DragOverlay>
    </DndContext>
  )
}
