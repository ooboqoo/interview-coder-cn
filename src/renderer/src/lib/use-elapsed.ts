import { useEffect, useState } from 'react'
import { useSolutionStore } from './store/solution'

/**
 * The elapsed time to show in the header: it counts up while a request is
 * running and freezes on the final value once one finishes.
 *
 * The running value comes from a timer here so the number moves as the user
 * waits, and the settled value comes from the main process, which measures the
 * request itself. That split matters: a renderer timer is throttled while the
 * window is hidden or the display sleeps — exactly when this app spends the
 * longest waiting — so a number taken from it would understate the real time.
 */
export function useElapsed(): number | null {
  const isLoading = useSolutionStore((state) => state.isLoading)
  const durationMs = useSolutionStore((state) => state.durationMs)
  const [tickingMs, setTickingMs] = useState(0)
  const startedAt = useStartedAt(isLoading)

  useEffect(() => {
    if (startedAt === null) return

    setTickingMs(Date.now() - startedAt)
    const timer = setInterval(() => setTickingMs(Date.now() - startedAt), 250)
    return () => clearInterval(timer)
  }, [startedAt])

  // While running, show the local count; once finished, the measured total
  if (isLoading && startedAt !== null) return tickingMs
  return durationMs
}

/**
 * When the current request started, recorded as the spinner appears. Held in a
 * ref-like state so re-renders do not restart the count.
 */
function useStartedAt(isLoading: boolean): number | null {
  const [value, setValue] = useState<{ at: number } | null>(null)

  useEffect(() => {
    if (isLoading) setValue({ at: Date.now() })
    else setValue(null)
  }, [isLoading])

  return value?.at ?? null
}
