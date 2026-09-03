import { desktopCapturer, screen, type NativeImage } from 'electron'
import { selectScreenshotSource, type ScreenshotSourceSelectionOptions } from './screenshot-source'

export function takeScreenshotImage(
  options: ScreenshotSourceSelectionOptions = {}
): Promise<NativeImage | undefined> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const selectionOptions = options.requirePrimaryDisplay
    ? { ...options, displayCount: screen.getAllDisplays().length }
    : options
  return desktopCapturer
    .getSources({ types: ['screen'], thumbnailSize: primaryDisplay.size })
    .then((sources) => {
      return selectScreenshotSource(sources, String(primaryDisplay.id), selectionOptions)?.thumbnail
    })
    .catch((error) => {
      console.error('Error taking screenshot:', error)
      return undefined
    })
}

export async function takeScreenshot(): Promise<string | undefined> {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return undefined

  const image = await takeScreenshotImage()
  return image?.toPNG().toString('base64')
}
