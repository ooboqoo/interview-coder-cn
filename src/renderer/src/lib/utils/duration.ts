/**
 * Render an elapsed time for the header badge.
 *
 * Under a minute reads as seconds with one decimal (`3.2s`), which is the
 * useful precision for a wait the user is sitting through. Past that it
 * switches to `1m23s`, where the extra decimal is just noise.
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0.0s'
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m${String(seconds).padStart(2, '0')}s`
}
