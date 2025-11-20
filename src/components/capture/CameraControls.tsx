import { useSmileDetection } from '../../hooks/useSmileDetection'

interface CameraControlsProps {
    isCameraActive: boolean
    smileDetection: ReturnType<typeof useSmileDetection>
    onStartCamera: () => void
    onStopCamera: () => void
    onSwitchCamera: () => void
    onCapture: () => void
    isMobile?: boolean
}

export function CameraControls({
    isCameraActive,
    smileDetection,
    onStartCamera,
    onStopCamera,
    onSwitchCamera,
    onCapture,
    isMobile = false,
}: CameraControlsProps) {
    const canCapture = isMobile || smileDetection.readyToCapture

    return (
        <div className="flex gap-4 w-full">
            {!isCameraActive ? (
                <button
                    onClick={onStartCamera}
                    className="btn-primary w-full group"
                    aria-label="Start camera"
                >
                    <svg
                        className="w-6 h-6 mr-2 transition-transform group-hover:scale-110"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                    </svg>
                    Start Camera
                </button>
            ) : (
                <>
                    <button
                        onClick={onCapture}
                        disabled={!canCapture}
                        className={`flex-1 btn-primary flex items-center justify-center gap-2 ${!canCapture && 'opacity-50 grayscale cursor-not-allowed'
                            }`}
                        aria-label={
                            canCapture
                                ? 'Capture photo from camera'
                                : 'Smile with visible teeth to capture'
                        }
                    >
                        <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${canCapture ? 'animate-pulse' : ''}`}>
                            <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                        <span className="hidden sm:inline">Capture</span>
                    </button>
                    <button
                        onClick={onSwitchCamera}
                        className="btn-secondary flex-1"
                        aria-label="Switch between front and back camera"
                    >
                        <svg
                            className="w-5 sm:w-6 h-5 sm:h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span className="hidden sm:inline">Switch</span>
                    </button>
                    <button
                        onClick={onStopCamera}
                        className="btn-secondary flex-1 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-200"
                        aria-label="Stop camera"
                    >
                        <svg
                            className="w-5 sm:w-6 h-5 sm:h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                        <span className="hidden sm:inline">Stop</span>
                    </button>
                </>
            )}
        </div>
    )
}
