import { join } from 'node:path'
import { BrowserWindow, screen, type Display, type NativeImage, type Rectangle } from 'electron'
import { is } from '@electron-toolkit/utils'
import { normalizeCropRect, type Point, type Rect } from './draft-screenshots'
import { takeScreenshotImage } from './take-screenshot'

type SelectionCallbacks = {
  onImageSelected: (image: string) => void
  onError: (message: string) => void
}

type SelectionState = {
  windows: BrowserWindow[]
  firstPoint: Point | null
  firstDisplayId: number | null
  callbacks: SelectionCallbacks
}

let selection: SelectionState | null = null

function displayRect(display: Display): Rect {
  return display.bounds
}

function toImageCropRect(rect: Rect, display: Display, image: NativeImage): Rectangle | null {
  const imageSize = image.getSize()
  const logicalWidth = display.bounds.width
  const logicalHeight = display.bounds.height
  if (logicalWidth <= 0 || logicalHeight <= 0 || imageSize.width <= 0 || imageSize.height <= 0) {
    return null
  }

  // Screen coordinates are display-global DIP values. NativeImage crop coordinates are pixels.
  const localX = rect.x - display.bounds.x
  const localY = rect.y - display.bounds.y
  const expectedPixelWidth = logicalWidth * display.scaleFactor
  const expectedPixelHeight = logicalHeight * display.scaleFactor
  const imageScaleX = imageSize.width / expectedPixelWidth
  const imageScaleY = imageSize.height / expectedPixelHeight
  const x = Math.round(localX * display.scaleFactor * imageScaleX)
  const y = Math.round(localY * display.scaleFactor * imageScaleY)
  const width = Math.round(rect.width * display.scaleFactor * imageScaleX)
  const height = Math.round(rect.height * display.scaleFactor * imageScaleY)

  if (
    width <= 0 ||
    height <= 0 ||
    x < 0 ||
    y < 0 ||
    x + width > imageSize.width ||
    y + height > imageSize.height
  ) {
    return null
  }

  return { x, y, width, height }
}

function finishSelection(): void {
  const activeSelection = selection
  selection = null
  activeSelection?.windows.forEach((window) => {
    if (!window.isDestroyed()) window.close()
  })
}

function failSelection(message: string): void {
  const callbacks = selection?.callbacks
  finishSelection()
  callbacks?.onError(message)
}

export function cancelRegionSelection(): void {
  finishSelection()
}

export async function recordRegionSelectionClick(): Promise<void> {
  const activeSelection = selection
  if (!activeSelection) return

  const point = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(point)
  const primaryDisplay = screen.getPrimaryDisplay()

  if (!activeSelection.firstPoint) {
    activeSelection.firstPoint = point
    activeSelection.firstDisplayId = display.id
    return
  }

  if (activeSelection.firstDisplayId !== display.id) {
    failSelection('区域截图的两个点必须位于同一屏幕')
    return
  }
  if (display.id !== primaryDisplay.id) {
    failSelection('区域截图仅支持主屏幕')
    return
  }

  const rect = normalizeCropRect(activeSelection.firstPoint, point, displayRect(primaryDisplay))
  if (!rect) {
    failSelection('请选择有效的截图区域')
    return
  }

  const callbacks = activeSelection.callbacks
  finishSelection()
  try {
    const image = await takeScreenshotImage({ requirePrimaryDisplay: true })
    if (!image) {
      callbacks.onError('区域截图失败，请重试')
      return
    }
    const cropRect = toImageCropRect(rect, primaryDisplay, image)
    if (!cropRect) {
      callbacks.onError('截图区域超出主屏幕范围')
      return
    }
    callbacks.onImageSelected(image.crop(cropRect).toPNG().toString('base64'))
  } catch (error) {
    console.error('Failed to capture selected screen region:', error)
    callbacks.onError('区域截图失败，请重试')
  }
}

export function startRegionSelection(callbacks: SelectionCallbacks): void {
  cancelRegionSelection()

  const activeSelection: SelectionState = {
    windows: [],
    firstPoint: null,
    firstDisplayId: null,
    callbacks
  }
  selection = activeSelection

  activeSelection.windows = screen.getAllDisplays().map((display) => {
    const window = new BrowserWindow({
      ...display.bounds,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      focusable: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        backgroundThrottling: false
      }
    })
    window.setMenuBarVisibility(false)
    window.setContentProtection(true)
    window.setAlwaysOnTop(true, 'screen-saver')
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    window.on('closed', () => {
      if (selection === activeSelection) cancelRegionSelection()
    })
    window.once('ready-to-show', () => {
      if (selection !== activeSelection || window.isDestroyed()) return
      window.show()
      window.focus()
    })
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/selection`)
    } else {
      void window.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/selection' })
    }
    return window
  })
}
