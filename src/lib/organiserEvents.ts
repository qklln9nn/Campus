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

/**
 * Change the current organiser's finished published events
 * to completed in the Supabase events table.
 */
export async function completeFinishedOwnedEvents(): Promise<number> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(
      `Unable to verify your account: ${authError.message}`,
    )
  }

  if (!user) {
    throw new Error(
      'Please sign in again before updating event status.',
    )
  }

  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  const today = `${year}-${month}-${day}`
  const currentTime = `${hours}:${minutes}:${seconds}`

  // 第一类：活动日期早于今天
  const { data: previousEvents, error: previousError } =
    await supabase
      .from('events')
      .update({
        status: 'completed',
      })
      .eq('organiser_id', user.id)
      .eq('status', 'published')
      .lt('event_date', today)
      .select('id')

  if (previousError) {
    throw new Error(
      `Unable to complete previous events: ${previousError.message}`,
    )
  }

  // 第二类：活动日期是今天，并且结束时间已经过去
  const { data: todayEvents, error: todayError } =
    await supabase
      .from('events')
      .update({
        status: 'completed',
      })
      .eq('organiser_id', user.id)
      .eq('status', 'published')
      .eq('event_date', today)
      .lte('end_time', currentTime)
      .select('id')

  if (todayError) {
    throw new Error(
      `Unable to complete today's events: ${todayError.message}`,
    )
  }

  return (
    (previousEvents?.length ?? 0) +
    (todayEvents?.length ?? 0)
  )
}
