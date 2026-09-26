import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { TOOLBAR_ACTIONS, type ToolbarActionName } from '@/lib/toolbar-actions'
import type { LucideIcon } from 'lucide-react'
import { WindowResizeHandles } from '@/components/WindowResizeHandles'
import { applyTheme } from '@/lib/theme'
import { useAppStore } from '@/lib/store/app'

/** Mirrors `.overlay-toolbar` in main.css: `p-2` around `size-7` buttons with `gap-0.5` */
const BAR_PADDING = 8
const BUTTON_SIZE = 28
const BUTTON_GAP = 2

/**
 * Toolbar rendered in its own always-on-top window above the main window.
 * Buttons carry no `title`: a native tooltip would be drawn outside the window
 * and would therefore not be covered by the window's content protection.
 */
export function OverlayToolbar() {
  const [hoverDelay, setHoverDelay] = useState(0)
  const barRef = useRef<HTMLDivElement>(null)
  const visibleCount = useVisibleActionCount(barRef)
  const syncAppState = useAppStore((state) => state.syncAppState)

  // This window's store is its own copy, so the state main pushes has to be
  // relayed here; otherwise the toolbar's own buttons show stale state
  useEffect(() => {
    window.api.onSyncAppState((state) => syncAppState(state))
    return () => {
      window.api.removeSyncAppStateListener()
    }
  }, [syncAppState])

  // This window has its own settings store copy, so main pushes the live value.
  // The theme is left to App.tsx on load — this window shares localStorage with
  // the main window, and main's copy may still hold its startup default here.
  useEffect(() => {
    window.api.getAppSettings().then((settings) => {
      setHoverDelay(settings.toolbarHoverDelay || 0)
    })
    window.api.onSyncToolbarSettings(({ hoverDelay, theme }) => {
      setHoverDelay(hoverDelay || 0)
      applyTheme(theme)
    })
    return () => {
      window.api.removeSyncToolbarSettingsListener()
    }
  }, [])

  return (
    <div ref={barRef} className="overlay-toolbar overlay-toolbar-root">
      {TOOLBAR_ACTIONS.slice(0, visibleCount).map(({ action, Icon }) => (
        <ToolbarButton key={action} action={action} Icon={Icon} hoverDelay={hoverDelay} />
      ))}
      {/* Always on, width only: the height is the button row. main.css keeps
          these edges from ever showing a resize cursor. `nonActivating` because
          Windows eats this window's presses, see ToolbarButton below */}
      <WindowResizeHandles enabled axis="x" nonActivating />
    </div>
  )
}

/**
 * Buttons keep their size when the toolbar window is resized; the ones that no
 * longer fit are dropped from the end, so a narrowed toolbar never shows a
 * sliver of a button. The bar's own width never depends on its children, so
 * measuring it here cannot feed back into the layout.
 */
function useVisibleActionCount(barRef: RefObject<HTMLDivElement | null>): number {
  const [count, setCount] = useState(TOOLBAR_ACTIONS.length)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    const measure = () => {
      const available = bar.clientWidth - BAR_PADDING * 2
      const fits = Math.floor((available + BUTTON_GAP) / (BUTTON_SIZE + BUTTON_GAP))
      setCount(Math.min(TOOLBAR_ACTIONS.length, Math.max(1, fits)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [barRef])

  return count
}

/**
 * Fires on mouse release, and — when a dwell time is configured — on hovering
 * the button for that long, which triggers the action without ever pressing it.
 *
 * The release, not a click: there is no click on Windows. This window is
 * `focusable: false`, so Chromium answers the WM_MOUSEACTIVATE of the press
 * with MA_NOACTIVATEANDEAT ("do not activate, and discard the mouse message"),
 * and Windows drops the button-down before the page ever sees it. The
 * button-up is delivered as usual, so the DOM gets a mouseup with no mousedown
 * ahead of it — and therefore never a click. Moves are untouched, which is why
 * hover dwell has always worked there.
 */
function ToolbarButton({
  action,
  Icon,
  hoverDelay
}: {
  action: ToolbarActionName
  Icon: LucideIcon
  hoverDelay: number
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isDwelling, setIsDwelling] = useState(false)

  const cancelDwell = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsDwelling(false)
  }, [])

  // Drop a pending dwell when the setting changes or the toolbar goes away
  useEffect(() => cancelDwell, [cancelDwell, hoverDelay])

  const handleMouseEnter = () => {
    if (!hoverDelay) return
    setIsDwelling(true)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      // Stays inert until the cursor leaves and comes back, so parking the
      // mouse on a button cannot fire it over and over
      setIsDwelling(false)
      void window.api.triggerAction(action)
    }, hoverDelay)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={cancelDwell}
      onMouseUp={(event) => {
        if (event.button !== 0) return
        cancelDwell()
        void window.api.triggerAction(action)
      }}
    >
      <Icon />
      {isDwelling && (
        <span className="dwell-progress" style={{ animationDuration: `${hoverDelay}ms` }} />
      )}
    </Button>
  )
}
