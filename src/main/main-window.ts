import { join } from 'node:path'
import { shell, BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { createToolbarWindow } from './toolbar-window'

export function applyContentProtection(window: BrowserWindow, forceReset = false): void {
  if (!window || window.isDestroyed()) return

  if (forceReset && process.platform === 'win32') {
    window.setContentProtection(false)
  }

  window.setContentProtection(true)
}

export function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: '',
    frame: false,
    transparent: true,
    hasShadow: false,
    // Native resize toggling breaks transparency on Windows; renderer handles own resizing.
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Soft-hide parks the window off-screen, which makes Windows report the
      // window as occluded; with throttling on, the renderer freezes until the
      // window is focused again (queued IPC flushes on click, toolbar hover
      // dwell timers never fire).
      backgroundThrottling: false
    }
  })

  // Store reference to mainWindow globally
  global.mainWindow = mainWindow
  // Enable capture protection before the first show, including the inline follow-up input.
  applyContentProtection(mainWindow)
  // The toolbar follows the main window's position and visibility on its own
  createToolbarWindow(mainWindow)

  mainWindow.setMenuBarVisibility(false)

  // Keep the native window title empty. Chromium's window picker (Edge/Chrome
  // "share a window") enumerates windows with WebRTC's kIgnoreUntitled flag and
  // drops the ones whose title is empty, so an untitled window never shows up in
  // the list. setContentProtection only blanks the pixels; it does not hide the
  // window from enumeration. The window is frameless, so no title is ever drawn.
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault()
    mainWindow.setTitle('')
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    // Dock visibility is handled at startup (index.ts) and via renderer sync
    // (settings.ts); the window's own show event must not force it back on.
    applyContentProtection(mainWindow)

    // Reclaim top position when other apps steal it
    mainWindow.on('always-on-top-changed', (_event, isAlwaysOnTop) => {
      if (!isAlwaysOnTop && mainWindow.isVisible() && !mainWindow.isDestroyed()) {
        // Only re-set the flag; avoid moveTop() to not disturb other window focus
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
      }
    })
  })

  mainWindow.on('show', () => {
    applyContentProtection(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
