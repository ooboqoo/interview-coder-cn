type Thumbnail = {
  isEmpty: () => boolean
}

type ScreenshotSource = {
  display_id: string
  thumbnail: Thumbnail
}

export type ScreenshotSourceSelectionOptions = {
  requirePrimaryDisplay?: boolean
  displayCount?: number
}

export function selectScreenshotSource<Source extends ScreenshotSource>(
  sources: Source[],
  primaryDisplayId: string,
  options: ScreenshotSourceSelectionOptions = {}
): Source | undefined {
  const primarySource = sources.find(
    (source) => source.display_id === primaryDisplayId && !source.thumbnail.isEmpty()
  )
  if (primarySource) return primarySource

  const availableSources = sources.filter((source) => !source.thumbnail.isEmpty())
  if (
    options.requirePrimaryDisplay &&
    (options.displayCount !== 1 || availableSources.length !== 1)
  ) {
    return undefined
  }

  return availableSources[0]
}
