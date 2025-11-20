import { useRef, useState, useEffect } from 'react'
import { CANVAS_CONFIG } from '../config/canvasConfig'
import { useSmileDetection } from '../hooks/useSmileDetection'

// Sub-components
import { CameraPreview } from './capture/CameraPreview'
import { CameraControls } from './capture/CameraControls'

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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Smile detection (disabled on mobile)
  const smileDetection = useSmileDetection(videoRef, isCameraActive && !isMobile, 500)

  const startCamera = async () => {
    try {
      setError(null)
      setIsCameraActive(false)
      setAriaLive('Starting camera...')

      // Check for secure context (required for camera access on mobile)
      if (window.isSecureContext === false) {
        throw new Error('Camera access requires a secure connection (HTTPS). If testing on mobile, please use localhost or setup HTTPS.')
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser.')
      }

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
              setError(`Video play error: ${err.message}`)
            })
          }
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      let errorMsg = 'Unable to access camera.'

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMsg = 'Camera permission denied. Please allow camera access in your browser settings.'
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No camera found on this device.'
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'Camera is in use by another application.'
        } else {
          errorMsg = err.message
        }
      }

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
      <div className="glass-panel p-8 relative overflow-hidden group">
        {/* Decorative glow behind the card */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary-dim)] text-lg">1</span>
          Capture Your Photo
        </h2>

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
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            role="alert"
            tabIndex={-1}
          >
            <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">Error</p>
            <p className="text-red-200 text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="space-y-8 w-full relative z-10">
          <CameraPreview
            videoRef={videoRef}
            isCameraActive={isCameraActive}
            smileDetection={smileDetection}
            isMobile={isMobile}
          />

          <canvas ref={canvasRef} className="hidden" />

          <CameraControls
            isCameraActive={isCameraActive}
            smileDetection={smileDetection}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onSwitchCamera={switchCamera}
            onCapture={capturePhoto}
          />

          <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-sm text-gray-300">
                  <strong>Pro Tip:</strong> Ensure you have good lighting for the best detection results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
