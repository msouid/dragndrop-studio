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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-primary-glow)] opacity-20 blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-secondary-glow)] opacity-20 blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-[var(--color-border-glass)] bg-[var(--color-bg-glass)]">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary-glow)] to-[var(--color-secondary-glow)] flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-2xl">💎</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Luce <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Studio</span>
              </h1>
            </div>
          </div>
          <nav className="hidden md:flex gap-6">
            {/* Placeholder nav items for visual completeness */}
            <span className="text-sm font-medium text-gray-300 hover:text-white cursor-pointer transition-colors">Gallery</span>
            <span className="text-sm font-medium text-gray-300 hover:text-white cursor-pointer transition-colors">About</span>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">
            Design Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Perfect Smile</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Experience luxury dental jewelry customization with our advanced 3D studio.
          </p>
        </div>

        {!capturedPhoto ? (
          <PhotoCapture onCapture={handlePhotoCapture} />
        ) : (
          <Canvas photoUrl={capturedPhoto} onRetake={handleRetake} />
        )}
      </main>
    </div>
  )
}
