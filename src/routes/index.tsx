import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PhotoCapture } from '../components/PhotoCapture'
import Canvas from '../components/Canvas'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)

  const handlePhotoCapture = (photoDataUrl: string) => {
    setCapturedPhoto(photoDataUrl)
  }

  const handleRetake = () => {
    setCapturedPhoto(null)
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-primary-80 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white">
            Dental Jewelry Studio
          </h1>
          <p className="mt-3 text-lg text-white opacity-90">
            Design your perfect smile with luxury dental jewelry
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {!capturedPhoto ? (
          <PhotoCapture onCapture={handlePhotoCapture} />
        ) : (
          <Canvas photoUrl={capturedPhoto} onRetake={handleRetake} />
        )}
      </main>
    </div>
  )
}
