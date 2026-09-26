import { useEffect } from 'react'

export function RegionSelectionPage() {
  useEffect(() => {
    const onPointerUp = () => void window.api.reportRegionSelectionClick()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void window.api.cancelRegionSelection()
    }
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return <div className="h-screen w-screen cursor-crosshair" />
}
