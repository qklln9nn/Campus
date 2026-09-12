import { describe, expect, it } from 'vitest'

import { categoryLabel, categorySlug } from '@/lib/category'

describe('category helpers', () => {
  it('creates stable database slugs for administrator-defined names', () => {
    expect(categorySlug('  Community & Service  ')).toBe('community-service')
  })

  it('creates a readable label for a stored slug', () => {
    expect(categoryLabel('community-service')).toBe('Community Service')
  })
})
