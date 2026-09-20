import { supabase } from '@/lib/supabase'

interface CancelledEventRow {
  id: string
  status: string
}

/**
 * Cancel an event owned by the currently signed-in organiser.
 */
export async function cancelOwnedEvent(
  eventId: string,
): Promise<CancelledEventRow> {
  // 确认当前登录用户
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(`Unable to verify your account: ${authError.message}`)
  }

  if (!user) {
    throw new Error('Please sign in again before cancelling an event.')
  }

  // 数据库状态使用小写 cancelled
  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'cancelled',
    })
    .eq('id', eventId)
    .eq('organiser_id', user.id)
    .select('id, status')
    .maybeSingle()

  if (error) {
    throw new Error(`Database update failed: ${error.message}`)
  }

  // 没有报错但也没有更新到记录，一般是 RLS 或所有者不匹配
  if (!data) {
    throw new Error(
      'The event was not updated. It may not belong to this organiser account, or database permission was denied.',
    )
  }

  if (data.status !== 'cancelled') {
    throw new Error('The database did not save the cancelled status.')
  }

  return data
}
