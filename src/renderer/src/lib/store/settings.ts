import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import codingPrompt from './prompts/coding.md?raw'
import englishExamPrompt from './prompts/english-exam.md?raw'
import aptitudeTestPrompt from './prompts/aptitude-test.md?raw'
import generalQaPrompt from './prompts/general-qa.md?raw'
import { DEFAULT_THEME, type Theme } from '../theme'
import { normalizeBaseURL, resolveLinkedModel, type ModelSwitchReason } from '../providers'
import { createProfile, type ApiProfile } from '../api-profiles'

export type { Theme }
export type { ApiProfile }

export interface PromptScene {
  id: string
  name: string
  prompt: string
  isPreset: boolean
}

export const CODING_SCENE_ID = 'coding'

/** Default prompts for all preset scenes, maintained as Markdown files under ./prompts */
export const PRESET_SCENE_PROMPTS: Record<string, string> = {
  [CODING_SCENE_ID]: codingPrompt,
  'english-exam': englishExamPrompt,
  'aptitude-test': aptitudeTestPrompt,
  'general-qa': generalQaPrompt
}

const createPresetScenes = (): PromptScene[] => [
  {
    id: CODING_SCENE_ID,
    name: '解算法题',
    prompt: PRESET_SCENE_PROMPTS[CODING_SCENE_ID],
    isPreset: true
  },
  {
    id: 'english-exam',
    name: '英语考试',
    prompt: PRESET_SCENE_PROMPTS['english-exam'],
    isPreset: true
  },
  {
    id: 'aptitude-test',
    name: '能力测评',
    prompt: PRESET_SCENE_PROMPTS['aptitude-test'],
    isPreset: true
  },
  {
    id: 'general-qa',
    name: '通用问答',
    prompt: PRESET_SCENE_PROMPTS['general-qa'],
    isPreset: true
  }
]

/** Derive the `customPrompt` (the system prompt used by the main process) from the active scene */
function composeCustomPrompt(scenes: PromptScene[], activeSceneId: string): string {
  const scene = scenes.find((s) => s.id === activeSceneId)
  if (!scene) return PRESET_SCENE_PROMPTS[CODING_SCENE_ID]
  // An emptied preset scene falls back to its default prompt
  return scene.prompt.trim() || PRESET_SCENE_PROMPTS[scene.id] || ''
}

/** How captured screenshots are shown on the main page, ordered by how much room they take */
export type ScreenshotDisplay = 'none' | 'count' | 'gallery'

/** Immutably replace one profile, leaving the rest untouched */
function patchProfile(
  profiles: ApiProfile[],
  id: string,
  patch: Partial<Omit<ApiProfile, 'id'>>
): ApiProfile[] {
  return profiles.map((p) => (p.id === id ? { ...p, ...patch } : p))
}

/** Same as `patchProfile`, but a no-op when `id` matches nothing */
function patchActiveProfile(
  profiles: ApiProfile[],
  id: string,
  patch: Partial<Omit<ApiProfile, 'id'>>
): ApiProfile[] {
  return profiles.some((p) => p.id === id) ? patchProfile(profiles, id, patch) : profiles
}

export const OPACITY_MIN = 0.1
export const OPACITY_MAX = 1
export const OPACITY_STEP = 0.05

interface Settings {
  /** Window colour scheme; `light` is a white background with dark text */
  theme: Theme
  /** Saved AI endpoints; the active one is mirrored onto the fields below */
  apiProfiles: ApiProfile[]
  /** Which entry of `apiProfiles` is in use */
  activeProfileId: string
  /**
   * Whether the user has ever saved an API key. The welcome dialog keys off
   * this rather than the live `apiKey`, so switching to a profile that is still
   * blank does not pop the dialog back up over what the user is doing.
   */
  hasConfiguredApi: boolean
  apiBaseURL: string
  /** API Base URL entries the user created from the picker, kept as a shortcut list */
  customBaseURLs: string[]
  apiKey: string
  model: string
  /** Custom models created before they were kept per API Base URL; offered for every URL */
  customModels: string[]
  /** Custom models the user created, keyed by normalized API Base URL */
  customModelsByBaseURL: Record<string, string[]>
  /** Last model used with each normalized API Base URL, restored when switching back */
  modelByBaseURL: Record<string, string>
  customPrompt: string

  scenes: PromptScene[]
  activeSceneId: string

  opacity: number
  /** Allow resizing the main window and overlay toolbar */
  resizable: boolean
  /** Show the click-through overlay toolbar above the main window */
  showOverlayToolbar: boolean
  /** 隐藏主页面底部的快捷键提醒文字 */
  hideShortcutHints: boolean
  /** Dwell time in ms before hovering a toolbar button fires it; 0 disables hover triggering */
  toolbarHoverDelay: number
  /** How the captured screenshots are shown above the solution */
  screenshotDisplay: ScreenshotDisplay

  screenshotAutoSave: boolean
  screenshotDir: string

  /** 把 AI 生成的代码自动保存为源文件（算法题解答） */
  codeAutoSave: boolean
  /** 代码保存目录；为空时不保存 */
  codeSaveDir: string
  /** 把 AI 生成的代码自动复制到系统剪贴板 */
  codeCopyToClipboard: boolean

  dashscopeApiKey: string

  hideDockIcon: boolean

  audioInputDeviceId: string
  audioOutputDeviceId: string
}

/** A model change made on the user's behalf when the API Base URL changed */
export interface ModelSwitch {
  from: string
  to: string
  reason: ModelSwitchReason
}

interface SettingsStore extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  /** Change the API Base URL and carry the model over to the new platform's spelling */
  setApiBaseURL: (url: string) => ModelSwitch | null
  /** Change the model, remembering it for the current API Base URL */
  setModel: (model: string) => void
  /** Switch to another saved profile, carrying the live fields with it */
  setActiveProfile: (id: string) => void
  /** Add a profile, either blank or copied from the active one */
  addProfile: (name: string, copyActive?: boolean) => string
  /** Rename a profile */
  renameProfile: (id: string, name: string) => void
  /** Update one field of a profile; keeps the live fields in sync when it is active */
  updateProfile: (id: string, patch: Partial<Omit<ApiProfile, 'id'>>) => void
  /** Remove a profile; refuses to remove the last one */
  removeProfile: (id: string) => boolean
  /** Step to the next profile, for the keyboard shortcut */
  cycleProfile: (step?: number) => ApiProfile | null
  /** Record that an API key has been saved, so the welcome dialog stays away */
  markApiConfigured: () => void
  /**
   * Change one of the live credential fields, keeping the active profile's
   * own copy in step. Every settings-page input must go through this rather
   * than `updateSetting`, otherwise the edit lives only in the flat fields and
   * is lost the moment the user switches profiles or restarts.
   */
  updateCredential: (patch: Partial<Pick<ApiProfile, 'apiBaseURL' | 'apiKey' | 'model'>>) => void
  addCustomModel: (baseURL: string, model: string) => void
  removeCustomModel: (baseURL: string, model: string) => void
  /** Step the window opacity within [OPACITY_MIN, OPACITY_MAX] */
  adjustOpacity: (delta: number) => void
  syncSettings: (settings: Partial<Settings>) => void
  setActiveScene: (id: string) => void
  updateScenePrompt: (id: string, prompt: string) => void
  addScene: (name: string) => string
  removeScene: (id: string) => void
}

const defaultSettings: Settings = {
  theme: DEFAULT_THEME,
  // Seeded on rehydrate; the id must exist up front so the active profile resolves
  apiProfiles: [],
  activeProfileId: 'profile-default',
  hasConfiguredApi: false,
  apiBaseURL: '',
  customBaseURLs: [],
  apiKey: '',
  model: '',
  customModels: [],
  customModelsByBaseURL: {},
  modelByBaseURL: {},
  customPrompt: PRESET_SCENE_PROMPTS[CODING_SCENE_ID],
  scenes: createPresetScenes(),
  activeSceneId: CODING_SCENE_ID,

  opacity: 0.8,
  resizable: true,
  showOverlayToolbar: true,
  hideShortcutHints: false,
  toolbarHoverDelay: 1000,
  screenshotDisplay: 'gallery',

  screenshotAutoSave: false,
  screenshotDir: '',

  codeAutoSave: false,
  codeSaveDir: '',
  codeCopyToClipboard: false,

  dashscopeApiKey: '',

  hideDockIcon: false,

  audioInputDeviceId: '',
  audioOutputDeviceId: ''
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      updateSetting: (key, value) => {
        set({ [key]: value })
        // Setting a key from anywhere in the UI means the user is set up, so
        // the welcome dialog stays away from then on (see `hasConfiguredApi`)
        if (key === 'apiKey' && typeof value === 'string' && value.trim()) {
          set({ hasConfiguredApi: true })
        }
      },
      setApiBaseURL: (url) => {
        const state = get()
        const from = normalizeBaseURL(state.apiBaseURL)
        const to = normalizeBaseURL(url)
        if (from === to) {
          set({ apiBaseURL: url })
          return null
        }
        const modelByBaseURL = { ...state.modelByBaseURL }
        if (state.model) modelByBaseURL[from] = state.model
        const linked = resolveLinkedModel({
          model: state.model,
          baseURL: to,
          remembered: modelByBaseURL[to],
          customModels: state.customModelsByBaseURL[to] ?? []
        })
        const model = linked?.model ?? state.model
        if (model) modelByBaseURL[to] = model
        set({
          apiBaseURL: url,
          model,
          modelByBaseURL,
          apiProfiles: patchActiveProfile(state.apiProfiles, state.activeProfileId, {
            apiBaseURL: url,
            model
          })
        })
        return linked && linked.model !== state.model
          ? { from: state.model, to: linked.model, reason: linked.reason }
          : null
      },
      setModel: (model) => {
        set((state) => {
          const key = normalizeBaseURL(state.apiBaseURL)
          const modelByBaseURL = { ...state.modelByBaseURL }
          if (model) modelByBaseURL[key] = model
          else delete modelByBaseURL[key]
          // The active profile owns the value, so keep it in step
          return {
            model,
            modelByBaseURL,
            apiProfiles: patchActiveProfile(state.apiProfiles, state.activeProfileId, { model })
          }
        })
      },
      setActiveProfile: (id) => {
        set((state) => {
          const profile = state.apiProfiles.find((p) => p.id === id)
          if (!profile) return {}
          // Restore the profile's own model spelling for its platform
          return {
            activeProfileId: id,
            apiBaseURL: profile.apiBaseURL,
            apiKey: profile.apiKey,
            model: profile.model
          }
        })
      },
      addProfile: (name, copyActive = false) => {
        const state = get()
        const source = copyActive
          ? state.apiProfiles.find((p) => p.id === state.activeProfileId)
          : undefined
        const profile = createProfile({
          name,
          apiBaseURL: source?.apiBaseURL ?? '',
          apiKey: source?.apiKey ?? '',
          model: source?.model ?? ''
        })
        set({
          apiProfiles: [...state.apiProfiles, profile],
          activeProfileId: profile.id,
          apiBaseURL: profile.apiBaseURL,
          apiKey: profile.apiKey,
          model: profile.model
        })
        return profile.id
      },
      renameProfile: (id, name) => {
        set((state) => ({
          apiProfiles: patchProfile(state.apiProfiles, id, { name })
        }))
      },
      updateProfile: (id, patch) => {
        set((state) => {
          const apiProfiles = patchProfile(state.apiProfiles, id, patch)
          // Any key saved anywhere means the user is set up
          const configured =
            state.hasConfiguredApi ||
            (typeof patch.apiKey === 'string' && patch.apiKey.trim() !== '')
          // The active profile is mirrored onto the live fields the main
          // process reads, so editing it must update those too
          if (id !== state.activeProfileId) return { apiProfiles, hasConfiguredApi: configured }
          return {
            apiProfiles,
            hasConfiguredApi: configured,
            ...(patch.apiBaseURL !== undefined ? { apiBaseURL: patch.apiBaseURL } : {}),
            ...(patch.apiKey !== undefined ? { apiKey: patch.apiKey } : {}),
            ...(patch.model !== undefined ? { model: patch.model } : {})
          }
        })
      },
      removeProfile: (id) => {
        const state = get()
        if (state.apiProfiles.length <= 1) return false
        const index = state.apiProfiles.findIndex((p) => p.id === id)
        if (index === -1) return false

        const apiProfiles = state.apiProfiles.filter((p) => p.id !== id)
        if (id !== state.activeProfileId) {
          set({ apiProfiles })
          return true
        }
        // Removing the active profile hands control to its neighbour
        const next = apiProfiles[Math.min(index, apiProfiles.length - 1)]
        set({
          apiProfiles,
          activeProfileId: next.id,
          apiBaseURL: next.apiBaseURL,
          apiKey: next.apiKey,
          model: next.model
        })
        return true
      },
      cycleProfile: (step = 1) => {
        const state = get()
        if (state.apiProfiles.length < 2) return null
        const index = state.apiProfiles.findIndex((p) => p.id === state.activeProfileId)
        if (index === -1) return null
        const count = state.apiProfiles.length
        const next = state.apiProfiles[(((index + step) % count) + count) % count]
        get().setActiveProfile(next.id)
        return next
      },
      markApiConfigured: () => {
        if (!get().hasConfiguredApi) set({ hasConfiguredApi: true })
      },
      updateCredential: (patch) => {
        set((state) => {
          const configured =
            state.hasConfiguredApi ||
            (typeof patch.apiKey === 'string' && patch.apiKey.trim() !== '')
          return {
            ...patch,
            hasConfiguredApi: configured,
            apiProfiles: patchActiveProfile(state.apiProfiles, state.activeProfileId, patch)
          }
        })
      },
      addCustomModel: (baseURL, model) => {
        set((state) => {
          const key = normalizeBaseURL(baseURL)
          const list = state.customModelsByBaseURL[key] ?? []
          if (list.includes(model) || state.customModels.includes(model)) return {}
          return {
            customModelsByBaseURL: { ...state.customModelsByBaseURL, [key]: [...list, model] }
          }
        })
      },
      removeCustomModel: (baseURL, model) => {
        set((state) => {
          const key = normalizeBaseURL(baseURL)
          const customModelsByBaseURL = { ...state.customModelsByBaseURL }
          const list = (customModelsByBaseURL[key] ?? []).filter((m) => m !== model)
          if (list.length > 0) customModelsByBaseURL[key] = list
          else delete customModelsByBaseURL[key]
          return {
            customModels: state.customModels.filter((m) => m !== model),
            customModelsByBaseURL
          }
        })
      },
      adjustOpacity: (delta) => {
        const raw = get().opacity + delta
        // Round to 2 decimals to avoid float drift across repeated presses
        const opacity = Math.min(OPACITY_MAX, Math.max(OPACITY_MIN, Math.round(raw * 100) / 100))
        set({ opacity })
      },
      syncSettings: (settings) => {
        set(settings)
      },
      setActiveScene: (id) => {
        set((state) => ({
          activeSceneId: id,
          customPrompt: composeCustomPrompt(state.scenes, id)
        }))
      },
      updateScenePrompt: (id, prompt) => {
        set((state) => {
          const scenes = state.scenes.map((s) => (s.id === id ? { ...s, prompt } : s))
          return {
            scenes,
            customPrompt: composeCustomPrompt(scenes, state.activeSceneId)
          }
        })
      },
      addScene: (name) => {
        const id = `custom-${Date.now()}`
        set((state) => {
          const scenes = [...state.scenes, { id, name, prompt: '', isPreset: false }]
          return {
            scenes,
            activeSceneId: id,
            customPrompt: composeCustomPrompt(scenes, id)
          }
        })
        return id
      },
      removeScene: (id) => {
        const scene = get().scenes.find((s) => s.id === id)
        if (!scene || scene.isPreset) return
        set((state) => {
          const scenes = state.scenes.filter((s) => s.id !== id)
          const activeSceneId = state.activeSceneId === id ? CODING_SCENE_ID : state.activeSceneId
          return {
            scenes,
            activeSceneId,
            customPrompt: composeCustomPrompt(scenes, activeSceneId)
          }
        })
      }
    }),
    {
      name: 'interview-coder-settings',
      version: 8,
      migrate: (persisted, version) => {
        const state = persisted as Partial<Settings>
        // Drop the legacy codeLanguage field (language now lives in the prompt text)
        delete (state as Record<string, unknown>).codeLanguage
        if (version < 8) {
          // Hover-delay options are now 0.5s / 1s / 2s; snap the retired ones
          // so the Select still matches an item
          if (state.toolbarHoverDelay === 800 || state.toolbarHoverDelay === 1200) {
            state.toolbarHoverDelay = 1000
          }
        }
        if (version < 5) {
          // Convert the legacy free-form customPrompt into a custom scene
          const scenes = createPresetScenes()
          let activeSceneId = CODING_SCENE_ID
          const legacyPrompt = (state.customPrompt ?? '').trim()
          if (legacyPrompt) {
            const id = `custom-${Date.now()}`
            scenes.push({ id, name: '自定义场景', prompt: legacyPrompt, isPreset: false })
            activeSceneId = id
          }
          return { ...state, scenes, activeSceneId }
        }
        return state
      },
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<Settings>) }
        // Ensure preset scenes always exist (keep user-edited prompts),
        // so presets added in future versions show up for existing users
        const persistedScenes = Array.isArray(state.scenes) ? state.scenes : []
        state.scenes = [
          ...createPresetScenes().map((p) => {
            const saved = persistedScenes.find((s) => s.id === p.id)
            // Restore the default prompt if a preset scene was left empty
            return saved?.prompt.trim() ? saved : p
          }),
          ...persistedScenes.filter((s) => !s.isPreset)
        ]
        if (!state.scenes.some((s) => s.id === state.activeSceneId)) {
          state.activeSceneId = CODING_SCENE_ID
        }
        state.customPrompt = composeCustomPrompt(state.scenes, state.activeSceneId)
        state.apiProfiles = reconcileApiProfiles(state)
        return state
      }
    }
  )
)

/**
 * Keep the profile list and the live API fields consistent after a rehydrate.
 *
 * Runs on every load, which covers all the cases at once: a fresh install (no
 * profiles yet), an upgrade from a version that had only the flat fields (adopt
 * them as the first profile, so nobody loses the key they already entered), and
 * an ordinary load (trust the stored list).
 */
function reconcileApiProfiles(state: Settings): ApiProfile[] {
  const profiles = Array.isArray(state.apiProfiles) ? state.apiProfiles : []
  const active = profiles.find((p) => p.id === state.activeProfileId)

  if (profiles.length === 0) {
    const seeded: ApiProfile = {
      id: state.activeProfileId || 'profile-default',
      name: '配置1',
      apiBaseURL: state.apiBaseURL ?? '',
      apiKey: state.apiKey ?? '',
      model: state.model ?? ''
    }
    state.activeProfileId = seeded.id
    state.hasConfiguredApi = !!seeded.apiKey.trim()
    return [seeded]
  }

  if (!active) {
    // The stored active id points nowhere (removed by hand, or restored from a
    // backup): fall back to the first profile rather than leaving nothing set
    const first = profiles[0]
    state.activeProfileId = first.id
    state.apiBaseURL = first.apiBaseURL
    state.apiKey = first.apiKey
    state.model = first.model
    state.hasConfiguredApi = hasAnyApiKey(profiles)
    return profiles
  }

  // Upgrades from before this flag existed: any saved key counts as configured,
  // so an existing user is never met by the welcome dialog again
  state.hasConfiguredApi = state.hasConfiguredApi || hasAnyApiKey(profiles)

  // The active profile owns the credentials and the flat fields are its mirror
  // — the ones the main process reads to send requests and take screenshots.
  // The profile wins, so the stored URL / key / model come back on restart.
  const resolved = {
    apiBaseURL: active.apiBaseURL || state.apiBaseURL,
    apiKey: active.apiKey || state.apiKey,
    model: active.model || state.model
  }
  state.apiBaseURL = resolved.apiBaseURL
  state.apiKey = resolved.apiKey
  state.model = resolved.model

  // A profile saved before these fields existed adopts whatever the flat
  // fields held, so an upgrade never silently blanks the user's credentials
  const needsSeeding =
    active.apiBaseURL !== resolved.apiBaseURL ||
    active.apiKey !== resolved.apiKey ||
    active.model !== resolved.model

  return needsSeeding ? patchProfile(profiles, active.id, resolved) : profiles
}

/** Whether at least one profile has a usable API key */
function hasAnyApiKey(profiles: ApiProfile[]): boolean {
  return profiles.some((p) => (p.apiKey ?? '').trim() !== '')
}
