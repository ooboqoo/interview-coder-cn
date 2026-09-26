/**
 * Render an elapsed time for the header badge, accurate to the second.
 *
 * The value ticks once a second while a request is running, so a decimal place
 * would only add jitter. Under a minute reads `3s`; past that it becomes
 * `1m1s`, with the seconds always padded (`1m01s`) so the width stops jumping.
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0s'

  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m${String(seconds).padStart(2, '0')}s`
}
