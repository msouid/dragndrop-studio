import { useRef, useState, useEffect } from 'react'
import { CANVAS_CONFIG } from '../config/canvasConfig'

interface PhotoCaptureProps {
  onCapture: (photoDataUrl: string) => void
}

export function PhotoCapture({ onCapture }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [ariaLive, setAriaLive] = useState<string>('')

  const startCamera = async () => {
    try {
      setError(null)
      setIsCameraActive(false)
      setAriaLive('Starting camera...')

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: CANVAS_CONFIG.camera.video.ideal.width },
          height: { ideal: CANVAS_CONFIG.camera.video.ideal.height },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        setIsCameraActive(true)
        setAriaLive('Camera is now active. Ready to capture photo.')

        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch((err) => {
              console.error('Video play error:', err)
            })
          }
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      const errorMsg =
        'Unable to access camera. Please ensure you have granted camera permissions.'
      setError(errorMsg)
      setAriaLive(errorMsg)
      setIsCameraActive(false)
      errorRef.current?.focus()
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setIsCameraActive(false)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const photoDataUrl = canvas.toDataURL('image/png')
        onCapture(photoDataUrl)
        stopCamera()
      }
    }
  }

  const switchCamera = async () => {
    stopCamera()
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)
    // Restart camera with new facing mode
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newMode,
          width: { ideal: CANVAS_CONFIG.camera.video.ideal.width },
          height: { ideal: CANVAS_CONFIG.camera.video.ideal.height },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        setIsCameraActive(true)
      }
    } catch (err) {
      console.error('Error switching camera:', err)
      setError('Unable to switch camera. Please try again.')
    }
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  return (
    <section className="max-w-3xl mx-auto" aria-label="Photo capture section">
      <div className="card">
        <h2 className="text-4xl mb-8">Step 1: Capture Your Photo</h2>

        {/* Screen reader announcements */}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {ariaLive}
        </div>

        {error && (
          <div
            ref={errorRef}
            className="mb-6 p-4 bg-error-10 border-l-4 border-error-70 rounded-lg focus:outline-none focus:ring-2 focus:ring-error-70"
            role="alert"
            tabIndex={-1}
          >
            <p className="text-error-70 text-xs font-semibold">Error:</p>
            <p className="text-error-70 text-sm mt-2">{error}</p>
          </div>
        )}

        <div className="space-y-6 w-full">
          <div className="relative bg-gray-100 rounded-2xl overflow-hidden aspect-video min-h-[300px] md:min-h-[400px] w-full max-w-full shadow-elevation-1">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              aria-label="Camera preview feed"
            />
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <svg
                    className="mx-auto h-16 w-16 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p>Camera preview will appear here</p>
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-2 sm:gap-3 w-full">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="btn-filled w-full"
                aria-label="Start camera"
              >
                <svg
                  className="w-6 h-6"
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
                  onClick={capturePhoto}
                  className="btn-success flex-1"
                  aria-label="Capture photo from camera"
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
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Capture</span>
                  <span className="sm:hidden">Cap</span>
                </button>
                <button
                  onClick={switchCamera}
                  className="btn-tonal flex-1"
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
                  <span className="sm:hidden">Flip</span>
                </button>
                <button
                  onClick={stopCamera}
                  className="btn-danger flex-1"
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
                  <span className="sm:hidden">End</span>
                </button>
              </>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 border-l-4 border-gray-300 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 Tip:</strong> Make sure to allow camera access when prompted.
              On mobile devices, you can switch between front and back cameras.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
