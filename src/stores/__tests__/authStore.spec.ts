import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { useAuthStore, type UserProfile } from '@/stores/authStore'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>
type AuthResponse = {
  data: { user: User | null; session: Session | null }
  error: Error | null
}
type SessionResponse = {
  data: { session: Session | null }
  error: Error | null
}
type ErrorResponse = { error: Error | null }
type SignInCredentials = { email: string; password: string }
type SignUpCredentials = {
  email: string
  password: string
  options: {
    emailRedirectTo: string
    data: { full_name: string; major: string; grade: string }
  }
}
type PasswordResetOptions = { redirectTo: string }
type SignOutOptions = { scope: 'global' | 'local' | 'others' }
type UserAttributes = { password: string }
type ProfileQueryResult = {
  data: ProfileRow | null
  error: { message: string } | null
}
type AuthSubscriptionResult = {
  data: { subscription: { unsubscribe: () => void } }
}

interface MockProfileQuery {
  eq: Mock<(column: string, value: unknown) => MockProfileQuery>
  select: Mock<(columns: string) => MockProfileQuery>
  single: Mock<() => Promise<ProfileQueryResult>>
  update: Mock<(values: ProfileUpdate) => MockProfileQuery>
}

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn<(table: string) => MockProfileQuery>(),
  getSession: vi.fn<() => Promise<SessionResponse>>(),
  onAuthStateChange: vi.fn<(callback: AuthStateCallback) => AuthSubscriptionResult>(),
  resetPasswordForEmail:
    vi.fn<(email: string, options: PasswordResetOptions) => Promise<ErrorResponse>>(),
  signInWithPassword: vi.fn<(credentials: SignInCredentials) => Promise<AuthResponse>>(),
  signOut: vi.fn<(options: SignOutOptions) => Promise<ErrorResponse>>(),
  signUp: vi.fn<(credentials: SignUpCredentials) => Promise<AuthResponse>>(),
  unsubscribe: vi.fn<() => void>(),
  updateUser: vi.fn<(attributes: UserAttributes) => Promise<ErrorResponse>>(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: supabaseMocks.getSession,
      onAuthStateChange: supabaseMocks.onAuthStateChange,
      resetPasswordForEmail: supabaseMocks.resetPasswordForEmail,
      signInWithPassword: supabaseMocks.signInWithPassword,
      signOut: supabaseMocks.signOut,
      signUp: supabaseMocks.signUp,
      updateUser: supabaseMocks.updateUser,
    },
    from: supabaseMocks.from,
  },
}))

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'student@campus.edu',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Metadata Name' },
    identities: [],
    created_at: '2026-08-15T00:00:00.000Z',
    updated_at: '2026-08-15T00:00:00.000Z',
    ...overrides,
  } as User
}

function createSession(user = createUser()): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: 1_800_000_000,
    token_type: 'bearer',
    user,
  }
}

function createProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'user-123',
    email: 'student@campus.edu',
    full_name: 'Campus Student',
    role: 'student',
    avatar_url: null,
    student_id: 'STU-123',
    major: 'Computer Science',
    grade: 'Year 3',
    bio: 'Student bio',
    interests: ['Robotics'],
    clubs: ['ACM'],
    available_time: ['Saturday'],
    notification_preferences: {
      emailAlerts: true,
      pushNotifications: false,
      eventReminders: true,
      waitlistUpdates: false,
      weeklyDigest: true,
    },
    created_at: '2026-08-15T00:00:00.000Z',
    updated_at: '2026-08-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('auth store', () => {
  let pinia: Pinia
  let store: ReturnType<typeof useAuthStore>
  let authStateCallback: AuthStateCallback
  let profileQuery: MockProfileQuery

  beforeEach(() => {
    vi.resetAllMocks()

    profileQuery = {
      eq: vi.fn<(column: string, value: unknown) => MockProfileQuery>(),
      select: vi.fn<(columns: string) => MockProfileQuery>(),
      single: vi.fn<() => Promise<ProfileQueryResult>>(),
      update: vi.fn<(values: ProfileUpdate) => MockProfileQuery>(),
    }
    profileQuery.eq.mockReturnValue(profileQuery)
    profileQuery.select.mockReturnValue(profileQuery)
    profileQuery.update.mockReturnValue(profileQuery)
    supabaseMocks.from.mockReturnValue(profileQuery)

    supabaseMocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabaseMocks.signOut.mockResolvedValue({ error: null })
    supabaseMocks.onAuthStateChange.mockImplementation((callback: AuthStateCallback) => {
      authStateCallback = callback
      return {
        data: {
          subscription: { unsubscribe: supabaseMocks.unsubscribe },
        },
      }
    })

    pinia = createPinia()
    setActivePinia(pinia)
    store = useAuthStore()
  })

  afterEach(() => {
    store.disposeAuth()
    disposePinia(pinia)
  })

  it('initializes without a stored session and becomes ready', async () => {
    await store.initializeAuth()
    await store.initializeAuth()

    expect(supabaseMocks.getSession).toHaveBeenCalledTimes(1)
    expect(supabaseMocks.onAuthStateChange).toHaveBeenCalledTimes(1)
    expect(store.authReady).toBe(true)
    expect(store.isLoading).toBe(false)
    expect(store.session).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.userRole).toBeNull()
  })

  it('fails closed and clears a restored session whose profile cannot be loaded', async () => {
    const session = createSession()
    supabaseMocks.getSession.mockResolvedValue({ data: { session }, error: null })
    profileQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'profile unavailable' },
    })

    await store.initializeAuth()

    expect(supabaseMocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(store.authReady).toBe(true)
    expect(store.session).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.errorMessage).toBe('Unable to load your campus profile: profile unavailable')
  })

  it('does not authenticate when the session and loaded profile belong to different users', async () => {
    const session = createSession()
    supabaseMocks.getSession.mockResolvedValue({ data: { session }, error: null })
    profileQuery.single.mockResolvedValue({ data: createProfile(), error: null })
    await store.initializeAuth()
    expect(store.isAuthenticated).toBe(true)
    expect(store.userRole).toBe('STUDENT')

    store.session = createSession(createUser({ id: 'different-user' }))

    expect(store.isAuthenticated).toBe(false)
    expect(store.userRole).toBeNull()
    await expect(store.updateProfile({ name: 'Wrong account' })).rejects.toThrow(
      'synchronized profile',
    )
    expect(profileQuery.update).not.toHaveBeenCalled()
  })

  it('logs in and maps the database profile and role', async () => {
    const user = createUser({ email: 'organiser@campus.edu' })
    const session = createSession(user)
    const profile = createProfile({
      email: 'organiser@campus.edu',
      full_name: '  Dr. Sarah Jenkins  ',
      role: 'organiser',
      avatar_url: 'https://example.test/avatar.png',
      student_id: 'ORG-8821',
      major: 'Campus Life',
      grade: 'Staff',
      bio: 'Event organiser',
      interests: ['Community'],
      clubs: ['Campus Events'],
      available_time: ['Weekdays'],
    })
    supabaseMocks.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null,
    })
    profileQuery.single.mockResolvedValue({ data: profile, error: null })

    const result = await store.login('  organiser@campus.edu  ', 'password123')

    expect(supabaseMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'organiser@campus.edu',
      password: 'password123',
    })
    expect(supabaseMocks.from).toHaveBeenCalledWith('profiles')
    expect(profileQuery.eq).toHaveBeenCalledWith('id', user.id)
    expect(result).toMatchObject({
      id: user.id,
      name: 'Dr. Sarah Jenkins',
      email: 'organiser@campus.edu',
      role: 'ORGANISER',
      avatar: 'https://example.test/avatar.png',
      studentId: 'ORG-8821',
      major: 'Campus Life',
      grade: 'Staff',
      bio: 'Event organiser',
      interests: ['Community'],
      clubs: ['Campus Events'],
      availableTime: ['Weekdays'],
    })
    expect(store.currentUser).toEqual(result)
    expect(store.userRole).toBe('ORGANISER')
    expect(store.homePath).toBe('/organiser/dashboard')
    expect(store.isAuthenticated).toBe(true)
    expect(store.isLoading).toBe(false)
  })

  it('fails closed and removes the local session when the profile cannot be loaded', async () => {
    const user = createUser()
    const session = createSession(user)
    supabaseMocks.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null,
    })
    profileQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'profile access denied' },
    })

    await expect(store.login('student@campus.edu', 'password123')).rejects.toThrow(
      'Unable to load your campus profile: profile access denied',
    )

    expect(supabaseMocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(store.session).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.errorMessage).toBe('Unable to load your campus profile: profile access denied')
    expect(store.isLoading).toBe(false)
  })

  it('returns an email-confirmation result without authenticating the new user', async () => {
    const user = createUser({ email: 'new.student@campus.edu' })
    supabaseMocks.signUp.mockResolvedValue({
      data: { user, session: null },
      error: null,
    })

    const result = await store.register({
      name: '  New Student  ',
      email: '  new.student@campus.edu  ',
      password: 'password123',
      major: '  Engineering  ',
      grade: '  Year 1  ',
    })

    expect(result).toEqual({ requiresEmailConfirmation: true, profile: null })
    expect(supabaseMocks.signUp).toHaveBeenCalledWith({
      email: 'new.student@campus.edu',
      password: 'password123',
      options: {
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
        data: {
          full_name: 'New Student',
          major: 'Engineering',
          grade: 'Year 1',
        },
      },
    })
    const signUpPayload = supabaseMocks.signUp.mock.calls[0]?.[0]
    if (!signUpPayload) throw new Error('Expected Supabase signUp to be called')
    expect(signUpPayload.options.data).not.toHaveProperty('role')
    expect(store.session).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.isLoading).toBe(false)
  })

  it('loads the profile when registration immediately returns a session', async () => {
    const user = createUser({ email: 'new.student@campus.edu' })
    const session = createSession(user)
    const profile = createProfile({
      email: 'new.student@campus.edu',
      full_name: 'New Student',
    })
    supabaseMocks.signUp.mockResolvedValue({
      data: { user, session },
      error: null,
    })
    profileQuery.single.mockResolvedValue({ data: profile, error: null })

    const result = await store.register({
      name: 'New Student',
      email: 'new.student@campus.edu',
      password: 'password123',
    })

    expect(result.requiresEmailConfirmation).toBe(false)
    expect(result.profile).toMatchObject({
      id: user.id,
      email: 'new.student@campus.edu',
      role: 'STUDENT',
    })
    expect(store.isAuthenticated).toBe(true)
    expect(store.currentUser).toEqual(result.profile)
  })

  it('removes an immediate registration session when its profile cannot be loaded', async () => {
    const user = createUser({ email: 'new.student@campus.edu' })
    const session = createSession(user)
    supabaseMocks.signUp.mockResolvedValue({
      data: { user, session },
      error: null,
    })
    profileQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'profile trigger failed' },
    })

    await expect(
      store.register({
        name: 'New Student',
        email: 'new.student@campus.edu',
        password: 'password123',
      }),
    ).rejects.toThrow('Unable to load your campus profile: profile trigger failed')

    expect(supabaseMocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(store.session).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('uses the configured callback for password recovery email delivery', async () => {
    supabaseMocks.resetPasswordForEmail.mockResolvedValue({ error: null })

    await store.requestPasswordReset('  student@campus.edu  ')

    expect(supabaseMocks.resetPasswordForEmail).toHaveBeenCalledWith('student@campus.edu', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    expect(store.isLoading).toBe(false)
    expect(store.errorMessage).toBeNull()
  })

  it('updates a password only during an authenticated PASSWORD_RECOVERY event', async () => {
    await expect(store.updatePassword('new-password-123')).rejects.toThrow(
      'Open a valid password recovery link',
    )
    expect(supabaseMocks.updateUser).not.toHaveBeenCalled()

    await store.initializeAuth()
    const session = createSession()
    profileQuery.single.mockResolvedValue({ data: createProfile(), error: null })
    await authStateCallback('PASSWORD_RECOVERY', session)
    await vi.waitFor(() => {
      expect(store.isPasswordRecovery).toBe(true)
      expect(store.isAuthenticated).toBe(true)
    })
    supabaseMocks.updateUser.mockResolvedValue({ error: null })

    await store.updatePassword('new-password-123')

    expect(supabaseMocks.updateUser).toHaveBeenCalledWith({ password: 'new-password-123' })
    expect(store.isPasswordRecovery).toBe(false)
    expect(store.isLoading).toBe(false)
    expect(store.errorMessage).toBeNull()
  })

  it('clears the authenticated state after a SIGNED_OUT event', async () => {
    const user = createUser()
    const session = createSession(user)
    const profile = createProfile()
    supabaseMocks.getSession.mockResolvedValue({ data: { session }, error: null })
    profileQuery.single.mockResolvedValue({ data: profile, error: null })
    await store.initializeAuth()
    expect(store.isAuthenticated).toBe(true)

    await authStateCallback('SIGNED_OUT', null)

    await vi.waitFor(() => {
      expect(store.session).toBeNull()
      expect(store.currentUser).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  it('signs out when an auth event carries a session without a valid profile', async () => {
    await store.initializeAuth()
    const session = createSession()
    profileQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'profile unavailable' },
    })

    await authStateCallback('SIGNED_IN', session)

    await vi.waitFor(() => {
      expect(supabaseMocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
      expect(store.session).toBeNull()
      expect(store.currentUser).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  it('updates only approved profile columns and ignores identity and role fields', async () => {
    const user = createUser()
    const session = createSession(user)
    const initialProfile = createProfile()
    const updatedProfile = createProfile({
      full_name: 'Updated Student',
      avatar_url: null,
      major: 'Mathematics',
      grade: 'Year 4',
      bio: 'Updated bio',
      interests: ['Mathematics'],
      clubs: ['Chess Club'],
      available_time: ['Friday'],
      notification_preferences: {
        emailAlerts: false,
        pushNotifications: true,
        eventReminders: false,
        waitlistUpdates: true,
        weeklyDigest: false,
      },
    })
    supabaseMocks.getSession.mockResolvedValue({ data: { session }, error: null })
    profileQuery.single
      .mockResolvedValueOnce({ data: initialProfile, error: null })
      .mockResolvedValueOnce({ data: updatedProfile, error: null })
    await store.initializeAuth()

    const changes: Partial<UserProfile> = {
      id: 'different-user',
      email: 'attacker@campus.edu',
      role: 'ADMIN',
      name: '  Updated Student  ',
      avatar: '',
      studentId: 'STU-999',
      major: '  Mathematics  ',
      grade: '  Year 4  ',
      bio: '  Updated bio  ',
      interests: ['Mathematics'],
      clubs: ['Chess Club'],
      availableTime: ['Friday'],
      notificationPreferences: {
        emailAlerts: false,
        pushNotifications: true,
        eventReminders: false,
        waitlistUpdates: true,
        weeklyDigest: false,
      },
    }

    const result = await store.updateProfile(changes)

    expect(profileQuery.update).toHaveBeenCalledWith({
      full_name: 'Updated Student',
      avatar_url: null,
      major: 'Mathematics',
      grade: 'Year 4',
      bio: 'Updated bio',
      interests: ['Mathematics'],
      clubs: ['Chess Club'],
      available_time: ['Friday'],
      notification_preferences: {
        emailAlerts: false,
        pushNotifications: true,
        eventReminders: false,
        waitlistUpdates: true,
        weeklyDigest: false,
      },
    })
    const updatePayload = profileQuery.update.mock.calls[0]?.[0]
    expect(updatePayload).not.toHaveProperty('id')
    expect(updatePayload).not.toHaveProperty('email')
    expect(updatePayload).not.toHaveProperty('role')
    expect(updatePayload).not.toHaveProperty('student_id')
    expect(profileQuery.eq).toHaveBeenLastCalledWith('id', user.id)
    expect(result.role).toBe('STUDENT')
    expect(store.currentUser).toEqual(result)
    expect(store.isLoading).toBe(false)
  })

  it('signs out locally and clears the store', async () => {
    const user = createUser()
    const session = createSession(user)
    supabaseMocks.getSession.mockResolvedValue({ data: { session }, error: null })
    profileQuery.single.mockResolvedValue({ data: createProfile(), error: null })
    await store.initializeAuth()

    await store.logout()

    expect(supabaseMocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(store.session).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.errorMessage).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('clears local identity even when Supabase sign-out reports an error', async () => {
    const user = createUser()
    const session = createSession(user)
    supabaseMocks.getSession.mockResolvedValue({ data: { session }, error: null })
    profileQuery.single.mockResolvedValue({ data: createProfile(), error: null })
    await store.initializeAuth()
    supabaseMocks.signOut.mockResolvedValue({ error: new Error('network unavailable') })

    await expect(store.logout()).rejects.toThrow('network unavailable')

    expect(store.session).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.isLoading).toBe(false)
  })
})
