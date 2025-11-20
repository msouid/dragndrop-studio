import { useSmileDetection } from '../../hooks/useSmileDetection'

interface DetectionStatusProps {
    smileDetection: ReturnType<typeof useSmileDetection>
}

export function DetectionStatus({ smileDetection }: DetectionStatusProps) {
    return (
        <div className="absolute top-4 right-4 backdrop-blur-xl bg-black/40 rounded-2xl px-5 py-4 flex flex-col gap-4 max-w-xs border border-white/10 shadow-2xl">
            {/* Status Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    AI Detection
                </span>
                {smileDetection.detectionInProgress && (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-[var(--color-primary-glow)] border-t-transparent" />
                )}
            </div>

            {/* Smile Status */}
            <div className="flex items-center gap-4">
                <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-500 ${smileDetection.isSmiling
                        ? 'bg-[var(--color-success)] shadow-[0_0_15px_var(--color-success)]'
                        : 'bg-white/10'
                        }`}
                >
                    <span className="text-sm">{smileDetection.isSmiling ? '😊' : '😐'}</span>
                </div>
                <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium transition-colors ${smileDetection.isSmiling ? 'text-white' : 'text-gray-400'
                            }`}>
                            {smileDetection.isSmiling ? 'Smile Detected' : 'Please Smile'}
                        </span>
                        <span className="text-[10px] text-gray-500">{Math.round(smileDetection.confidence * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--color-success)] transition-all duration-300 ease-out"
                            style={{ width: `${Math.min(100, smileDetection.confidence * 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Teeth Visibility Status */}
            <div className="flex items-center gap-4">
                <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-500 ${smileDetection.teethVisible
                        ? 'bg-[var(--color-success)] shadow-[0_0_15px_var(--color-success)]'
                        : 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                        }`}
                >
                    <span className="text-sm">{smileDetection.teethVisible ? '🦷' : '👄'}</span>
                </div>
                <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium transition-colors ${smileDetection.teethVisible ? 'text-white' : 'text-[var(--color-warning)]'
                            }`}>
                            {smileDetection.teethVisible ? 'Teeth Visible' : 'Show Teeth'}
                        </span>
                        <span className="text-[10px] text-gray-500">{Math.round(smileDetection.teethVisibilityScore * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ease-out ${smileDetection.teethVisible ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
                                }`}
                            style={{ width: `${Math.min(100, smileDetection.teethVisibilityScore * 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Ready to Capture Status */}
            {smileDetection.readyToCapture ? (
                <div className="mt-2 bg-[var(--color-success)]/20 border border-[var(--color-success)]/30 rounded-xl p-3 text-center backdrop-blur-md animate-pulse-glow">
                    <span className="text-[var(--color-success)] text-xs font-bold flex items-center justify-center gap-2">
                        <span>✨</span> PERFECT SHOT
                    </span>
                </div>
            ) : (
                <div className="mt-2 text-center p-2 rounded-lg bg-white/5">
                    <span className="text-gray-400 text-[10px] font-medium">
                        {!smileDetection.isSmiling
                            ? "Smile at the camera to begin"
                            : "Open mouth slightly to show teeth"}
                    </span>
                </div>
            )}
        </div>
    )
}
