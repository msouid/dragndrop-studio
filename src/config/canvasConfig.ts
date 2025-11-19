/**
 * Canvas Configuration
 * Centralized configuration for canvas, item, and editing operations
 */

// Item sizing constraints
export const CANVAS_CONFIG = {
  // Item size management
  item: {
    defaultSize: 40,
    minSize: 20,
    maxSize: 200,
  },

  // Rotation settings
  rotation: {
    step: 15, // degrees
  },

  // Resizing
  resize: {
    step: 10, // pixels
    debounceMs: 100,
  },

  // Drag and drop
  drag: {
    activationDistance: 5, // pixels before drag activates
    itemOffset: 20, // half of default item size for centering
  },

  // Camera capture
  camera: {
    video: {
      ideal: {
        width: 1280,
        height: 720,
      },
    },
    placeholder: {
      minHeight: 300, // mobile
      minHeightLg: 400, // desktop
    },
  },

  // Display
  display: {
    gridCols: {
      mobile: 1,
      lg: 3,
    },
  },
}

// For backward compatibility and easier usage
export const DEFAULT_ITEM_SIZE = CANVAS_CONFIG.item.defaultSize
export const MIN_ITEM_SIZE = CANVAS_CONFIG.item.minSize
export const MAX_ITEM_SIZE = CANVAS_CONFIG.item.maxSize
export const ROTATION_STEP = CANVAS_CONFIG.rotation.step
export const RESIZE_STEP = CANVAS_CONFIG.resize.step
export const RESIZE_DEBOUNCE_MS = CANVAS_CONFIG.resize.debounceMs
export const DRAG_ACTIVATION_DISTANCE = CANVAS_CONFIG.drag.activationDistance
export const ITEM_OFFSET = CANVAS_CONFIG.drag.itemOffset
