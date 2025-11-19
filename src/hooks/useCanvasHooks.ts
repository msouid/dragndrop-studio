import { useState, useEffect, useCallback } from 'react'
import { CANVAS_CONFIG } from '../config/canvasConfig'

// Types
export interface PlacedItem {
  id: string
  itemId: string
  image: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export interface CanvasSize {
  width: number
  height: number
}

// Constants from centralized config
const ROTATION_STEP = CANVAS_CONFIG.rotation.step
const MIN_ITEM_SIZE = CANVAS_CONFIG.item.minSize
const MAX_ITEM_SIZE = CANVAS_CONFIG.item.maxSize
const RESIZE_DEBOUNCE_MS = CANVAS_CONFIG.resize.debounceMs

// Utility: Debounce function
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Hook for managing canvas history (undo/redo)
 */
export function useCanvasHistory(initialItems: PlacedItem[] = []) {
  const [history, setHistory] = useState<PlacedItem[][]>([[initialItems]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(initialItems)

  const saveToHistory = useCallback((newItems: PlacedItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newItems)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setPlacedItems(newItems)
  }, [history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setPlacedItems(history[newIndex])
    }
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setPlacedItems(history[newIndex])
    }
  }, [historyIndex, history])

  return {
    placedItems,
    setPlacedItems,
    saveToHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  }
}

/**
 * Hook for managing canvas size with debounced window resize
 */
export function useCanvasSize(photoRef: React.RefObject<HTMLImageElement | null>) {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 })

  useEffect(() => {
    if (!photoRef.current) return

    const updateSize = () => {
      if (photoRef.current) {
        setCanvasSize({
          width: photoRef.current.offsetWidth,
          height: photoRef.current.offsetHeight,
        })
      }
    }

    // Debounce resize events
    const debouncedUpdateSize = debounce(updateSize, RESIZE_DEBOUNCE_MS)

    // Update on load
    photoRef.current.addEventListener('load', updateSize)
    updateSize()

    // Update on resize (debounced)
    window.addEventListener('resize', debouncedUpdateSize)

    return () => {
      if (photoRef.current) {
        photoRef.current.removeEventListener('load', updateSize)
      }
      window.removeEventListener('resize', debouncedUpdateSize)
    }
  }, [photoRef])

  return canvasSize
}

/**
 * Hook for keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, Escape)
 */
export function useKeyboardShortcuts(
  undo: () => void,
  redo: () => void,
  selectedItemId: string | null,
  handleRemoveItem: (id: string) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (Windows) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault()
        redo()
      }
      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault()
        handleRemoveItem(selectedItemId)
      }
      // Escape: Deselect
      if (e.key === 'Escape') {
        // Return true to signal deselection
        const event = new CustomEvent('deselect')
        window.dispatchEvent(event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selectedItemId, handleRemoveItem])
}

/**
 * Hook for item operations (rotate, resize, remove)
 */
export function useItemOperations(
  placedItems: PlacedItem[],
  saveToHistory: (items: PlacedItem[]) => void
) {
  const handleRotate = useCallback(
    (itemId: string, direction: number) => {
      const newItems = placedItems.map((item) =>
        item.id === itemId
          ? { ...item, rotation: (item.rotation + direction * ROTATION_STEP) % 360 }
          : item
      )
      saveToHistory(newItems)
    },
    [placedItems, saveToHistory]
  )

  const handleResize = useCallback(
    (itemId: string, delta: number) => {
      const newItems = placedItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              width: Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, item.width + delta)),
              height: Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, item.height + delta)),
            }
          : item
      )
      saveToHistory(newItems)
    },
    [placedItems, saveToHistory]
  )

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      const newItems = placedItems.filter((item) => item.id !== itemId)
      saveToHistory(newItems)
    },
    [placedItems, saveToHistory]
  )

  return { handleRotate, handleResize, handleRemoveItem }
}

/**
 * Hook for export functionality with loading state and error handling
 */
export function useExportImage(
  photoRef: React.RefObject<HTMLImageElement | null>,
  placedItems: PlacedItem[],
  canvasSize: CanvasSize
) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!photoRef.current) return
    if (isExporting) return

    setIsExporting(true)

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')

      canvas.width = photoRef.current.naturalWidth
      canvas.height = photoRef.current.naturalHeight

      const scaleX = canvas.width / canvasSize.width
      const scaleY = canvas.height / canvasSize.height

      // Draw the photo
      ctx.drawImage(photoRef.current, 0, 0)

      // Load all images first
      const imagePromises = placedItems.map((item) => {
        return new Promise<{ img: HTMLImageElement; item: PlacedItem }>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve({ img, item })
          img.onerror = () => reject(new Error(`Failed to load image: ${item.itemId}`))
          img.src = item.image
        })
      })

      const loadedImages = await Promise.all(imagePromises)

      // Draw all placed items
      loadedImages.forEach(({ img, item }) => {
        ctx.save()
        ctx.translate((item.x + item.width / 2) * scaleX, (item.y + item.height / 2) * scaleY)
        ctx.rotate((item.rotation * Math.PI) / 180)
        ctx.drawImage(
          img,
          (-item.width / 2) * scaleX,
          (-item.height / 2) * scaleY,
          item.width * scaleX,
          item.height * scaleY
        )
        ctx.restore()
      })

      // Download the image
      return new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
          try {
            if (!blob) throw new Error('Failed to create blob')
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `dental-jewelry-${Date.now()}.png`
            a.click()
            URL.revokeObjectURL(url)
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })
    } catch (error) {
      console.error('Export failed:', error)
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to export image: ${message}`)
    } finally {
      setIsExporting(false)
    }
  }, [photoRef, placedItems, canvasSize, isExporting])

  return { handleExport, isExporting }
}
