/* eslint-disable @typescript-eslint/no-require-imports */

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  removeLastDraft,
  drainDrafts,
  normalizeCropRect
} = require('../../out/test/draft-screenshots.cjs')
const { selectScreenshotSource } = require('../../out/test/screenshot-source.cjs')

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createSource(displayId, isEmpty = false) {
  return {
    display_id: displayId,
    thumbnail: {
      isEmpty: () => isEmpty
    }
  }
}

test('removes only the newest draft', () => {
  assert.deepEqual(removeLastDraft(['a', 'b']), ['a'])
  assert.deepEqual(removeLastDraft([]), [])
})

test('drains every draft without mutating the submitted batch', () => {
  const drafts = ['a', 'b']
  const result = drainDrafts(drafts)
  result.batch.push('c')
  assert.deepEqual(result.remaining, [])
  assert.deepEqual(drafts, ['a', 'b'])
})

test('normalizes reverse click order and rejects invalid selections', () => {
  const display = { x: 0, y: 0, width: 500, height: 400 }
  assert.deepEqual(normalizeCropRect({ x: 300, y: 250 }, { x: 100, y: 50 }, display), {
    x: 100,
    y: 50,
    width: 200,
    height: 200
  })
  assert.equal(normalizeCropRect({ x: 20, y: 20 }, { x: 600, y: 20 }, display), null)
  assert.equal(normalizeCropRect({ x: 20, y: 20 }, { x: 20, y: 80 }, display), null)
})

test('uses the first non-empty source when ordinary capture cannot identify the primary display', () => {
  const firstSource = createSource('secondary')
  const secondSource = createSource('tertiary')

  assert.equal(selectScreenshotSource([firstSource, secondSource], 'primary'), firstSource)
})

test('uses the matching primary source for strict region capture', () => {
  const primarySource = createSource('primary')
  const otherSource = createSource('secondary')

  assert.equal(
    selectScreenshotSource([otherSource, primarySource], 'primary', {
      requirePrimaryDisplay: true
    }),
    primarySource
  )
})

test('allows a unique non-empty source for strict region capture', () => {
  const emptySource = createSource('secondary', true)
  const availableSource = createSource('tertiary')

  assert.equal(
    selectScreenshotSource([emptySource, availableSource], 'primary', {
      requirePrimaryDisplay: true,
      displayCount: 1
    }),
    availableSource
  )
})

test('rejects an unidentified source when more than one display is connected', () => {
  const unidentifiedSource = createSource('')

  assert.equal(
    selectScreenshotSource([unidentifiedSource], 'primary', {
      requirePrimaryDisplay: true,
      displayCount: 2
    }),
    undefined
  )
})

test('rejects ambiguous sources for strict region capture', () => {
  const firstSource = createSource('secondary')
  const secondSource = createSource('tertiary')

  assert.equal(
    selectScreenshotSource([firstSource, secondSource], 'primary', { requirePrimaryDisplay: true }),
    undefined
  )
})
