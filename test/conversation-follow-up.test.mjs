import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { buildConversationFollowUpMessages } from '../src/shared/conversation-follow-up.ts'
import { countMeaningfulChars } from '../src/shared/conversation.ts'

const utterance = (id, text) => ({ id, text, final: true })
const hint = (id, text, extra = {}) => ({
  id,
  fromId: id,
  toId: id,
  source: 'manual',
  status: 'done',
  text,
  reasoning: 'private reasoning',
  ...extra
})

test('follow-up history keeps completed answers and typed questions in order', () => {
  const messages = buildConversationFollowUpMessages(
    [utterance(1, '如何优化？')],
    [
      hint(1, '先使用缓存'),
      hint(2, '设置过期时间', { source: 'follow-up', question: '缓存如何失效？' }),
      hint(3, '未完成的内容', { status: 'streaming' }),
      hint(4, '失败的内容', { status: 'error' })
    ],
    '给个例子'
  )
  assert.deepEqual(messages.slice(1, -1), [
    { role: 'user', content: '如何优化？' },
    { role: 'assistant', content: '先使用缓存' },
    { role: 'user', content: '缓存如何失效？' },
    { role: 'assistant', content: '设置过期时间' }
  ])
  assert.match(messages.at(-1).content, /给个例子/)
  assert.equal(JSON.stringify(messages).includes('private reasoning'), false)
})

test('typed questions work without speech and context stays bounded', () => {
  assert.equal(buildConversationFollowUpMessages([], [], '介绍一下缓存').length, 1)
  const messages = buildConversationFollowUpMessages(
    Array.from({ length: 30 }, (_, i) => utterance(i + 1, `sentence ${i}`)),
    Array.from({ length: 10 }, (_, i) => hint(i + 1, 'a'.repeat(3000))),
    '继续'
  )
  assert.equal(messages[0].content.includes('sentence 0\n'), false)
  assert.ok(JSON.stringify(messages).length < 14000)
  assert.ok(messages.length <= 14)
})

/** Load the orchestrator with fake Electron and controllable streams, without live APIs. */
function conversationHarness() {
  const handlers = new Map()
  const requests = []
  let sentence
  const profile = { apiKey: 'test-key' }
  const deps = {
    electron: { ipcMain: { handle: (name, handler) => handlers.set(name, handler) } },
    './ai': { getHintStream: (messages) => messages },
    '../shared/conversation-follow-up': { buildConversationFollowUpMessages },
    '../shared/conversation': { countMeaningfulChars },
    './settings': {
      settings: { conversationHintMode: 'manual', conversationMinChars: 1 },
      getModeProfile: () => profile
    },
    './transcription': {
      isTranscriptionRunning: () => false,
      onConversationSentence: (callback) => (sentence = callback),
      onTranscriptionEnd: () => {}
    },
    './stream': {
      extractErrorMessage: (error) => error.message,
      consumeStream: (create, controller, onChunk) =>
        new Promise((resolve) => {
          requests.push({ messages: create(controller.signal), controller, onChunk, resolve })
          controller.signal.addEventListener('abort', () => resolve({ status: 'aborted' }))
        })
    }
  }
  const { outputText } = ts.transpileModule(
    readFileSync(new URL('../src/main/conversation.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  )
  const exports = {}
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(deps[name], `Unexpected dependency ${name}`)
      return deps[name]
    },
    AbortController,
    console,
    global: {}
  })
  return {
    ...exports,
    requests,
    profile,
    sentence: (...args) => sentence(...args),
    snapshot: () => handlers.get('conversation:get-snapshot')()
  }
}

test('follow-ups neither consume pending speech nor get replaced by manual hints', () => {
  const app = conversationHarness()
  app.sentence('解释缓存', true)
  assert.equal(app.requestConversationFollowUp('给一个例子').success, true)
  app.requestHint()
  const cards = app.snapshot().hints
  assert.equal(cards.length, 2)
  assert.equal(cards[0].source, 'follow-up')
  assert.equal(cards[0].question, '给一个例子')
  assert.equal(cards[1].source, 'manual')
  assert.match(app.requests[1].messages[0].content, /解释缓存/)
  assert.equal(app.requests[0].controller.signal.aborted, false)
  app.stopHints()
})

test('rejects invalid, unconfigured and duplicate requests; stop permits another follow-up', () => {
  const app = conversationHarness()
  for (const question of [null, {}, '', '   ', 'a'.repeat(4001)]) {
    assert.equal(app.requestConversationFollowUp(question).success, false)
  }
  app.profile.apiKey = ''
  assert.equal(app.requestConversationFollowUp('test').success, false)
  assert.equal(app.snapshot().hints.length, 0)
  app.profile.apiKey = 'test-key'
  assert.equal(app.requestConversationFollowUp('first').success, true)
  assert.equal(app.requestConversationFollowUp('duplicate').success, false)
  app.stopHints()
  assert.equal(app.snapshot().hints[0].status, 'stopped')
  assert.equal(app.requests[0].controller.signal.aborted, true)
  assert.equal(app.requestConversationFollowUp('second').success, true)
  app.clearConversation()
  assert.equal(app.requests[1].controller.signal.aborted, true)
  assert.equal(app.snapshot().hints.length, 0)
})

test('completed follow-up streams become context for the next question', async () => {
  const app = conversationHarness()
  app.requestConversationFollowUp('first')
  app.requests[0].onChunk({ kind: 'text', delta: 'first answer' })
  app.requests[0].resolve({ status: 'complete' })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(app.snapshot().hints[0].status, 'done')
  app.requestConversationFollowUp('second')
  assert.equal(app.requests[1].messages[0].content, 'first')
  assert.equal(app.requests[1].messages[1].content, 'first answer')
  app.stopHints()
})
