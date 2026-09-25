import { create } from 'zustand'

interface SolutionState {
  isLoading: boolean
  solutionChunks: string[]
  screenshotData: string | null
  errorMessage: string | null
  /** How long the last request took, in ms; null until one has finished */
  durationMs: number | null
}

interface SolutionStore extends SolutionState {
  setIsLoading: (isReceiving: boolean) => void
  addSolutionChunk: (chunk: string) => void
  setSolutionChunks: (chunks: string[]) => void
  setScreenshotData: (data: string | null) => void
  setErrorMessage: (message: string | null) => void
  setDurationMs: (ms: number | null) => void
  clearSolution: () => void
  resetState: () => void
}

const defaultState: SolutionState = {
  isLoading: false,
  solutionChunks: [],
  screenshotData: null,
  errorMessage: null,
  durationMs: null
}

export const useSolutionStore = create<SolutionStore>()((set) => ({
  ...defaultState,
  setIsLoading: (isReceiving) => {
    set({ isLoading: isReceiving })
  },
  addSolutionChunk: (chunk) => {
    set((state) => ({
      solutionChunks: [...state.solutionChunks, chunk]
    }))
  },
  setSolutionChunks: (chunks) => {
    set({ solutionChunks: chunks })
  },
  setScreenshotData: (data) => {
    set({ screenshotData: data })
  },
  setErrorMessage: (message) => {
    set({ errorMessage: message })
  },
  setDurationMs: (ms) => {
    set({ durationMs: ms })
  },
  clearSolution: () => {
    // A new request is starting, so the previous timing no longer applies
    set({ solutionChunks: [], isLoading: false, errorMessage: null, durationMs: null })
  },
  resetState: () => {
    set(defaultState)
  }
}))
