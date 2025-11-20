interface CanvasHeaderProps {
    undo: () => void
    redo: () => void
    canUndo: boolean
    canRedo: boolean
    onRetake: () => void
    onExport: () => void
    isExporting: boolean
    hasPlacedItems: boolean
}

export function CanvasHeader({
    undo,
    redo,
    canUndo,
    canRedo,
    onRetake,
    onExport,
    isExporting,
    hasPlacedItems,
}: CanvasHeaderProps) {
    return (
        <div className="mb-6">
            {/* Main header row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary-dim)] text-sm">2</span>
                    Decorate Your Smile
                </h2>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className="btn-icon"
                        aria-label="Undo last action (Ctrl+Z)"
                        title="Undo"
                    >
                        ↶
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className="btn-icon"
                        aria-label="Redo last action (Ctrl+Y)"
                        title="Redo"
                    >
                        ↷
                    </button>
                    <div className="w-px h-8 bg-white/10 mx-1" />
                    <button
                        onClick={onRetake}
                        className="btn-secondary text-sm py-2 px-4"
                        aria-label="Retake photo"
                    >
                        <span className="hidden sm:inline">Retake</span>
                        <span className="sm:hidden">📷</span>
                    </button>
                    <button
                        onClick={onExport}
                        disabled={!hasPlacedItems || isExporting}
                        className="btn-primary text-sm py-2 px-4"
                        aria-label={isExporting ? 'Exporting image' : 'Export final decorated image'}
                        aria-busy={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true" />
                                <span className="hidden sm:inline ml-2">Exporting...</span>
                            </>
                        ) : (
                            <>
                                <span className="mr-2">⬇️</span>
                                <span className="hidden sm:inline">Export</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
