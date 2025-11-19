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

// Constants
const DEFAULT_ITEM_SIZE = 80
const ITEM_OFFSET = DEFAULT_ITEM_SIZE / 2
const RESIZE_STEP = 10
const DRAG_ACTIVATION_DISTANCE = 5

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
          const dropX = event.activatorEvent.clientX - rect.left
          const dropY = event.activatorEvent.clientY - rect.top

          // Calculate final position with bounds checking
          const finalX = Math.max(
            0,
            Math.min(dropX + (delta?.x || 0) - ITEM_OFFSET, canvasSize.width - DEFAULT_ITEM_SIZE)
          )
          const finalY = Math.max(
            0,
            Math.min(dropY + (delta?.y || 0) - ITEM_OFFSET, canvasSize.height - DEFAULT_ITEM_SIZE)
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="mb-4">
              {/* Main header row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
                  Step 2: Decorate Your Photo
                </h2>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="min-h-[44px] bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition-colors text-xs sm:text-sm"
                    aria-label="Undo last action (Ctrl+Z)"
                  >
                    ↶ Undo
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="min-h-[44px] bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition-colors text-xs sm:text-sm"
                    aria-label="Redo last action (Ctrl+Y)"
                  >
                    ↷ Redo
                  </button>
                  <button
                    onClick={onRetake}
                    className="min-h-[44px] bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-white font-medium py-2 px-3 rounded-lg transition-colors text-xs sm:text-sm"
                    aria-label="Retake photo"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={placedItems.length === 0 || isExporting}
                    className="min-h-[44px] bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition-colors text-xs sm:text-sm flex items-center gap-1"
                    aria-label={isExporting ? 'Exporting image' : 'Export final decorated image'}
                    aria-busy={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" aria-hidden="true" />
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
              <fieldset className="border border-blue-300 rounded-lg p-3 mt-4 bg-blue-50">
                <legend className="text-sm font-semibold text-blue-900 px-2">
                  ✏️ Edit Selected Item
                </legend>
                {/* Mobile: 3 rows | Desktop: 1 row */}
                <div className="flex flex-col lg:flex-row gap-2 mt-3 lg:gap-2">
                  <button
                    onClick={() => handleRotate(selectedItem.id, -1)}
                    className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                    aria-label="Rotate item counter-clockwise"
                  >
                    ↺ Rotate Left
                  </button>
                  <button
                    onClick={() => handleRotate(selectedItem.id, 1)}
                    className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                    aria-label="Rotate item clockwise"
                  >
                    ↻ Rotate Right
                  </button>
                  <button
                    onClick={() => handleResize(selectedItem.id, -RESIZE_STEP)}
                    className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                    aria-label="Decrease item size"
                  >
                    − Smaller
                  </button>
                  <button
                    onClick={() => handleResize(selectedItem.id, RESIZE_STEP)}
                    className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                    aria-label="Increase item size"
                  >
                    + Larger
                  </button>
                  <button
                    onClick={() => handleRemoveItem(selectedItem.id)}
                    className="flex-1 min-h-[44px] bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm lg:w-auto"
                    aria-label="Delete selected item"
                  >
                    ✕ Delete
                  </button>
                </div>
              </fieldset>
            )}
        </div>
      </div>

      {/* Items Panel */}
      <aside className="lg:col-span-1" aria-label="Jewelry collection sidebar">
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 sticky top-4">
          <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4">
            💎 Dental Jewelry Collection
          </h3>

          {isLoading && (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600" aria-hidden="true"></div>
              <span className="sr-only">Loading jewelry items...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg" role="alert">
              <p className="text-red-800 text-sm font-semibold">Error</p>
              <p className="text-red-800 text-sm">
                Failed to load jewelry items. Please try again.
              </p>
            </div>
          )}

          {items && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Drag any jewelry piece onto your photo.
              </p>
              <div className="grid grid-cols-2 gap-3" role="region" aria-label="Draggable jewelry items">
                {items.map((item) => (
                  <DraggableListItem key={item.id} item={item} />
                ))}
              </div>
            </>
          )}

          <div className="mt-6 p-3 bg-indigo-50 rounded-lg text-xs text-gray-700 border border-indigo-200">
            <p className="font-bold mb-2 text-indigo-900">⌨️ Keyboard Shortcuts:</p>
            <ul className="space-y-1">
              <li><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Ctrl+Z</kbd> Undo</li>
              <li><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Ctrl+Y</kbd> / <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Ctrl+Shift+Z</kbd> Redo</li>
              <li><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Delete</kbd> / <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Backspace</kbd> Remove selected</li>
              <li><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> Deselect</li>
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
            <div className="w-20 h-20 opacity-80">
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
      className={`relative bg-gray-100 rounded-lg overflow-visible ${
        isOver ? 'ring-4 ring-blue-400 bg-blue-50' : ''
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
      className={`p-4 border-2 border-gray-200 hover:border-blue-500 rounded-lg hover:shadow-md bg-gray-50 hover:bg-blue-50 group cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
      style={{ touchAction: 'none' }}
      title={`Drag ${item.name} onto the photo to add a copy`}
    >
      <img
        src={item.image}
        alt={item.name}
        className="w-full h-16 object-contain mb-2 pointer-events-none select-none"
        draggable={false}
      />
      <p className="text-xs text-gray-700 group-hover:text-blue-700 font-medium select-none text-center">
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
          isSelected ? 'ring-4 ring-blue-500 ring-opacity-50 z-10' : ''
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
