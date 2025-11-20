import { DetectionStatus } from './DetectionStatus'
import { useSmileDetection } from '../../hooks/useSmileDetection'

interface CameraPreviewProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    isCameraActive: boolean
    smileDetection: ReturnType<typeof useSmileDetection>
}

export function CameraPreview({ videoRef, isCameraActive, smileDetection }: CameraPreviewProps) {
    return (
        <div className={`relative rounded-2xl overflow-hidden aspect-video min-h-[300px] md:min-h-[400px] w-full max-w-full transition-all duration-500 ${isCameraActive ? 'shadow-[0_0_30px_rgba(100,50,255,0.3)] ring-1 ring-white/20' : 'bg-black/40 border border-white/10'
            }`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                aria-label="Camera preview feed"
            />
            {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
                        <svg
                            className="h-10 w-10 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm font-medium">Camera preview will appear here</p>
                </div>
            )}

            {/* Smile & Teeth Detection Indicator */}
            {isCameraActive && (
                <DetectionStatus smileDetection={smileDetection} />
            )}
        </div>
    )
}
