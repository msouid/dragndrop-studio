import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { type PlacedItem } from '../../hooks/useCanvasHooks'
import { PlacedDraggableItem } from './PlacedDraggableItem'

interface DroppableCanvasProps {
    canvasRef: React.RefObject<HTMLDivElement | null>
    photoRef: React.RefObject<HTMLImageElement | null>
    photoUrl: string
    placedItems: PlacedItem[]
    selectedItemId: string | null
    onDeselect: () => void
    onSelectItem: (id: string) => void
    onRotate: (id: string, direction: number) => void
    onResize: (id: string, delta: number) => void
    onRemove: (id: string) => void
}

// Droppable canvas component
export const DroppableCanvas = memo(function DroppableCanvas({
    canvasRef,
    photoRef,
    photoUrl,
    placedItems,
    selectedItemId,
    onDeselect,
    onSelectItem,
    onRotate,
    onResize,
    onRemove,
}: DroppableCanvasProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'canvas-droppable',
    })

    return (
        <div
            ref={(node) => {
                setNodeRef(node)
                canvasRef.current = node
            }}
            className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${isOver
                ? 'ring-2 ring-[var(--color-primary-glow)] shadow-[0_0_30px_rgba(100,50,255,0.3)]'
                : 'ring-1 ring-white/10 shadow-2xl'
                }`}
            onClick={onDeselect}
        >
            <img
                ref={photoRef}
                src={photoUrl}
                alt="Captured photo"
                className="w-full h-auto block bg-black/50"
                draggable={false}
            />

            {/* Placed items */}
            {placedItems.map((item) => (
                <PlacedDraggableItem
                    key={item.id}
                    item={item}
                    isSelected={item.id === selectedItemId}
                    onSelect={onSelectItem}
                    onRotate={onRotate}
                    onResize={onResize}
                    onRemove={onRemove}
                />
            ))}
        </div>
    )
})
