import { memo, useMemo, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { type PlacedItem } from '../../hooks/useCanvasHooks'
import { CANVAS_CONFIG } from '../../config/canvasConfig'

const RESIZE_STEP = CANVAS_CONFIG.resize.step

interface PlacedDraggableItemProps {
    item: PlacedItem
    isSelected: boolean
    onSelect: (id: string) => void
    onRotate: (id: string, direction: number) => void
    onResize: (id: string, delta: number) => void
    onRemove: (id: string) => void
}

// Placed draggable item on canvas - Optimized with deep comparison
export const PlacedDraggableItem = memo(
    function PlacedDraggableItem({
        item,
        isSelected,
        onSelect,
        onRotate,
        onResize,
        onRemove,
    }: PlacedDraggableItemProps) {
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
                willChange: 'transform', // Performance optimization
            }),
            [item.x, item.y, item.width, item.height, item.rotation, transform]
        )

        const handleClick = useCallback(
            (e: React.MouseEvent) => {
                e.stopPropagation()
                onSelect(item.id)
            },
            [onSelect, item.id]
        )

        // Prevent drag when clicking controls
        const handleControlClick = useCallback((e: React.PointerEvent, action: () => void) => {
            e.stopPropagation()
            action()
        }, [])

        return (
            <div
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                className={`absolute cursor-move select-none transition-shadow duration-200 ${isSelected
                    ? 'ring-2 ring-[var(--color-primary-glow)] shadow-[0_0_20px_var(--color-primary-glow)] z-10'
                    : 'hover:ring-1 hover:ring-white/30'
                    } ${isDragging ? 'opacity-0' : ''}`}
                style={style}
                onClick={handleClick}
            >
                <img
                    src={item.image}
                    alt="Decoration"
                    className="w-full h-full object-contain pointer-events-none drop-shadow-lg"
                    draggable={false}
                />

                {/* Contextual Controls Overlay */}
                {isSelected && !isDragging && (
                    <>
                        {/* Top Right: Delete */}
                        <div
                            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            onPointerDown={(e) => handleControlClick(e, () => onRemove(item.id))}
                            title="Delete"
                        >
                            <span className="text-xs font-bold">✕</span>
                        </div>

                        {/* Bottom Right: Resize + */}
                        <div
                            className="absolute -bottom-3 -right-3 w-6 h-6 bg-[var(--color-primary-glow)] rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            onPointerDown={(e) => handleControlClick(e, () => onResize(item.id, RESIZE_STEP))}
                            title="Enlarge"
                        >
                            <span className="text-xs font-bold">+</span>
                        </div>

                        {/* Bottom Left: Resize - */}
                        <div
                            className="absolute -bottom-3 -left-3 w-6 h-6 bg-[var(--color-secondary-glow)] rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            onPointerDown={(e) => handleControlClick(e, () => onResize(item.id, -RESIZE_STEP))}
                            title="Shrink"
                        >
                            <span className="text-xs font-bold">−</span>
                        </div>

                        {/* Top Left: Rotate */}
                        <div
                            className="absolute -top-3 -left-3 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            onPointerDown={(e) => handleControlClick(e, () => onRotate(item.id, 1))}
                            title="Rotate"
                        >
                            <span className="text-xs font-bold">↻</span>
                        </div>
                    </>
                )}
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
            prevProps.onSelect === nextProps.onSelect &&
            prevProps.onRotate === nextProps.onRotate &&
            prevProps.onResize === nextProps.onResize &&
            prevProps.onRemove === nextProps.onRemove
        )
    }
)
