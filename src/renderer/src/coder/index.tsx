import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/lib/store/settings'
import { useAppStore } from '@/lib/store/app'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { useSolutionStore } from '@/lib/store/solution'
import { startAudioCapture, stopAudioCapture } from '@/lib/audio-capture'

import { AppHeader } from './AppHeader'
import { AppContent } from './AppContent'
import { AppStatusBar } from './AppStatusBar'
import { PrerequisitesChecker } from './PrerequisitesChecker'
import { TranscriptionBar } from './TranscriptionBar'

export default function CoderPage() {
  const { opacity, dashscopeApiKey } = useSettingsStore()
  const { syncAppState } = useAppStore()
  const { isTranscribing, setIsTranscribing, setTranscriptionText, clearText } =
    useTranscriptionStore()
  const { setErrorMessage } = useSolutionStore()

  useEffect(() => {
    document.body.style.opacity = opacity.toString()
    return () => {
      document.body.style.opacity = ''
    }
  }, [opacity])

  useEffect(() => {
    window.api.onAdjustOpacity((delta) => {
      useSettingsStore.getState().adjustOpacity(delta)
    })
    return () => {
      window.api.removeAdjustOpacityListener()
    }
  }, [])

  useEffect(() => {
    window.api.onSwitchApiProfile((direction) => {
      const store = useSettingsStore.getState()
      const profile = store.cycleProfile(direction)
      if (!profile) {
        toast('只有一个配置，无法切换')
        return
      }
      toast(`已切换到「${profile.name}」`, {
        description: profile.model || '未设置模型',
        duration: 3000
      })
    })
    return () => {
      window.api.removeSwitchApiProfileListener()
    }
  }, [])

  useEffect(() => {
    window.api.updateAppState({ inCoderPage: true })
    return () => {
      window.api.updateAppState({ inCoderPage: false })
    }
  }, [])

  useEffect(() => {
    window.api.onSyncAppState((state) => {
      syncAppState(state)
    })
    return () => {
      window.api.removeSyncAppStateListener()
    }
  }, [syncAppState])

  useEffect(() => {
    const handleToggle = async () => {
      if (isTranscribing) {
        stopAudioCapture()
        await window.api.stopTranscription()
        setIsTranscribing(false)
      } else {
        if (!dashscopeApiKey) {
          setErrorMessage('请先在设置中配置百炼平台 API Key')
          return
        }
        try {
          await startAudioCapture()
          await window.api.startTranscription(dashscopeApiKey)
          setIsTranscribing(true)
          setErrorMessage(null)
        } catch (err) {
          console.error('Failed to start transcription:', err)
          stopAudioCapture()
          setErrorMessage('启动语音转录失败，请检查系统音频权限')
        }
      }
    }

    window.api.onToggleTranscription(handleToggle)
    return () => {
      window.api.removeToggleTranscriptionListener()
    }
  }, [isTranscribing, dashscopeApiKey, setIsTranscribing, setErrorMessage])

  useEffect(() => {
    window.api.onTranscriptionText((data) => {
      setTranscriptionText(data.text)
    })
    window.api.onTranscriptionError((message) => {
      setErrorMessage(message)
      setIsTranscribing(false)
      stopAudioCapture()
    })
    window.api.onTranscriptionStopped(() => {
      setIsTranscribing(false)
    })
    window.api.onTranscriptionCleared(() => {
      clearText()
    })

    return () => {
      window.api.removeTranscriptionTextListener()
      window.api.removeTranscriptionErrorListener()
      window.api.removeTranscriptionStoppedListener()
      window.api.removeTranscriptionClearedListener()
    }
  }, [setTranscriptionText, setErrorMessage, setIsTranscribing, clearText])

  useEffect(() => {
    return () => {
      if (useTranscriptionStore.getState().isTranscribing) {
        stopAudioCapture()
        window.api.stopTranscription()
      }
    }
  }, [])

  return (
    <div className="relative h-screen">
      <AppHeader />
      <AppContent />
      <TranscriptionBar />
      <AppStatusBar />
      <PrerequisitesChecker />
    </div>
  )
}
