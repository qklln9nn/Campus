import type { CategoryType } from '@/types/event'

function svgPoster(label: string, accent: string): string {
  const safeLabel = label.replace(/[<>&"']/g, '')
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${safeLabel}">
      <rect width="800" height="600" fill="#eef2f6"/>
      <circle cx="680" cy="80" r="170" fill="${accent}" opacity=".13"/>
      <circle cx="90" cy="560" r="220" fill="${accent}" opacity=".09"/>
      <rect x="70" y="72" width="82" height="8" rx="4" fill="${accent}"/>
      <text x="70" y="290" fill="#11213d" font-family="Arial, sans-serif" font-size="56" font-weight="700">CampusHub</text>
      <text x="70" y="354" fill="#5e6c80" font-family="Arial, sans-serif" font-size="30">${safeLabel}</text>
      <text x="70" y="500" fill="${accent}" font-family="Arial, sans-serif" font-size="18" letter-spacing="5">CAMPUS EVENT</text>
    </svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const DEFAULT_FALLBACK_POSTER = svgPoster('Event poster unavailable', '#1f57a8')

export const CATEGORY_FALLBACK_IMAGES: Partial<Record<CategoryType, string>> = {
  Tech: svgPoster('Technology event', '#315f9f'),
  Academic: svgPoster('Academic event', '#566f45'),
  Sports: svgPoster('Sports event', '#b36b43'),
  Cultural: svgPoster('Cultural event', '#8b5688'),
  Club: svgPoster('Club event', '#2f7d78'),
  Career: svgPoster('Career event', '#9a6a32'),
}

/** Replaces an unavailable poster with an embedded image that needs no network request. */
export function handlePosterError(event: Event, category?: CategoryType): void {
  const image = event.currentTarget as HTMLImageElement | null
  if (!image || image.dataset.fallbackApplied === 'true') return

  image.dataset.fallbackApplied = 'true'
  image.src = (category && CATEGORY_FALLBACK_IMAGES[category]) || DEFAULT_FALLBACK_POSTER
}
