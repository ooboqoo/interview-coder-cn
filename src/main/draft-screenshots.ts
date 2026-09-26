export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; width: number; height: number }

export function removeLastDraft(drafts: string[]): string[] {
  return drafts.slice(0, -1)
}

export function drainDrafts(drafts: string[]): { batch: string[]; remaining: string[] } {
  return { batch: [...drafts], remaining: [] }
}

function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.y >= rect.y &&
    point.x < rect.x + rect.width &&
    point.y < rect.y + rect.height
  )
}

export function normalizeCropRect(first: Point, second: Point, display: Rect): Rect | null {
  if (!isPointInRect(first, display) || !isPointInRect(second, display)) return null

  const x = Math.min(first.x, second.x)
  const y = Math.min(first.y, second.y)
  const width = Math.abs(first.x - second.x)
  const height = Math.abs(first.y - second.y)
  if (width === 0 || height === 0) return null

  return { x, y, width, height }
}
