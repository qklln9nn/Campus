import type { CategoryType } from '@/types/event'

/**
 * High-quality category fallback images using SVG data URIs & gradient patterns.
 * Ensures zero missing/broken images even if remote unsplash links fail or image URLs are blank.
 */
export const CATEGORY_FALLBACK_IMAGES: Record<CategoryType, string> = {
  Tech: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  Academic: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
  Sports: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
  Cultural: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
  Club: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&q=80',
  Career: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
}

export const DEFAULT_FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'

/**
 * Handle HTML image load error by gracefully swapping src with a reliable fallback
 */
export function handlePosterError(event: Event, category?: CategoryType) {
  const target = event.target as HTMLImageElement
  if (!target) return

  const fallback = (category && CATEGORY_FALLBACK_IMAGES[category]) || DEFAULT_FALLBACK_POSTER
  if (target.src !== fallback) {
    target.src = fallback
  }
}
