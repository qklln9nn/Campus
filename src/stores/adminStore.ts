import { ref } from 'vue'
import { defineStore } from 'pinia'

import { supabase } from '@/lib/supabase'

export type AdminUserRole = 'student' | 'organiser' | 'admin'
export type AccountStatus = 'active' | 'suspended'
export type SystemHealth = 'checking' | 'operational' | 'unavailable'

export interface AdminUser {
  id: string
  name: string
  email: string
  studentId: string
  department: string
  role: AdminUserRole
  status: AccountStatus
  joinedAt: string
}

export interface AdminSettings {
  requireApproval: boolean
  reportThreshold: number
  adminEmail: string
  updatedAt: string
}

interface ProfileAdminRow {
  id: string
  email: string | null
  full_name: string | null
  student_id: string | null
  major: string | null
  role: AdminUserRole
  account_status: AccountStatus
  created_at: string
}

interface SettingsRow {
  require_manual_approval: boolean
  report_threshold: number
  admin_email: string
  updated_at: string
}

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return fallback
}

export const useAdminStore = defineStore('admin', () => {
  const users = ref<AdminUser[]>([])
  const settings = ref<AdminSettings | null>(null)
  const loadingUsers = ref(false)
  const loadingSettings = ref(false)
  const errorMessage = ref('')
  const systemHealth = ref<SystemHealth>('checking')

  async function fetchUsers(): Promise<void> {
    loadingUsers.value = true
    errorMessage.value = ''
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,student_id,major,role,account_status,created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      users.value = ((data ?? []) as ProfileAdminRow[]).map((row) => ({
        id: row.id,
        name: row.full_name?.trim() || row.email?.split('@')[0] || 'Campus user',
        email: row.email ?? '',
        studentId: row.student_id ?? 'Not assigned',
        department: row.major?.trim() || 'Not provided',
        role: row.role,
        status: row.account_status,
        joinedAt: row.created_at,
      }))
    } catch (error) {
      errorMessage.value = messageFrom(error, 'Unable to load user accounts.')
      throw error
    } finally {
      loadingUsers.value = false
    }
  }

  async function updateUserAccess(
    userId: string,
    role: AdminUserRole,
    accountStatus: AccountStatus,
  ): Promise<void> {
    const { error } = await supabase.rpc('admin_update_user_access', {
      p_user_id: userId,
      p_role: role,
      p_account_status: accountStatus,
    })
    if (error) throw error
    await fetchUsers()
  }

  async function fetchSettings(): Promise<void> {
    loadingSettings.value = true
    errorMessage.value = ''
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('require_manual_approval,report_threshold,admin_email,updated_at')
        .eq('id', 'global')
        .single()

      if (error) throw error
      const row = data as SettingsRow
      settings.value = {
        requireApproval: row.require_manual_approval,
        reportThreshold: row.report_threshold,
        adminEmail: row.admin_email,
        updatedAt: row.updated_at,
      }
    } catch (error) {
      errorMessage.value = messageFrom(error, 'Unable to load system settings.')
      throw error
    } finally {
      loadingSettings.value = false
    }
  }

  async function saveSettings(reportThreshold: number, adminEmail: string): Promise<void> {
    const { error } = await supabase.rpc('admin_save_system_settings', {
      p_report_threshold: reportThreshold,
      p_admin_email: adminEmail.trim(),
    })
    if (error) throw error
    await fetchSettings()
  }

  async function checkSystemHealth(): Promise<void> {
    systemHealth.value = 'checking'
    const { data, error } = await supabase.rpc('admin_system_health')
    systemHealth.value = !error && data === true ? 'operational' : 'unavailable'
  }

  return {
    users,
    settings,
    loadingUsers,
    loadingSettings,
    errorMessage,
    systemHealth,
    fetchUsers,
    updateUserAccess,
    fetchSettings,
    saveSettings,
    checkSystemHealth,
  }
})
