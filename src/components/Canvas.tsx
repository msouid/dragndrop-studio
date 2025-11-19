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

// Constants
const DEFAULT_ITEM_SIZE = 80
const ITEM_OFFSET = DEFAULT_ITEM_SIZE / 2
const ROTATION_STEP = 15
const RESIZE_STEP = 10
const MIN_ITEM_SIZE = 40
const MAX_ITEM_SIZE = 200
const DRAG_ACTIVATION_DISTANCE = 5

interface PhotoCanvasProps {
  photoUrl: string
  onRetake: () => void
}

interface PlacedItem {
  id: string
  itemId: string
  image: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export default function PhotoCanvas({ photoUrl, onRetake }: PhotoCanvasProps) {
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [activeId, setActiveId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLImageElement>(null)

  // Undo/Redo history
  const [history, setHistory] = useState<PlacedItem[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

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

  // Save to history
  const saveToHistory = useCallback((newItems: PlacedItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newItems)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setPlacedItems(newItems)
  }, [history, historyIndex])

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setPlacedItems(history[newIndex])
    }
  }, [historyIndex, history])

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setPlacedItems(history[newIndex])
    }
  }, [historyIndex, history])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (Windows) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y (Windows) or Cmd+Shift+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault()
        redo()
      }
      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault()
        handleRemoveItem(selectedItemId)
      }
      // Escape: Deselect
      if (e.key === 'Escape') {
        setSelectedItemId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history, selectedItemId])

  // Update canvas size when photo loads
  useEffect(() => {
    if (photoRef.current) {
      const updateSize = () => {
        if (photoRef.current) {
          setCanvasSize({
            width: photoRef.current.offsetWidth,
            height: photoRef.current.offsetHeight,
          })
        }
      }

      photoRef.current.addEventListener('load', updateSize)
      updateSize()

      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }
  }, [photoUrl])


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

  const handleRemoveItem = useCallback((itemId: string) => {
    const newItems = placedItems.filter((item) => item.id !== itemId)
    saveToHistory(newItems)
    setSelectedItemId(null)
  }, [placedItems, saveToHistory])

  const handleRotate = useCallback((itemId: string, direction: number) => {
    const newItems = placedItems.map((item) =>
      item.id === itemId
        ? { ...item, rotation: (item.rotation + direction * ROTATION_STEP) % 360 }
        : item
    )
    saveToHistory(newItems)
  }, [placedItems, saveToHistory])

  const handleResize = useCallback((itemId: string, delta: number) => {
    const newItems = placedItems.map((item) =>
      item.id === itemId
        ? {
            ...item,
            width: Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, item.width + delta)),
            height: Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, item.height + delta)),
          }
        : item
    )
    saveToHistory(newItems)
  }, [placedItems, saveToHistory])

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || !photoRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = photoRef.current.naturalWidth
    canvas.height = photoRef.current.naturalHeight

    const scaleX = canvas.width / canvasSize.width
    const scaleY = canvas.height / canvasSize.height

    // Draw the photo
    ctx.drawImage(photoRef.current, 0, 0)

    // Load all images first before drawing
    const imagePromises = placedItems.map((item) => {
      return new Promise<{ img: HTMLImageElement; item: PlacedItem }>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve({ img, item })
        img.onerror = reject
        img.src = item.image
      })
    })

    try {
      const loadedImages = await Promise.all(imagePromises)

      // Draw all placed items
      loadedImages.forEach(({ img, item }) => {
        ctx.save()
        ctx.translate(
          (item.x + item.width / 2) * scaleX,
          (item.y + item.height / 2) * scaleY
        )
        ctx.rotate((item.rotation * Math.PI) / 180)
        ctx.drawImage(
          img,
          (-item.width / 2) * scaleX,
          (-item.height / 2) * scaleY,
          item.width * scaleX,
          item.height * scaleY
        )
        ctx.restore()
      })

      // Download the image
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dental-jewelry-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
      })
    } catch (error) {
      console.error('Failed to load images for export:', error)
      alert('Failed to export image. Please try again.')
    }
  }, [placedItems, canvasSize])

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
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-2xl font-semibold text-gray-800">
                Step 2: Decorate Your Photo
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={undo}
                  disabled={historyIndex === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  title="Undo (Ctrl+Z)"
                >
                  ↶ Undo
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex === history.length - 1}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  title="Redo (Ctrl+Y)"
                >
                  ↷ Redo
                </button>
                <button
                  onClick={onRetake}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Retake Photo
                </button>
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

            {/* Controls for selected item */}
          {selectedItem && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-3">
                Selected Item Controls
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleRotate(selectedItem.id, -1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm"
                  title="Rotate left"
                >
                  ↺ Rotate Left
                </button>
                <button
                  onClick={() => handleRotate(selectedItem.id, 1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm"
                  title="Rotate right"
                >
                  ↻ Rotate Right
                </button>
                <button
                  onClick={() => handleResize(selectedItem.id, RESIZE_STEP)}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm"
                  title="Make larger"
                >
                  + Larger
                </button>
                <button
                  onClick={() => handleResize(selectedItem.id, -RESIZE_STEP)}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm"
                  title="Make smaller"
                >
                  - Smaller
                </button>
                <button
                  onClick={() => handleRemoveItem(selectedItem.id)}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm"
                  title="Remove item"
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={handleExport}
              disabled={placedItems.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Export Final Image
            </button>
          </div>
        </div>
      </div>

      {/* Items Panel */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-lg p-4 sticky top-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            💎 Dental Jewelry Collection
          </h3>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                Failed to load jewelry items. Please try again.
              </p>
            </div>
          )}

          {items && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Drag any jewelry piece onto your photo
              </p>
              <div className="grid grid-cols-2 gap-3">
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
      </div>
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
  canvasRef: React.RefObject<HTMLDivElement>
  photoRef: React.RefObject<HTMLImageElement>
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
        if (canvasRef) {
          ;(canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      }}
      className={`relative bg-gray-100 rounded-lg overflow-hidden ${
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
      <p className="text-xs text-gray-700 group-hover:text-blue-700 font-medium select-none">
        {item.name}
      </p>
    </div>
  )
})

// Placed draggable item on canvas
const PlacedDraggableItem = memo(function PlacedDraggableItem({
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

  const style = {
    left: `${item.x}px`,
    top: `${item.y}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
    transform: CSS.Transform.toString(transform),
    transformOrigin: 'center',
    rotate: `${item.rotation}deg`,
    touchAction: 'none' as const,
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute cursor-move select-none ${
        isSelected ? 'ring-4 ring-blue-500 ring-opacity-50 z-10' : ''
      } ${isDragging ? 'opacity-0' : ''}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <img
        src={item.image}
        alt="Decoration"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
    </div>
  )
})
