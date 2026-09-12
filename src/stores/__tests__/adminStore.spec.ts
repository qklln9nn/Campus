import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn<(table: string) => Record<string, unknown>>(),
  rpc: vi.fn<(name: string, args?: Record<string, unknown>) => Promise<{ data?: unknown; error: unknown }>>(),
  profileOrder: vi.fn<() => Promise<{ data: unknown[]; error: unknown }>>(),
  settingsSingle: vi.fn<() => Promise<{ data: unknown; error: unknown }>>(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}))

import { useAdminStore } from '@/stores/adminStore'

const profile = {
  id: 'user-1',
  email: 'student@campus.edu',
  full_name: 'Test Student',
  student_id: 'S1001',
  major: 'Software Engineering',
  role: 'student',
  account_status: 'active',
  created_at: '2026-01-01T00:00:00Z',
}

const settings = {
  require_manual_approval: true,
  report_threshold: 4,
  admin_email: 'moderation@campus.edu',
  updated_at: '2026-01-02T00:00:00Z',
}

describe('admin store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.profileOrder.mockResolvedValue({ data: [profile], error: null })
    mocks.settingsSingle.mockResolvedValue({ data: settings, error: null })
    mocks.rpc.mockImplementation((name: string) =>
      Promise.resolve(name === 'admin_system_health' ? { data: true, error: null } : { error: null }),
    )
    mocks.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ order: mocks.profileOrder }) }
      }
      if (table === 'system_settings') {
        return {
          select: () => ({
            eq: () => ({ single: mocks.settingsSingle }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('loads real profile rows for the user management page', async () => {
    const store = useAdminStore()

    await store.fetchUsers()

    expect(store.users).toEqual([
      expect.objectContaining({
        id: 'user-1',
        name: 'Test Student',
        role: 'student',
        status: 'active',
      }),
    ])
  })

  it('updates user access through the protected administrator RPC', async () => {
    const store = useAdminStore()

    await store.updateUserAccess('user-1', 'organiser', 'suspended')

    expect(mocks.rpc).toHaveBeenCalledWith('admin_update_user_access', {
      p_user_id: 'user-1',
      p_role: 'organiser',
      p_account_status: 'suspended',
    })
    expect(mocks.profileOrder).toHaveBeenCalled()
  })

  it('loads and saves persistent system settings', async () => {
    const store = useAdminStore()

    await store.fetchSettings()
    await store.saveSettings(5, ' alerts@campus.edu ')

    expect(store.settings?.reportThreshold).toBe(4)
    expect(mocks.rpc).toHaveBeenCalledWith('admin_save_system_settings', {
      p_report_threshold: 5,
      p_admin_email: 'alerts@campus.edu',
    })
  })

  it('reports the result of a live database health RPC', async () => {
    const store = useAdminStore()

    await store.checkSystemHealth()

    expect(store.systemHealth).toBe('operational')
  })
})
