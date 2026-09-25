import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isMac, platformAlt } from '../utils/env'

export type Shortcut = {
  action: string
  key: string
  defaultKey: string
  category: string
  status?: ShortcutStatus
}

export enum ShortcutStatus {
  Registered = 'registered',
  Failed = 'failed',
  /** Shortcut is available to register but not registered. */
  Available = 'available'
}

interface ShortcutsState {
  shortcuts: Record<string, Shortcut>
}

interface ShortcutsStore extends ShortcutsState {
  updateShortcut: (action: string, shortcut: Shortcut) => void
  updateShortcuts: (shortcuts: Record<string, Shortcut>) => void
  resetShortcuts: () => void
}

type PersistedShortcutsState = {
  shortcuts?: Record<string, Shortcut>
}

function isPersistedShortcutsState(value: unknown): value is PersistedShortcutsState {
  return typeof value === 'object' && value !== null && 'shortcuts' in value
}

const defaultShortcuts: Record<string, Omit<Shortcut, 'defaultKey'>> = {
  hideOrShowMainWindow: {
    action: 'hideOrShowMainWindow',
    key: `${platformAlt}+H`,
    category: 'Window Management'
  },
  ignoreOrEnableMouse: {
    action: 'ignoreOrEnableMouse',
    key: `${platformAlt}+M`,
    category: 'Window Management'
  },
  increaseOpacity: {
    action: 'increaseOpacity',
    key: `${platformAlt}+Shift+Up`,
    category: 'Window Management'
  },
  decreaseOpacity: {
    action: 'decreaseOpacity',
    key: `${platformAlt}+Shift+Down`,
    category: 'Window Management'
  },
  takeScreenshot: {
    action: 'takeScreenshot',
    key: `${platformAlt}+Enter`,
    category: 'Screenshot & AI'
  },
  appendScreenshot: {
    action: 'appendScreenshot',
    key: `${platformAlt}+Shift+Enter`,
    category: 'Screenshot & AI'
  },
  stopSolutionStream: {
    action: 'stopSolutionStream',
    key: `${platformAlt}+.`,
    category: 'Screenshot & AI'
  },
  previousApiProfile: {
    action: 'previousApiProfile',
    key: `${platformAlt}+[`,
    category: 'Screenshot & AI'
  },
  nextApiProfile: {
    action: 'nextApiProfile',
    key: `${platformAlt}+]`,
    category: 'Screenshot & AI'
  },
  toggleTranscription: {
    action: 'toggleTranscription',
    key: `${platformAlt}+T`,
    category: 'Screenshot & AI'
  },
  clearTranscription: {
    action: 'clearTranscription',
    key: `${platformAlt}+Shift+T`,
    category: 'Screenshot & AI'
  },
  pageUp: { action: 'pageUp', key: 'CommandOrControl+J', category: 'Navigation' },
  pageDown: { action: 'pageDown', key: 'CommandOrControl+K', category: 'Navigation' },
  moveMainWindowUp: {
    action: 'moveMainWindowUp',
    key: 'CommandOrControl+Up',
    category: 'Window Movement'
  },
  moveMainWindowDown: {
    action: 'moveMainWindowDown',
    key: 'CommandOrControl+Down',
    category: 'Window Movement'
  },
  moveMainWindowLeft: {
    action: 'moveMainWindowLeft',
    key: 'CommandOrControl+Left',
    category: 'Window Movement'
  },
  moveMainWindowRight: {
    action: 'moveMainWindowRight',
    key: 'CommandOrControl+Right',
    category: 'Window Movement'
  }
}

export const useShortcutsStore = create<ShortcutsStore>()(
  persist(
    (set) => ({
      shortcuts: Object.fromEntries(
        Object.entries(defaultShortcuts).map(([action, shortcut]) => [
          action,
          { ...shortcut, defaultKey: shortcut.key }
        ])
      ),
      updateShortcut: (action, shortcut) => {
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [action]: shortcut
          }
        }))
      },
      updateShortcuts: (shortcuts) => {
        set({ shortcuts })
      },
      resetShortcuts: () => {
        set({
          shortcuts: Object.fromEntries(
            Object.entries(defaultShortcuts).map(([action, shortcut]) => [
              action,
              { ...shortcut, defaultKey: shortcut.key }
            ])
          )
        })
      }
    }),
    {
      name: 'interview-coder-shortcuts',
      version: 5,
      migrate: (state: unknown, version: number) => {
        if (!isPersistedShortcutsState(state) || !state.shortcuts) return state as ShortcutsStore
        // Merge in any new default shortcuts that are missing
        const defaults = Object.fromEntries(
          Object.entries(defaultShortcuts).map(([action, shortcut]) => [
            action,
            { ...shortcut, defaultKey: shortcut.key }
          ])
        )
        const merged = {
          ...state,
          shortcuts: {
            ...defaults,
            ...state.shortcuts
          }
        } as ShortcutsStore

        // v2→v3: On Windows, migrate Alt shortcuts to CommandOrControl (Ctrl)
        if (version < 3 && !isMac) {
          for (const [action, shortcut] of Object.entries(merged.shortcuts)) {
            merged.shortcuts[action] = {
              ...shortcut,
              key: shortcut.key.replace(/\bAlt\b/g, 'CommandOrControl'),
              defaultKey: shortcut.defaultKey.replace(/\bAlt\b/g, 'CommandOrControl')
            }
          }
        }

        return merged
      },
      merge: (persisted, current) => {
        const state = persisted as PersistedShortcutsState
        const stored = state?.shortcuts ?? {}
        // Shortcuts added after this user last saved must still appear, so the
        // defaults are the floor and the stored bindings win on top of them.
        // `merge` runs on every rehydrate, unlike `migrate` which only runs
        // when the version changes.
        const shortcuts = { ...current.shortcuts }
        for (const [action, shortcut] of Object.entries(stored)) {
          if (shortcuts[action]) shortcuts[action] = shortcut
        }
        // `switchApiProfile` was replaced by previous/nextApiProfile; drop it
        // so a stale binding cannot be recorded, nor linger in localStorage
        delete (shortcuts as Record<string, unknown>).switchApiProfile
        return { ...current, shortcuts }
      }
    }
  )
)
