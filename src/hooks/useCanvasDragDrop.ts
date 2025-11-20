import { useState, useCallback, useEffect } from 'react'
import {
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    DragStartEvent,
    DragEndEvent,
    type Modifier,
} from '@dnd-kit/core'
import { CANVAS_CONFIG } from '../config/canvasConfig'
import { type PlacedItem } from './useCanvasHooks'
import { type Item as DraggableItem } from '../utils/items'

const DEFAULT_ITEM_SIZE = CANVAS_CONFIG.item.defaultSize
const ITEM_OFFSET = CANVAS_CONFIG.drag.itemOffset
const DRAG_ACTIVATION_DISTANCE = CANVAS_CONFIG.drag.activationDistance

export function useCanvasDragDrop(
    placedItems: PlacedItem[],
    saveToHistory: (items: PlacedItem[]) => void,
    canvasSize: { width: number; height: number },
    items: DraggableItem[] | undefined,
    canvasRef: React.RefObject<HTMLDivElement | null>
) {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

    // Configure sensors for @dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: DRAG_ACTIVATION_DISTANCE,
            },
        }),
        useSensor(KeyboardSensor)
    )

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
                // Use the translated rect from dnd-kit which gives the final position of the drag overlay
                const translatedRect = active.rect.current.translated

                if (sourceItem && canvasRef.current && translatedRect) {
                    const canvasRect = canvasRef.current.getBoundingClientRect()

                    // Calculate position relative to canvas
                    // We use the overlay's position directly
                    const relativeX = translatedRect.left - canvasRect.left
                    const relativeY = translatedRect.top - canvasRect.top

                    // Clamp within canvas bounds
                    const finalX = Math.max(
                        0,
                        Math.min(relativeX, canvasSize.width - DEFAULT_ITEM_SIZE)
                    )
                    const finalY = Math.max(
                        0,
                        Math.min(relativeY, canvasSize.height - DEFAULT_ITEM_SIZE)
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
    }, [items, canvasSize, placedItems, activeId, saveToHistory, canvasRef])

    // Custom modifier to snap overlay to cursor center when dragging from list
    const snapCenterToCursor: Modifier = useCallback(({ activatorEvent, draggingNodeRect, overlayNodeRect, transform }) => {
        // If dragging a placed item, use default behavior (natural drag)
        if (activeId && String(activeId).startsWith('placed-')) {
            return transform
        }

        // If dragging from list, center the overlay on the cursor
        if (draggingNodeRect && overlayNodeRect && activatorEvent) {
            let clientX, clientY

            if ('clientX' in activatorEvent) {
                clientX = (activatorEvent as MouseEvent).clientX
                clientY = (activatorEvent as MouseEvent).clientY
            } else if ('touches' in activatorEvent && (activatorEvent as TouchEvent).touches.length > 0) {
                clientX = (activatorEvent as TouchEvent).touches[0].clientX
                clientY = (activatorEvent as TouchEvent).touches[0].clientY
            } else {
                return transform
            }

            const x = clientX - draggingNodeRect.left - overlayNodeRect.width / 2
            const y = clientY - draggingNodeRect.top - overlayNodeRect.height / 2

            return {
                ...transform,
                x,
                y,
            }
        }

        return transform
    }, [activeId])

    const handleDeselect = useCallback(() => {
        setSelectedItemId(null)
    }, [])

    const handleSelectItem = useCallback((id: string) => {
        setSelectedItemId(id)
    }, [])

    // Listen for custom deselect event
    useEffect(() => {
        const onDeselect = () => {
            setSelectedItemId(null)
        }
        window.addEventListener('deselect', onDeselect)
        return () => window.removeEventListener('deselect', onDeselect)
    }, [])

    return {
        sensors,
        activeId,
        selectedItemId,
        setSelectedItemId,
        handleDragStart,
        handleDragEnd,
        handleDeselect,
        handleSelectItem,
        snapCenterToCursor,
    }
}
