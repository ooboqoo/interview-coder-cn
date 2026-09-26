import { useEffect, useState } from 'react'
import { Images } from 'lucide-react'
import { useSettingsStore, type ScreenshotDisplay } from '@/lib/store/settings'
import { useShortcutsStore } from '@/lib/store/shortcuts'
import { useSolutionStore } from '@/lib/store/solution'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import ShortcutRenderer from '@/components/ShortcutRenderer'

const SCROLL_OFFSET = 120

export function AppContent() {
  const {
    screenshotData,
    draftScreenshots,
    solutionChunks,
    errorMessage,
    setScreenshotData,
    setDraftScreenshots,
    setIsLoading,
    addSolutionChunk,
    setErrorMessage,
    clearSolution
  } = useSolutionStore()

  const screenshotDisplay = useSettingsStore((state) => state.screenshotDisplay)

  const [recentScreenshots, setRecentScreenshots] = useState<string[]>([])
  // Main keeps only the last 5 thumbnails, but every screenshot went to the AI
  const [screenshotTotal, setScreenshotTotal] = useState(0)

  useEffect(() => {
    // Listen for screenshot events (latest)
    window.api.onScreenshotTaken((data: string) => {
      setScreenshotData(data)
    })

    // Listen for screenshots-updated events (gallery)
    window.api.onScreenshotsUpdated((screenshots: string[], total: number) => {
      setRecentScreenshots(screenshots)
      setScreenshotTotal(total)
    })
    window.api.onDraftScreenshotsUpdated(setDraftScreenshots)
    void window.api.getDraftScreenshots().then(setDraftScreenshots)

    // New session clear (pictures + answers)
    window.api.onSolutionClear(() => {
      clearSolution()
      setRecentScreenshots([])
      setScreenshotTotal(0)
      setScreenshotData(null)
      setErrorMessage(null)
    })

    // Listen for solution chunks
    window.api.onSolutionChunk((chunk: string) => {
      addSolutionChunk(chunk)
    })

    // AI loading
    window.api.onAiLoadingStart(() => {
      setIsLoading(true)
      setErrorMessage(null) // Clear error when new request starts
    })
    window.api.onAiLoadingEnd(() => {
      setIsLoading(false)
    })

    // Cleanup listeners on unmount
    return () => {
      window.api.removeScreenshotListener()
      window.api.removeScreenshotsUpdatedListener()
      window.api.removeDraftScreenshotsUpdatedListener()
      window.api.removeSolutionChunkListener()
      window.api.removeAiLoadingStartListener()
      window.api.removeAiLoadingEndListener()
      window.api.removeSolutionClearListener()
    }
  }, [
    setScreenshotData,
    setDraftScreenshots,
    clearSolution,
    setIsLoading,
    addSolutionChunk,
    setErrorMessage
  ])

  useEffect(() => {
    window.api.onSolutionComplete(() => {
      setIsLoading(false)
    })
    window.api.onSolutionStopped(() => {
      setIsLoading(false)
    })
    window.api.onSolutionError((message: string) => {
      setIsLoading(false)
      setErrorMessage(message)
    })
    window.api.onOperationError((message: string) => {
      setErrorMessage(message)
    })
    return () => {
      window.api.removeSolutionCompleteListener()
      window.api.removeSolutionStoppedListener()
      window.api.removeSolutionErrorListener()
      window.api.removeOperationErrorListener()
    }
  }, [setIsLoading, setErrorMessage])

  useEffect(() => {
    window.api.onScrollPageUp(() => {
      const container = document.getElementById('app-content')
      if (!container) return
      container.scrollTo({
        top: container.scrollTop - window.innerHeight + SCROLL_OFFSET,
        behavior: 'smooth'
      })
    })
    return () => {
      window.api.removeScrollPageUpListener()
    }
  }, [])

  useEffect(() => {
    window.api.onScrollPageDown(() => {
      const container = document.getElementById('app-content')
      if (!container) return
      container.scrollTo({
        top: container.scrollTop + window.innerHeight - SCROLL_OFFSET,
        behavior: 'smooth'
      })
    })
    return () => {
      window.api.removeScrollPageDownListener()
    }
  }, [])

  // `screenshots-updated` always accompanies `screenshot-taken`; the fallback only
  // covers a render that lands between the two
  const screenshots =
    recentScreenshots.length > 0 ? recentScreenshots : screenshotData ? [screenshotData] : []

  return (
    <div id="app-content" className="px-6 py-4">
      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-red-400 font-medium text-sm">操作失败</p>
            <p className="text-red-300/80 text-sm mt-0.5 break-words">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400/80 hover:text-red-300 flex-shrink-0"
            title="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {draftScreenshots.length > 0 && (
        <div className="mb-4 border-l-2 border-amber-300/70 pl-3">
          <p className="mb-2 text-sm text-amber-100">待发送截图（{draftScreenshots.length} 张）</p>
          <Screenshots
            screenshots={draftScreenshots}
            total={draftScreenshots.length}
            display="gallery"
          />
        </div>
      )}

      {/* Submitted screenshots, rendered as the `screenshotDisplay` setting asks */}
      {screenshots.length === 0 ? (
        <ShortcutTip />
      ) : (
        <Screenshots
          screenshots={screenshots}
          total={Math.max(screenshotTotal, screenshots.length)}
          display={screenshotDisplay}
        />
      )}
      {/* Solution Display */}
      <MarkdownRenderer>{solutionChunks.join('')}</MarkdownRenderer>
    </div>
  )
}

function Screenshots({
  screenshots,
  total,
  display
}: {
  screenshots: string[]
  /** Every screenshot sent to the AI, which can exceed the thumbnails kept around */
  total: number
  display: ScreenshotDisplay
}) {
  if (display === 'none') return null

  if (display === 'count') {
    // Themed so the card reads correctly on both the dark and the light surface
    return (
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-app-chip-border bg-app-chip px-2.5 py-1 text-sm text-app-chip-fg select-none">
        <Images className="h-4 w-4" />
        {total} 张截图
      </div>
    )
  }

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
      {screenshots.map((data, index) => (
        <img
          key={index}
          src={`data:image/png;base64,${data}`}
          alt={`Screenshot ${index + 1}`}
          className="w-40 h-auto flex-shrink-0 border border-app-border rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          title={`第 ${index + 1} 张截图`}
        />
      ))}
    </div>
  )
}

function ShortcutTip() {
  const { shortcuts } = useShortcutsStore()
  return (
    <div className="flex items-center justify-center h-full text-xl text-app-muted-fg select-none">
      请按下快捷键
      <ShortcutRenderer
        shortcut={shortcuts.takeScreenshot.key}
        className="mx-1 font-bold text-black"
      />
      抓取屏幕进行分析
    </div>
  )
}
