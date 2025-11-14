import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
    key: 'Alt+H',
    category: 'Window Management'
  },
  ignoreOrEnableMouse: {
    action: 'ignoreOrEnableMouse',
    key: 'Alt+M',
    category: 'Window Management'
  },
  takeScreenshot: { action: 'takeScreenshot', key: 'Alt+Enter', category: 'Screenshot & AI' },
  stopSolutionStream: {
    action: 'stopSolutionStream',
    key: 'Alt+.',
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
      version: 2,
      migrate: (state: unknown) => {
        if (!isPersistedShortcutsState(state) || !state.shortcuts) return state as ShortcutsStore
        // Merge in any new default shortcuts that are missing
        const defaults = Object.fromEntries(
          Object.entries(defaultShortcuts).map(([action, shortcut]) => [
            action,
            { ...shortcut, defaultKey: shortcut.key }
          ])
        )
        return {
          ...state,
          shortcuts: {
            ...defaults,
            ...state.shortcuts
          }
        } as ShortcutsStore
      }
    }
  )
)
