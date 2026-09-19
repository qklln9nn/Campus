import { supabase } from '@/lib/supabase'

/**
 * Cancels an event owned by the signed-in organiser.
 * Database RLS remains responsible for ownership and role checks.
 */
export async function cancelOwnedEvent(eventId: string): Promise<void> {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new Error('The event was not changed. Check that it belongs to your organiser account.')
  }
}
