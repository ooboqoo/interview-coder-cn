import type { ModelMessage } from 'ai'
import type { HintCard, Utterance } from './conversation'

/** Bounded context for typed follow-ups; only finished answers become history. */
export function buildConversationFollowUpMessages(
  utterances: Utterance[],
  hints: HintCard[],
  question: string
): ModelMessage[] {
  const transcript = utterances
    .filter((u) => u.text.trim())
    .slice(-20)
    .map((u) => u.text)
    .join('\n')
    .slice(-1500)
  const messages: ModelMessage[] = []
  if (transcript) {
    messages.push({ role: 'user', content: `【最近对方说过的话】\n${transcript}` })
  }

  const history: ModelMessage[] = []
  let chars = 0
  for (const card of hints
    .filter((h) => h.status === 'done' && h.text.trim())
    .slice(-6)
    .reverse()) {
    const prompt =
      card.question ??
      utterances
        .filter((u) => u.id >= card.fromId && u.id <= card.toId)
        .map((u) => u.text)
        .join('\n')
    const content = prompt || '请根据对话给出提示。'
    chars += content.length + card.text.length
    if (chars > 12000) break
    history.unshift({ role: 'user', content }, { role: 'assistant', content: card.text })
  }
  messages.push(...history, {
    role: 'user',
    content: `【用户的文字追问】\n${question}\n\n请结合以上对话和提示，直接回答这个追问。`
  })
  return messages
}
