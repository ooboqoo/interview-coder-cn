import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Brain, Eraser, LoaderCircle, PanelLeftOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import ShortcutRenderer from '@/components/ShortcutRenderer'
import { useSettingsStore } from '@/lib/store/settings'
import { useShortcutsStore } from '@/lib/store/shortcuts'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { useConversationStore } from '@/lib/store/conversation'
import type { HintCard } from '../../../shared/conversation'
import { startListening } from './listening'
import { FollowUpInput } from './FollowUpInput'

export const HINT_PANEL_ID = 'hint-panel'

/** The prompts tell the model to answer this when nothing needs a reply */
const NO_REPLY = '（无需回应）'

export function HintPanel() {
  const hints = useConversationStore((state) => state.hints)
  const errorMessage = useConversationStore((state) => state.errorMessage)
  const setErrorMessage = useConversationStore((state) => state.setErrorMessage)
  const transcriptHidden = useSettingsStore((state) => state.conversationTranscriptHidden)
  const updateSetting = useSettingsStore((state) => state.updateSetting)
  const cardRefs = useRef(new Map<number, HTMLElement>())
  const lastCount = useRef(hints.length)

  // A new hint scrolls into view from its first line; the stream then fills it
  // in without dragging the view along, so reading from the top is not disturbed
  useEffect(() => {
    if (hints.length > lastCount.current) {
      cardRefs.current.get(hints[hints.length - 1].id)?.scrollIntoView({
        block: 'start',
        behavior: 'smooth'
      })
    }
    lastCount.current = hints.length
  }, [hints])

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 px-3 text-xs text-app-muted-fg select-none">
        {transcriptHidden && (
          <button
            className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[var(--app-hover-bg)] cursor-pointer"
            onClick={() => updateSetting('conversationTranscriptHidden', false)}
          >
            <PanelLeftOpen className="size-3.5" />
            展开对话
          </button>
        )}
        <span className="font-medium">提示</span>
        {hints.length > 0 && (
          <button
            className="ml-auto flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[var(--app-hover-bg)] cursor-pointer"
            onClick={() => void window.api.clearConversation()}
          >
            <Eraser className="size-3.5" />
            清空对话
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-500/20 p-2 text-sm text-red-300">
          <span className="min-w-0 flex-1 break-words">{errorMessage}</span>
          <button
            className="shrink-0 text-red-400/80 hover:text-red-300 cursor-pointer"
            aria-label="关闭"
            onClick={() => setErrorMessage(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div
        id={HINT_PANEL_ID}
        className="panel-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4"
      >
        {hints.length === 0 ? (
          <EmptyState />
        ) : (
          hints.map((card) => (
            <HintCardView
              key={card.id}
              card={card}
              ref={(el) => {
                if (el) cardRefs.current.set(card.id, el)
                else cardRefs.current.delete(card.id)
              }}
            />
          ))
        )}
      </div>
      <FollowUpInput />
    </section>
  )
}

function HintCardView({ card, ref }: { card: HintCard; ref: (el: HTMLElement | null) => void }) {
  const setFocusedHintId = useConversationStore((state) => state.setFocusedHintId)
  // What it answers, for when the transcript column is hidden or scrolled away
  const question = useConversationStore((state) =>
    state.utterances
      .filter((u) => u.id >= card.fromId && u.id <= card.toId)
      .map((u) => u.text)
      .join(' ')
  )
  const noReply = card.status === 'done' && card.text.trim() === NO_REPLY

  return (
    <article
      ref={ref}
      className={cn(
        'scroll-mt-2 rounded-lg border border-app-border px-3 py-2',
        noReply && 'opacity-50'
      )}
      onMouseEnter={() => setFocusedHintId(card.id)}
      onMouseLeave={() => setFocusedHintId(null)}
    >
      <div className="mb-1 flex items-center gap-2 text-[11px] text-app-muted-fg select-none">
        {(card.question || question) && (
          <span
            className={cn(
              'min-w-0',
              card.question ? 'whitespace-pre-wrap break-words' : 'truncate'
            )}
          >
            「{card.question || question}」
          </span>
        )}
        <span className="ml-auto shrink-0">
          {card.source === 'follow-up' ? '追问' : card.source === 'auto' ? '自动' : '手动'}
          {card.latencyMs !== undefined && ` · ${(card.latencyMs / 1000).toFixed(1)}s`}
          {card.status === 'stopped' && ' · 已停止'}
        </span>
      </div>
      {card.status === 'waiting' ? (
        <p className="animate-pulse text-sm text-app-muted-fg">对方还在说，说完后重新生成…</p>
      ) : card.status === 'streaming' && !card.text ? (
        <p className="flex items-center gap-1.5 text-sm text-app-muted-fg">
          <LoaderCircle className="size-3.5 animate-spin" />
          正在生成…
        </p>
      ) : null}
      {card.reasoning && card.status !== 'waiting' && (
        <details className="mb-1 text-xs text-app-muted-fg">
          <summary className="flex cursor-pointer items-center gap-1 select-none">
            <Brain className="size-3" />
            思考过程
          </summary>
          <div className="mt-1 max-h-32 overflow-y-auto break-words opacity-80">
            <MarkdownRenderer compact>{card.reasoning}</MarkdownRenderer>
          </div>
        </details>
      )}
      {card.text && card.status !== 'waiting' && <MarkdownRenderer>{card.text}</MarkdownRenderer>}
      {card.status === 'error' && (
        <p className="text-sm break-words text-red-400">生成失败：{card.error}</p>
      )}
    </article>
  )
}

function EmptyState() {
  const navigate = useNavigate()
  const { shortcuts } = useShortcutsStore()
  const dashscopeApiKey = useSettingsStore((state) => state.dashscopeApiKey)
  const hintMode = useSettingsStore((state) => state.conversationHintMode)
  const isTranscribing = useTranscriptionStore((state) => state.isTranscribing)
  const hasUtterances = useConversationStore((state) => state.utterances.length > 0)
  const key = (action: string) => (
    <ShortcutRenderer
      shortcut={shortcuts[action].key}
      className="mx-1 inline-block border border-current bg-transparent px-1 py-0 text-xs"
    />
  )

  let content: ReactNode
  if (!dashscopeApiKey) {
    content = (
      <>
        <p>对话模式靠语音识别听对方说话，需要先填写百炼平台 API Key</p>
        <Button size="sm" variant="secondary" onClick={() => navigate('/settings?tab=voice')}>
          去设置
        </Button>
      </>
    )
  } else if (!isTranscribing && !hasUtterances) {
    content = (
      <>
        <p>按{key('toggleTranscription')}开始监听对方说话</p>
        <Button size="sm" variant="secondary" onClick={() => void startListening()}>
          开始监听
        </Button>
      </>
    )
  } else if (hintMode === 'auto') {
    content = <p>对方说完一句话，这里就会出提示；也可以按{key('generateHint')}立即出</p>
  } else {
    content = <p>手动模式：按{key('generateHint')}出提示</p>
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-app-muted-fg select-none">
      {content}
      <p>也可以在下方直接输入问题或追问</p>
    </div>
  )
}
