import { memo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { type Item as DraggableItemType } from '../../utils/items'

interface DraggableListItemProps {
    item: DraggableItemType
}

// Draggable item from the list
export const DraggableListItem = memo(function DraggableListItem({ item }: DraggableListItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
    })

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] group cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'
                }`}
            style={{ touchAction: 'none' }}
            title={`Drag ${item.name} onto the photo to add a copy`}
        >
            <div className="aspect-square flex items-center justify-center mb-2 bg-black/20 rounded-lg p-2">
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md transition-transform group-hover:scale-110 duration-300"
                    draggable={false}
                />
            </div>
            <p className="text-xs text-gray-300 group-hover:text-white font-medium select-none text-center truncate">
                {item.name}
            </p>
        </div>
    )
})
