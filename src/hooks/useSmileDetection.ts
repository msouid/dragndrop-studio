import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

export interface SmileDetectionResult {
  isSmiling: boolean
  confidence: number
  teethVisible: boolean
  teethVisibilityScore: number
  detectionInProgress: boolean
  error: string | null
  readyToCapture: boolean
}

/**
 * Hook for real-time smile detection using TensorFlow.js and Face Detection API
 * Analyzes video frames to detect if the user is smiling
 */
export function useSmileDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean = true,
  intervalMs: number = 500
) {
  const [detectionResult, setDetectionResult] = useState<SmileDetectionResult>({
    isSmiling: false,
    confidence: 0,
    teethVisible: false,
    teethVisibilityScore: 0,
    detectionInProgress: false,
    error: null,
    readyToCapture: false,
  })

  const modelsLoadedRef = useRef(false)
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isDetectingRef = useRef(false)

  // Initialize face-api models from CDN
  const initializeModels = useCallback(async () => {
    try {
      if (modelsLoadedRef.current) return // Already loaded

      setDetectionResult((prev) => ({
        ...prev,
        error: null,
      }))

      // Load models from CDN (jsdelivr CDN hosts face-api models)
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ])

      modelsLoadedRef.current = true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load face detection models'
      setDetectionResult((prev) => ({
        ...prev,
        error: errorMessage,
        detectionInProgress: false,
      }))
      console.error('Model initialization error:', error)
    }
  }, [])

  // Helper function to detect teeth visibility based on mouth opening
  // Teeth are more visible when mouth is open while smiling
  const analyzeTeethVisibility = useCallback(
    (landmarks: faceapi.WithFaceLandmarks<any>): { visible: boolean; score: number } => {
      try {
        if (!landmarks || !landmarks.landmarks) {
          return { visible: false, score: 0 }
        }

        const points = landmarks.landmarks.getMouth()
        if (points.length === 0) {
          return { visible: false, score: 0 }
        }

        // Calculate mouth opening by measuring vertical distance
        // Top of mouth (average of top points)
        const topPoints = points.slice(0, Math.floor(points.length / 2))
        const bottomPoints = points.slice(Math.floor(points.length / 2))

        const topAvgY = topPoints.reduce((sum: number, p: { y: number }) => sum + p.y, 0) / topPoints.length
        const bottomAvgY = bottomPoints.reduce((sum: number, p: { y: number }) => sum + p.y, 0) / bottomPoints.length

        const mouthOpening = Math.abs(bottomAvgY - topAvgY)

        // Calculate mouth width
        const leftX = Math.min(...points.map((p: { x: number }) => p.x))
        const rightX = Math.max(...points.map((p: { x: number }) => p.x))
        const mouthWidth = rightX - leftX

        // Teeth visibility score based on mouth opening ratio
        const openingRatio = mouthOpening / (mouthWidth || 1)

        // Drastically reduced threshold as per user feedback
        // Was 0.15, now 0.05 to allow for very natural smiles
        const teethVisible = openingRatio > 0.05

        // Normalize score to be extremely generous
        // Any visible opening should give a good score
        const score = Math.min(1, openingRatio * 10)

        return { visible: teethVisible, score }
      } catch (error) {
        console.error('Error analyzing teeth visibility:', error)
        return { visible: false, score: 0 }
      }
    },
    []
  )

  // Perform smile detection on a video frame
  const detectSmile = useCallback(async () => {
    if (!enabled || !videoRef.current || !modelsLoadedRef.current || isDetectingRef.current) {
      return
    }

    isDetectingRef.current = true
    setDetectionResult((prev) => ({
      ...prev,
      detectionInProgress: true,
    }))

    try {
      const video = videoRef.current

      // Detect faces with landmarks and expressions
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()

      if (detections.length === 0) {
        setDetectionResult((prev) => ({
          ...prev,
          isSmiling: false,
          confidence: 0,
          teethVisible: false,
          teethVisibilityScore: 0,
          detectionInProgress: false,
          readyToCapture: false,
        }))
        return
      }

      // Use the first (most prominent) detected face
      const detection = detections[0]

      // Get smile confidence from face expressions
      // Note: face-api.js uses 'happy' for smile
      const smileConfidence = detection.expressions.happy || 0
      const isSmiling = smileConfidence > 0.3 // Threshold of 30% smile confidence

      // Analyze teeth visibility from mouth landmarks
      const teethAnalysis = analyzeTeethVisibility(detection)

      // Ready to capture: smiling AND teeth are visible with good confidence
      const readyToCapture = isSmiling && teethAnalysis.visible && smileConfidence > 0.4

      setDetectionResult((prev) => ({
        ...prev,
        isSmiling,
        confidence: smileConfidence,
        teethVisible: teethAnalysis.visible,
        teethVisibilityScore: teethAnalysis.score,
        detectionInProgress: false,
        error: null,
        readyToCapture,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Smile detection failed'
      console.error('Smile detection error:', error)
      // Don't set error state - detection might fail sometimes due to face not being visible
      setDetectionResult((prev) => ({
        ...prev,
        detectionInProgress: false,
      }))
    } finally {
      isDetectingRef.current = false
    }
  }, [enabled, analyzeTeethVisibility])

  // Setup effect: Initialize models and start detection loop
  useEffect(() => {
    if (!enabled) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
      return
    }

    // Initialize models and start detection
    const setupDetection = async () => {
      await initializeModels()

      if (videoRef.current && modelsLoadedRef.current) {
        // Clear any existing interval
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current)
        }
        // Start new interval
        detectionIntervalRef.current = setInterval(detectSmile, intervalMs)
      }
    }

    setupDetection()

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
    }
  }, [enabled, initializeModels, detectSmile, intervalMs])

  // Cleanup effect: Dispose of model on unmount
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
      // Model disposal is handled by TensorFlow.js
    }
  }, [])

  return detectionResult
}
