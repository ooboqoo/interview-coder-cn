import { useEffect, useState } from 'react'
import { HelpCircle, SettingsIcon, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store/app'
import { useSettingsStore } from '@/lib/store/settings'
import { useSolutionStore } from '@/lib/store/solution'
import { formatDuration } from '@/lib/utils/duration'

export function AppHeader() {
  const navigate = useNavigate()
  const { ignoreMouse } = useAppStore()
  const model = useSettingsStore((state) => state.model)
  const durationMs = useSolutionStore((state) => state.durationMs)
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
    <div id="app-header" className="relative flex items-center">
      <div className="mx-auto flex items-baseline gap-1.5">
        <span>截屏解题助手</span>
        {appVersion && <span className="text-[10px] opacity-60">v{appVersion}</span>}
      </div>
      {/* Left edge, mirroring the model name on the right; the title between
          them stays centred only if neither side is laid out by the flow */}
      {durationMs !== null && (
        <span
          className="absolute left-2 max-w-24 truncate text-[10px] opacity-60 pointer-events-none"
          title={`本次耗时 ${formatDuration(durationMs)}`}
        >
          {formatDuration(durationMs)}
        </span>
      )}
      {/* Pinned to the right edge so the title above stays centred; the model
          name is long and would otherwise push the title off-centre */}
      {model && (
        <span
          className="absolute right-28 max-w-40 truncate text-[10px] opacity-60 pointer-events-none"
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
