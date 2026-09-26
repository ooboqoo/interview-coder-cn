import { useEffect, useState } from 'react'
import { HelpCircle, SettingsIcon, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store/app'
import { useSettingsStore } from '@/lib/store/settings'
import { useSolutionStore } from '@/lib/store/solution'
import { formatDuration } from '@/lib/utils/duration'
import { useElapsed } from '@/lib/use-elapsed'

export function AppHeader() {
  const navigate = useNavigate()
  const { ignoreMouse } = useAppStore()
  const model = useSettingsStore((state) => state.model)
  const elapsed = useElapsed()
  const setDurationMs = useSolutionStore((state) => state.setDurationMs)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion)
  }, [])

  useEffect(() => {
    // Main measures the request and reports once, so nothing ticks here
    window.api.onSolutionDuration((ms) => setDurationMs(ms))
    return () => {
      window.api.removeSolutionDurationListener()
    }
  }, [setDurationMs])

  return (
    <div id="app-header" className="flex items-center gap-1">
      {/*
        Flex shrink decides what survives a narrow window. The higher the
        factor, the sooner that item is squeezed, and it disappears once it
        reaches `min-width: 0`:
          title  flex: 1 8 auto  compressed first, being the least informative
          model  flex: 0 4 auto  next; still reachable from the settings page
          timer  shrink-0        never compressed — it exists nowhere else
      */}
      {elapsed !== null && (
        <span
          className="shrink-0 whitespace-nowrap pl-2 text-xs tabular-nums opacity-70 pointer-events-none"
          title={`本次耗时 ${formatDuration(elapsed)}`}
        >
          {formatDuration(elapsed)}
        </span>
      )}
      <div
        className="flex min-w-0 items-baseline justify-center gap-1.5 px-2"
        style={{ flex: '1 8 auto', minWidth: 0 }}
      >
        <span className="truncate">截屏解题助手</span>
        {appVersion && <span className="shrink-0 text-[10px] opacity-60">v{appVersion}</span>}
      </div>
      {model && (
        <span
          className="min-w-0 truncate pr-2 text-[10px] opacity-60 pointer-events-none"
          style={{ flex: '0 4 auto', minWidth: 0 }}
          title={model}
        >
          {model}
        </span>
      )}
      <div className={`actions ${ignoreMouse ? 'pointer-events-none' : ''}`}>
        <Button
          variant="ghost"
          className="size-8 cursor-pointer hover:opacity-50"
          onClick={() => navigate('/settings')}
        >
          <SettingsIcon />
        </Button>
        <Button
          variant="ghost"
          className="size-8 cursor-pointer hover:opacity-50"
          onClick={() => navigate('/help')}
        >
          <HelpCircle />
        </Button>
        <Button
          variant="ghost"
          className="size-8 cursor-pointer hover:opacity-50 hover:text-red-500"
          onClick={() => window.close()}
        >
          <X />
        </Button>
      </div>
    </div>
  )
}
