import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { useConversationStore } from '@/lib/store/conversation'
import { useSettingsStore } from '@/lib/store/settings'
import { useShortcutsStore } from '@/lib/store/shortcuts'

export function FollowUpInput() {
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const sending = useRef(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const streaming = useConversationStore((state) =>
    state.hints.some((card) => card.source === 'follow-up' && card.status === 'streaming')
  )
  const shortcut = useShortcutsStore((state) => state.shortcuts.openFollowUp.key)
  const hideShortcutHints = useSettingsStore((state) => state.hideShortcutHints)

  useEffect(() => {
    window.api.onOpenFollowUp(() => input.current?.focus())
    return () => window.api.removeOpenFollowUpListener()
  }, [])

  const submit = async () => {
    if (!question.trim() || streaming || sending.current) return
    sending.current = true
    setSubmitting(true)
    try {
      const result = await window.api.sendConversationFollowUp(question)
      if (result.success) {
        setQuestion('')
        useConversationStore.getState().setErrorMessage(null)
      } else {
        useConversationStore.getState().setErrorMessage(result.error ?? '追问发送失败')
      }
    } catch (error) {
      useConversationStore
        .getState()
        .setErrorMessage(error instanceof Error ? error.message : '追问发送失败')
    } finally {
      sending.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="shrink-0 border-t border-app-border px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-xs text-app-muted-fg">
        <label htmlFor="conversation-follow-up">追问</label>
        {!hideShortcutHints && <ShortcutRenderer shortcut={shortcut} className="scale-90" />}
        <span className="ml-auto">Enter 发送 · Shift+Enter 换行</span>
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          ref={input}
          id="conversation-follow-up"
          className="min-h-14 max-h-32 resize-none border-app-border text-sm"
          placeholder="输入追问，例如：展开讲讲刚才的方案"
          maxLength={4000}
          disabled={submitting}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            void submit()
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!question.trim() || streaming || submitting}
          onClick={() => void submit()}
        >
          <Send className="size-3.5" />
          {streaming ? '生成中' : '发送'}
        </Button>
      </div>
    </div>
  )
}
