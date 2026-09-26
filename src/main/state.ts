import { ipcMain } from 'electron'

/**
 * Runs when the page on screen changes. Click-through is suspended while the
 * settings page is up (see `applyIgnoreMouse` in shortcuts.ts), so that file
 * needs to be told when the page comes and goes.
 */
let onPageChange: (() => void) | null = null

export function setPageChangeHandler(handler: () => void): void {
  onPageChange = handler
}

ipcMain.handle('updateAppState', (_event, next: Partial<AppState>) => {
  const wasInSettingsPage = state.inSettingsPage
  Object.assign(state, next)
  if (state.inSettingsPage !== wasInSettingsPage) onPageChange?.()
})

export const state = {
  inCoderPage: false,
  /**
   * Whether the settings page is on screen. Click-through is suspended there:
   * every control needed to turn it back off lives on that page, so applying it
   * would leave the user with a window they cannot click.
   */
  inSettingsPage: false,
  ignoreMouse: false
}

export type AppState = typeof state
