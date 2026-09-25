import { useEffect, useState } from 'react'
import { HelpCircle, SettingsIcon, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store/app'
import { useSettingsStore } from '@/lib/store/settings'

export function AppHeader() {
  const navigate = useNavigate()
  const { ignoreMouse } = useAppStore()
  const model = useSettingsStore((state) => state.model)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion)
  }, [])

  return (
    <div id="app-header" className="relative flex items-center">
      <div className="mx-auto flex items-baseline gap-1.5">
        <span>截屏解题助手</span>
        {appVersion && <span className="text-[10px] opacity-60">v{appVersion}</span>}
      </div>
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
