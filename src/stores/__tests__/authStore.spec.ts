import type { RouteLocationNormalized } from 'vue-router'
import type { Session } from '@supabase/supabase-js'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  profileSingle: vi.fn(),
  profileUpdateSingle: vi.fn(),
  from: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: mocks.from,
  },
}))

import { createAuthGuard } from '@/router'
import { getRoleHomePath, mapDatabaseRole, useAuthStore } from '@/stores/authStore'

const studentSession = {
  user: {
    id: 'student-1',
    email: 'student@campus.edu',
    user_metadata: { full_name: 'Test Student' },
  },
} as unknown as Session

const studentProfile = {
  id: 'student-1',
  email: 'student@campus.edu',
  full_name: 'Test Student',
  role: 'student',
  avatar_url: null,
  student_id: null,
  major: 'Computer Science',
  grade: 'Year 2',
  bio: '',
  interests: ['Technology'],
  clubs: [],
  available_time: [],
  notification_preferences: {
    emailAlerts: true,
    pushNotifications: true,
    eventReminders: true,
    waitlistUpdates: true,
    weeklyDigest: false,
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function route(meta: RouteLocationNormalized['meta'], fullPath = '/dashboard') {
  return { meta, fullPath } as RouteLocationNormalized
}

describe('auth store integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    })
    mocks.signOut.mockResolvedValue({ error: null })
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mocks.profileSingle.mockResolvedValue({ data: studentProfile, error: null })
    mocks.profileUpdateSingle.mockResolvedValue({ data: studentProfile, error: null })
    mocks.from.mockImplementation((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table: ${table}`)
      return {
        select: () => ({
          eq: () => ({ single: mocks.profileSingle }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({ single: mocks.profileUpdateSingle }),
          }),
        }),
      }
    })
  })

  it('maps database roles to application roles and home routes', () => {
    expect(mapDatabaseRole('student')).toBe('STUDENT')
    expect(mapDatabaseRole('organiser')).toBe('ORGANISER')
    expect(mapDatabaseRole('admin')).toBe('ADMIN')
    expect(getRoleHomePath('ADMIN')).toBe('/admin/dashboard')
    expect(() => mapDatabaseRole('owner')).toThrow('invalid role')
  })

  it('restores a Supabase session and loads its authoritative profile', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: studentSession }, error: null })
    const store = useAuthStore()

    await store.initializeAuth()

    expect(store.authReady).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.userRole).toBe('STUDENT')
    expect(store.currentUser?.name).toBe('Test Student')
  })

  it('never requests a privileged role during self-registration', async () => {
    mocks.signUp.mockResolvedValueOnce({
      data: { user: { id: 'new-user' }, session: null },
      error: null,
    })
    const store = useAuthStore()

    const result = await store.register({
      name: 'New Student',
      email: 'new@campus.edu',
      password: 'password123',
      major: 'Design',
      grade: 'Year 1',
    })

    expect(result.requiresEmailConfirmation).toBe(true)
    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: {
            full_name: 'New Student',
            major: 'Design',
            grade: 'Year 1',
          },
        }),
      }),
    )
  })

  it('redirects an unauthenticated protected request to login', async () => {
    const store = useAuthStore()
    store.authReady = true
    const guard = createAuthGuard(store)

    await expect(guard(route({ requiresAuth: true }, '/admin'))).resolves.toEqual({
      name: 'login',
      query: { redirect: '/admin' },
    })
  })

  it('redirects a student away from organiser routes', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: studentSession }, error: null })
    const store = useAuthStore()
    await store.initializeAuth()
    const guard = createAuthGuard(store)

    await expect(
      guard(route({ requiresAuth: true, roles: ['ORGANISER'] }, '/organiser/dashboard')),
    ).resolves.toBe('/dashboard')
  })

  it('requests password recovery through the configured reset page', async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ error: null })
    const store = useAuthStore()

    await store.requestPasswordReset(' student@campus.edu ')

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('student@campus.edu', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  })
})
