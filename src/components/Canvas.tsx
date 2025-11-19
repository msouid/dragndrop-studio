import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchItems, type Item as DraggableItem } from '../utils/items'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  useCanvasHistory,
  useCanvasSize,
  useKeyboardShortcuts,
  useItemOperations,
  useExportImage,
  type PlacedItem,
} from '../hooks/useCanvasHooks'
import { CANVAS_CONFIG } from '../config/canvasConfig'

// Use centralized config
const DEFAULT_ITEM_SIZE = CANVAS_CONFIG.item.defaultSize
const ITEM_OFFSET = CANVAS_CONFIG.drag.itemOffset
const RESIZE_STEP = CANVAS_CONFIG.resize.step
const DRAG_ACTIVATION_DISTANCE = CANVAS_CONFIG.drag.activationDistance

interface PhotoCanvasProps {
  photoUrl: string
  onRetake: () => void
}

export default function PhotoCanvas({ photoUrl, onRetake }: PhotoCanvasProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
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

  // Configure sensors for @dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Fetch items using React Query
  const { data: items, isLoading, error } = useQuery<DraggableItem[]>({
    queryKey: ['draggableItems'],
    queryFn: fetchItems,
  })

  // Wrapper for handleRemoveItem to also deselect
  const handleRemoveItem = useCallback((itemId: string) => {
    hookHandleRemoveItem(itemId)
    setSelectedItemId(null)
  }, [hookHandleRemoveItem])

  // Handle keyboard shortcuts including deselect
  useKeyboardShortcuts(undo, redo, selectedItemId, handleRemoveItem)

  // Listen for custom deselect event from keyboard shortcuts hook
  useEffect(() => {
    const handleDeselect = () => {
      setSelectedItemId(null)
    }
    window.addEventListener('deselect', handleDeselect)
    return () => window.removeEventListener('deselect', handleDeselect)
  }, [])


  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveId(id)

    // Only set selected if it's a placed item (not from the list)
    if (id.startsWith('placed-')) {
      setSelectedItemId(id)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event
    const activeIdStr = String(active.id)

    if (over && over.id === 'canvas-droppable') {
      // Dropping from the list onto the canvas
      if (!activeIdStr.startsWith('placed-')) {
        const sourceItem = items?.find((item) => item.id === active.id)
        if (sourceItem && canvasRef.current && event.activatorEvent instanceof PointerEvent) {
          const rect = canvasRef.current.getBoundingClientRect()
          // Calculate final position based on where the pointer was when dragging started plus the delta
          const initialX = event.activatorEvent.clientX - rect.left
          const initialY = event.activatorEvent.clientY - rect.top

          // Apply delta to get final pointer position over canvas
          const pointerFinalX = initialX + (delta?.x || 0)
          const pointerFinalY = initialY + (delta?.y || 0)

          // Center the item on the pointer position
          const finalX = Math.max(
            0,
            Math.min(pointerFinalX - ITEM_OFFSET, canvasSize.width - DEFAULT_ITEM_SIZE)
          )
          const finalY = Math.max(
            0,
            Math.min(pointerFinalY - ITEM_OFFSET, canvasSize.height - DEFAULT_ITEM_SIZE)
          )

          const newItem: PlacedItem = {
            id: `placed-${Date.now()}`,
            itemId: sourceItem.id,
            image: sourceItem.image,
            x: finalX,
            y: finalY,
            width: DEFAULT_ITEM_SIZE,
            height: DEFAULT_ITEM_SIZE,
            rotation: 0,
          }
          saveToHistory([...placedItems, newItem])
          setSelectedItemId(newItem.id)
        }
      } else {
        // Moving an existing placed item
        if (delta && activeId) {
          const newItems = placedItems.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  x: Math.max(0, Math.min(item.x + delta.x, canvasSize.width - item.width)),
                  y: Math.max(0, Math.min(item.y + delta.y, canvasSize.height - item.height)),
                }
              : item
          )
          saveToHistory(newItems)
        }
      }
    } else if (activeIdStr.startsWith('placed-') && delta && activeId) {
      // Moving placed item without dropping on canvas (still update position)
      const newItems = placedItems.map((item) =>
        item.id === activeId
          ? {
              ...item,
              x: Math.max(0, Math.min(item.x + delta.x, canvasSize.width - item.width)),
              y: Math.max(0, Math.min(item.y + delta.y, canvasSize.height - item.height)),
            }
          : item
      )
      saveToHistory(newItems)
    }

    setActiveId(null)
  }, [items, canvasSize, placedItems, activeId, saveToHistory])

  const selectedItem = useMemo(
    () => placedItems.find((item) => item.id === selectedItemId),
    [placedItems, selectedItemId]
  )

  const handleDeselect = useCallback(() => {
    setSelectedItemId(null)
  }, [])

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItemId(id)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="mb-8">
              {/* Main header row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-4xl">Step 2: Decorate Your Photo</h2>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="btn-tonal"
                    aria-label="Undo last action (Ctrl+Z)"
                  >
                    ↶ <span className="hidden sm:inline">Undo</span>
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="btn-tonal"
                    aria-label="Redo last action (Ctrl+Y)"
                  >
                    ↷ <span className="hidden sm:inline">Redo</span>
                  </button>
                  <button
                    onClick={onRetake}
                    className="btn-outlined"
                    aria-label="Retake photo"
                  >
                    <span className="hidden sm:inline">Retake</span>
                    <span className="sm:hidden">📷</span>
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={placedItems.length === 0 || isExporting}
                    className="btn-success"
                    aria-label={isExporting ? 'Exporting image' : 'Export final decorated image'}
                    aria-busy={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" aria-hidden="true" />
                        <span className="hidden sm:inline">Exporting...</span>
                      </>
                    ) : (
                      <>
                        <span>⬇️</span>
                        <span className="hidden sm:inline">Export</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <DroppableCanvas
              canvasRef={canvasRef}
              photoRef={photoRef}
              photoUrl={photoUrl}
              placedItems={placedItems}
              selectedItemId={selectedItemId}
              onDeselect={handleDeselect}
              onSelectItem={handleSelectItem}
            />

            {/* Edit toolbar - shown under photo when item is selected */}
            {selectedItem && (
              <fieldset className="surface-container mt-8">
                <legend className="text-lg font-medium text-gray-900 px-2">
                  ✏️ Edit Selected Item
                </legend>
                {/* Mobile: 1 row (compact) | Desktop: 1 row with more gap */}
                <div className="flex flex-row gap-1 mt-3 lg:gap-4 lg:mt-4 flex-wrap">
                  <button
                    onClick={() => handleRotate(selectedItem.id, -1)}
                    className="btn-filled flex-1 px-1 sm:px-2 lg:px-4 text-xs sm:text-sm lg:text-base py-1 sm:py-2 lg:py-3 whitespace-nowrap"
                    aria-label="Rotate item counter-clockwise"
                  >
                    ↺ <span className="hidden sm:inline">Left</span>
                  </button>
                  <button
                    onClick={() => handleRotate(selectedItem.id, 1)}
                    className="btn-filled flex-1 px-1 sm:px-2 lg:px-4 text-xs sm:text-sm lg:text-base py-1 sm:py-2 lg:py-3 whitespace-nowrap"
                    aria-label="Rotate item clockwise"
                  >
                    ↻ <span className="hidden sm:inline">Right</span>
                  </button>
                  <button
                    onClick={() => handleResize(selectedItem.id, -RESIZE_STEP)}
                    className="btn-success flex-1 px-1 sm:px-2 lg:px-4 text-xs sm:text-sm lg:text-base py-1 sm:py-2 lg:py-3 whitespace-nowrap"
                    aria-label="Decrease item size"
                  >
                    − <span className="hidden sm:inline">Small</span>
                  </button>
                  <button
                    onClick={() => handleResize(selectedItem.id, RESIZE_STEP)}
                    className="btn-success flex-1 px-1 sm:px-2 lg:px-4 text-xs sm:text-sm lg:text-base py-1 sm:py-2 lg:py-3 whitespace-nowrap"
                    aria-label="Increase item size"
                  >
                    + <span className="hidden sm:inline">Large</span>
                  </button>
                  <button
                    onClick={() => handleRemoveItem(selectedItem.id)}
                    className="btn-danger flex-1 px-1 sm:px-2 lg:px-4 text-xs sm:text-sm lg:text-base py-1 sm:py-2 lg:py-3 whitespace-nowrap"
                    aria-label="Delete selected item"
                  >
                    ✕ <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </fieldset>
            )}
        </div>
      </div>

      {/* Items Panel */}
      <aside className="lg:col-span-1" aria-label="Jewelry collection sidebar">
        <div className="card sticky top-4">
          <h3 className="text-headlineMedium mb-8">💎 Dental Jewelry Collection</h3>

          {isLoading && (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-14 w-14 border-3 border-primary-80" aria-hidden="true"></div>
              <span className="sr-only">Loading jewelry items...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-error-10 border-l-4 border-error-70 rounded-lg" role="alert">
              <p className="text-error-70 text-xs font-semibold">Error</p>
              <p className="text-error-70 text-sm mt-2">
                Failed to load jewelry items. Please try again.
              </p>
            </div>
          )}

          {items && (
            <>
              <p className="text-sm text-gray-700 mb-4">
                Drag any jewelry piece onto your photo.
              </p>
              <div className="grid grid-cols-2 gap-4" role="region" aria-label="Draggable jewelry items">
                {items.map((item) => (
                  <DraggableListItem key={item.id} item={item} />
                ))}
              </div>
            </>
          )}

          <div className="mt-8 p-6 bg-gray-50 rounded-2xl text-sm text-gray-700 border-l-4 border-gray-300">
            <p className="font-semibold mb-4 text-gray-900">⌨️ Keyboard Shortcuts:</p>
            <ul className="space-y-2">
              <li><kbd className="px-2 py-1 bg-primary-99 border border-outline-variant rounded text-xs font-medium">Ctrl+Z</kbd> <span className="text-sm">Undo</span></li>
              <li><kbd className="px-2 py-1 bg-primary-99 border border-outline-variant rounded text-xs font-medium">Ctrl+Y</kbd> <span className="text-sm">/</span> <kbd className="px-2 py-1 bg-primary-99 border border-outline-variant rounded text-xs font-medium">Ctrl+Shift+Z</kbd> <span className="text-sm">Redo</span></li>
              <li><kbd className="px-2 py-1 bg-primary-99 border border-outline-variant rounded text-xs font-medium">Delete</kbd> <span className="text-sm">/</span> <kbd className="px-2 py-1 bg-primary-99 border border-outline-variant rounded text-xs font-medium">Backspace</kbd> <span className="text-sm">Remove</span></li>
              <li><kbd className="px-2 py-1 bg-primary-99 border border-outline-variant rounded text-xs font-medium">Esc</kbd> <span className="text-sm">Deselect</span></li>
            </ul>
          </div>
        </div>
      </aside>
    </div>

      <DragOverlay dropAnimation={null}>
      {activeId && (() => {
        // Check if dragging from list
        const listItem = items?.find((item) => item.id === activeId)
        if (listItem) {
          return (
            <div className="w-12 h-12 opacity-80">
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
              className="opacity-80"
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

// Droppable canvas component
const DroppableCanvas = memo(function DroppableCanvas({
  canvasRef,
  photoRef,
  photoUrl,
  placedItems,
  selectedItemId,
  onDeselect,
  onSelectItem,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>
  photoRef: React.RefObject<HTMLImageElement | null>
  photoUrl: string
  placedItems: PlacedItem[]
  selectedItemId: string | null
  onDeselect: () => void
  onSelectItem: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
  })

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        canvasRef.current = node
      }}
      className={`relative bg-primary-99 rounded-2xl overflow-visible transition-all duration-150 ${
        isOver ? 'ring-4 ring-primary-70 bg-primary-99 shadow-elevation-3' : 'shadow-elevation-1'
      }`}
      onClick={onDeselect}
    >
      <img
        ref={photoRef}
        src={photoUrl}
        alt="Captured photo"
        className="w-full h-auto block"
        draggable={false}
      />

      {/* Placed items */}
      {placedItems.map((item) => (
        <PlacedDraggableItem
          key={item.id}
          item={item}
          isSelected={item.id === selectedItemId}
          onSelect={() => onSelectItem(item.id)}
        />
      ))}
    </div>
  )
})

// Draggable item from the list
const DraggableListItem = memo(function DraggableListItem({ item }: { item: DraggableItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 border border-gray-300 hover:border-primary-70 rounded-lg hover:shadow-elevation-1 bg-white hover:bg-gray-50 group cursor-grab active:cursor-grabbing select-none transition-all duration-150 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
      style={{ touchAction: 'none' }}
      title={`Drag ${item.name} onto the photo to add a copy`}
    >
      <img
        src={item.image}
        alt={item.name}
        className="w-full h-10 object-contain mb-1 pointer-events-none select-none"
        draggable={false}
      />
      <p className="text-xs text-gray-900 group-hover:text-gray-700 font-medium select-none text-center">
        {item.name}
      </p>
    </div>
  )
})

// Placed draggable item on canvas - Optimized with deep comparison
const PlacedDraggableItem = memo(
  function PlacedDraggableItem({
    item,
    isSelected,
    onSelect,
  }: {
    item: PlacedItem
    isSelected: boolean
    onSelect: () => void
  }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: item.id,
    })

    const style = useMemo(
      () => ({
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        transform: CSS.Transform.toString(transform),
        transformOrigin: 'center',
        rotate: `${item.rotation}deg`,
        touchAction: 'none' as const,
      }),
      [item.x, item.y, item.width, item.height, item.rotation, transform]
    )

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect()
      },
      [onSelect]
    )

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`absolute cursor-move select-none ${
          isSelected ? 'ring-4 ring-primary-70 ring-opacity-30 z-10 shadow-elevation-2' : ''
        } ${isDragging ? 'opacity-0' : ''}`}
        style={style}
        onClick={handleClick}
      >
        <img
          src={item.image}
          alt="Decoration"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if relevant props change
    return (
      prevProps.item.x === nextProps.item.x &&
      prevProps.item.y === nextProps.item.y &&
      prevProps.item.width === nextProps.item.width &&
      prevProps.item.height === nextProps.item.height &&
      prevProps.item.rotation === nextProps.item.rotation &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.onSelect === nextProps.onSelect
    )
  }
)
