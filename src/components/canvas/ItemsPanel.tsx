import { DraggableListItem } from './DraggableListItem'
import { type Item as DraggableItemType } from '../../utils/items'

interface ItemsPanelProps {
    items: DraggableItemType[] | undefined
    isLoading: boolean
    error: Error | null
}

export function ItemsPanel({ items, isLoading, error }: ItemsPanelProps) {
    return (
        <aside className="lg:col-span-1" aria-label="Jewelry collection sidebar">
            <div className="glass-panel p-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>💎</span> Collection
                </h3>

                {isLoading && (
                    <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--color-primary-glow)] border-t-transparent" aria-hidden="true"></div>
                        <span className="sr-only">Loading jewelry items...</span>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl" role="alert">
                        <p className="text-red-400 text-xs font-semibold uppercase">Error</p>
                        <p className="text-red-200 text-sm mt-1">
                            Failed to load jewelry items. Please try again.
                        </p>
                    </div>
                )}

                {items && (
                    <>
                        <p className="text-sm text-gray-400 mb-4">
                            Drag any jewelry piece onto your photo.
                        </p>
                        <div className="grid grid-cols-4 md:grid-cols-3 lg:grid-cols-2 gap-3" role="region" aria-label="Draggable jewelry items">
                            {items.map((item) => (
                                <DraggableListItem key={item.id} item={item} />
                            ))}
                        </div>
                    </>
                )}

                <div className="hidden md:block mt-8 p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400">
                    <p className="font-semibold mb-3 text-gray-300">⌨️ Shortcuts:</p>
                    <ul className="space-y-2">
                        <li className="flex justify-between"><span>Undo</span> <kbd className="bg-white/10 px-1.5 py-0.5 rounded">Ctrl+Z</kbd></li>
                        <li className="flex justify-between"><span>Redo</span> <kbd className="bg-white/10 px-1.5 py-0.5 rounded">Ctrl+Y</kbd></li>
                        <li className="flex justify-between"><span>Delete</span> <kbd className="bg-white/10 px-1.5 py-0.5 rounded">Del</kbd></li>
                        <li className="flex justify-between"><span>Deselect</span> <kbd className="bg-white/10 px-1.5 py-0.5 rounded">Esc</kbd></li>
                    </ul>
                </div>
            </div>
        </aside>
    )
}
