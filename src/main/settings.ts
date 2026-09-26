import { app, dialog, ipcMain } from 'electron'
import { setToolbarOpacity, syncToolbarSettings } from './toolbar-window'

ipcMain.handle('getAppVersion', () => {
  return app.getVersion()
})

ipcMain.handle('getAppSettings', () => {
  return settings
})

ipcMain.handle('updateAppSettings', (_event, _settings) => {
  Object.assign(settings, _settings)
  if ('hideDockIcon' in _settings) {
    applyDockVisibility(settings.hideDockIcon)
  }
  if ('opacity' in _settings) {
    setToolbarOpacity(settings.opacity)
  }
  if ('toolbarHoverDelay' in _settings || 'theme' in _settings) {
    syncToolbarSettings({
      hoverDelay: settings.toolbarHoverDelay,
      theme: settings.theme
    })
  }
})

/** Show/hide the macOS dock icon. No-op on other platforms. */
export function applyDockVisibility(hidden: boolean): void {
  if (process.platform !== 'darwin') return
  if (hidden) {
    app.dock?.hide()
  } else {
    app.dock?.show()
  }
}

ipcMain.handle('selectScreenshotDir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择截图保存目录'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle('selectCodeDir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择代码保存目录'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

export const settings = {
  /** Window colour scheme, kept in sync with the renderer; see renderer lib/theme.ts */
  theme: 'dark' as 'dark' | 'light',
  apiBaseURL: process.env.API_BASE_URL || '',
  apiKey: process.env.API_KEY || '',
  model: process.env.MODEL || '',
  customPrompt: '',
  /** Kept in sync with the renderer so the overlay toolbar can match the main window */
  opacity: 0.8,
  /**
   * Dwell time in ms before hovering a toolbar button fires it; 0 disables hover
   * triggering. The real default lives in the renderer store: App.tsx fills blank
   * renderer fields from here, so a truthy default would overwrite a user's "off".
   */
  toolbarHoverDelay: 0,
  screenshotAutoSave: false,
  screenshotDir: '',
  /** Save the code block of a finished answer as a source file */
  codeAutoSave: false,
  codeSaveDir: '',
  /** Base file name for saved code; blank falls back to `Test` */
  codeFileBaseName: 'Test',
  /** `sequence` appends a number (Test1, Test2); `overwrite` reuses one name */
  codeNamingMode: 'sequence' as 'sequence' | 'overwrite',
  /** Copy the code block of a finished answer to the system clipboard */
  codeCopyToClipboard: false,
  dashscopeApiKey: '',
  hideDockIcon: false,
  audioInputDeviceId: '',
  audioOutputDeviceId: ''
}

export type AppSettings = typeof settings
