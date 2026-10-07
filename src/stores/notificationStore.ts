import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'

export interface AppNotification {
  id: string
  title: string
  content: string
  is_read: boolean
  created_at: string
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<AppNotification[]>([])
  const loading = ref(false)
  const authStore = useAuthStore()

  async function fetchNotifications() {
    const userId = authStore.currentUser?.id
    if (!userId) return

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      notifications.value = data || []
    } catch (err) {
      console.warn('Could not fetch notifications:', err)
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id: string) {
    const notif = notifications.value.find(n => n.id === id)
    if (notif) notif.is_read = true

    try {
      await supabase.from('in_app_notifications').update({ is_read: true }).eq('id', id)
    } catch (err) {
      console.warn('Could not mark notification as read:', err)
    }
  }

  async function markAllAsRead() {
    const authStore = useAuthStore()
    const userId = authStore.currentUser?.id
    if (!userId) return

    notifications.value.forEach(n => n.is_read = true)

    try {
      await supabase.from('in_app_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    } catch (err) {
      console.warn('Could not mark all as read:', err)
    }
  }

  let channel: ReturnType<typeof supabase.channel> | null = null

  function subscribeToRealtime(userId: string) {
    if (channel) supabase.removeChannel(channel)
    
    channel = supabase
      .channel('public:in_app_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'in_app_notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          notifications.value.unshift(payload.new as AppNotification)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'in_app_notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const index = notifications.value.findIndex(n => n.id === payload.new.id)
          if (index !== -1) {
            notifications.value[index] = payload.new as AppNotification
          }
        }
      )
      .subscribe()
  }

  watch(() => authStore.currentUser?.id, (newId) => {
    if (newId) {
      fetchNotifications()
      subscribeToRealtime(newId)
    } else {
      notifications.value = []
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
    }
  }, { immediate: true })

  return { notifications, loading, fetchNotifications, markAsRead, markAllAsRead }
})
