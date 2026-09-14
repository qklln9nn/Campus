import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { categoryLabel, categorySlug } from '@/lib/category'
import { supabase } from '@/lib/supabase'

export interface EventCategory {
  slug: string
  name: string
  isActive: boolean
  sortOrder: number
}

interface EventCategoryRow {
  slug: string
  name: string
  is_active: boolean
  sort_order: number
}

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return fallback
}

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref<EventCategory[]>([])
  const loading = ref(false)
  const error = ref('')

  const activeCategories = computed(() => categories.value.filter((category) => category.isActive))
  const inactiveCategories = computed(() => categories.value.filter((category) => !category.isActive))

  async function fetchCategories(includeInactive = false): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      let query = supabase
        .from('event_categories')
        .select('slug,name,is_active,sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (!includeInactive) query = query.eq('is_active', true)

      const { data, error: queryError } = await query
      if (queryError) throw queryError
      categories.value = ((data ?? []) as EventCategoryRow[]).map((row) => ({
        slug: row.slug,
        name: row.name,
        isActive: row.is_active,
        sortOrder: row.sort_order,
      }))
    } catch (queryError) {
      error.value = errorMessage(queryError, 'Unable to load event categories.')
      throw queryError
    } finally {
      loading.value = false
    }
  }

  async function setCategory(name: string, active: boolean, slug = categorySlug(name)): Promise<void> {
    const cleanName = name.trim()
    if (!cleanName || !slug) throw new Error('Enter a valid category name.')

    const { error: mutationError } = await supabase.rpc('admin_set_event_category', {
      p_slug: slug,
      p_name: cleanName,
      p_active: active,
    })
    if (mutationError) throw mutationError
    await fetchCategories(true)
  }

  function labelFor(value: string): string {
    const slug = categorySlug(value)
    return categories.value.find((category) => category.slug === slug)?.name ?? categoryLabel(value)
  }

  return {
    categories,
    activeCategories,
    inactiveCategories,
    loading,
    error,
    fetchCategories,
    setCategory,
    labelFor,
  }
})
