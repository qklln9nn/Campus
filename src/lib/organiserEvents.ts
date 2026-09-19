import { supabase } from '@/lib/supabase'
import { useEventStore } from '@/stores/eventStore'

/**
 * Cancels an event owned by the signed-in organiser.
 * Updates local store state and persists to Supabase.
 */
export async function cancelOwnedEvent(eventId: string): Promise<void> {
  try {
    const eventStore = useEventStore()
    eventStore.markEventCancelledLocally(eventId)
  } catch (e) {
    console.warn('markEventCancelledLocally warning:', e)
  }

  if (!supabase) return

  const { error } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId)

  if (error) {
    console.warn('Supabase cancelOwnedEvent warning:', error)
  }
}


