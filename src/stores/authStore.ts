import type { Session, User } from '@supabase/supabase-js'
import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database'

export type UserRole = 'STUDENT' | 'ORGANISER' | 'ADMIN'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export interface NotificationPreferences {
  emailAlerts: boolean
  pushNotifications: boolean
  eventReminders: boolean
  waitlistUpdates: boolean
  weeklyDigest: boolean
}

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  studentId?: string
  major: string
  grade: string
  interests: string[]
  clubs: string[]
  availableTime: string[]
  notificationPreferences: NotificationPreferences
  bio: string
}

export interface RegistrationDetails {
  name: string
  email: string
  password: string
  major?: string
  grade?: string
}

export interface RegistrationResult {
  requiresEmailConfirmation: boolean
  profile: UserProfile | null
}

const PROFILE_COLUMNS =
  'id,email,full_name,role,avatar_url,student_id,major,grade,bio,interests,clubs,available_time,notification_preferences,created_at,updated_at'

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailAlerts: true,
  pushNotifications: true,
  eventReminders: true,
  waitlistUpdates: true,
  weeklyDigest: false,
}

export function mapDatabaseRole(role: string): UserRole {
  if (role === 'student') return 'STUDENT'
  if (role === 'organiser') return 'ORGANISER'
  if (role === 'admin') return 'ADMIN'
  throw new Error('This account has an invalid role. Please contact a campus administrator.')
}

export function getRoleHomePath(role: UserRole | null | undefined): string {
  if (role === 'ORGANISER') return '/organiser/dashboard'
  if (role === 'ADMIN') return '/admin'
  return '/dashboard'
}

function asRecord(value: Json): Record<string, Json | undefined> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  return {}
}

function normalizeNotificationPreferences(value: Json): NotificationPreferences {
  const preferences = asRecord(value)
  const booleanValue = (key: keyof NotificationPreferences) => {
    const candidate = preferences[key]
    return typeof candidate === 'boolean' ? candidate : DEFAULT_NOTIFICATION_PREFERENCES[key]
  }

  return {
    emailAlerts: booleanValue('emailAlerts'),
    pushNotifications: booleanValue('pushNotifications'),
    eventReminders: booleanValue('eventReminders'),
    waitlistUpdates: booleanValue('waitlistUpdates'),
    weeklyDigest: booleanValue('weeklyDigest'),
  }
}

function normalizeProfile(user: User, profile: ProfileRow): UserProfile {
  if (profile.id !== user.id) {
    throw new Error('The authenticated user does not match the loaded profile.')
  }

  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name
  const email = user.email ?? profile.email ?? ''
  const emailName = email.includes('@') ? email.slice(0, email.indexOf('@')) : email
  const name =
    profile.full_name?.trim() || String(metadataName ?? '').trim() || emailName || 'Campus user'

  return {
    id: user.id,
    name,
    email,
    role: mapDatabaseRole(profile.role),
    avatar: profile.avatar_url ?? undefined,
    studentId: profile.student_id ?? undefined,
    major: profile.major ?? '',
    grade: profile.grade ?? '',
    interests: Array.isArray(profile.interests) ? [...profile.interests] : [],
    clubs: Array.isArray(profile.clubs) ? [...profile.clubs] : [],
    availableTime: Array.isArray(profile.available_time) ? [...profile.available_time] : [],
    notificationPreferences: normalizeNotificationPreferences(profile.notification_preferences),
    bio: profile.bio ?? '',
  }
}

function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error
  return new Error(fallbackMessage)
}

export const useAuthStore = defineStore('auth', () => {
  const session = shallowRef<Session | null>(null)
  const currentUser = ref<UserProfile | null>(null)
  const authReady = ref(false)
  const isPasswordRecovery = ref(false)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const isAuthenticated = computed(() => {
    const authUserId = session.value?.user.id
    return Boolean(authUserId && currentUser.value?.id === authUserId)
  })
  const userRole = computed<UserRole | null>(() =>
    isAuthenticated.value ? (currentUser.value?.role ?? null) : null,
  )
  const homePath = computed(() => getRoleHomePath(userRole.value))

  let initializationPromise: Promise<void> | null = null
  let authSubscription: { unsubscribe: () => void } | null = null
  let sessionSyncQueue: Promise<void> = Promise.resolve()

  function setError(error: unknown, fallbackMessage: string): Error {
    const normalizedError = toError(error, fallbackMessage)
    errorMessage.value = normalizedError.message
    return normalizedError
  }

  function clearError() {
    errorMessage.value = null
  }

  async function fetchProfile(user: User): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .single()

    if (error) {
      throw new Error(`Unable to load your campus profile: ${error.message}`)
    }
    if (!data) {
      throw new Error('No campus profile exists for this account.')
    }

    return normalizeProfile(user, data)
  }

  async function syncSession(nextSession: Session | null): Promise<void> {
    currentUser.value = null
    session.value = nextSession

    if (!nextSession?.user) {
      isPasswordRecovery.value = false
      return
    }

    currentUser.value = await fetchProfile(nextSession.user)
  }

  function queueSessionSync(nextSession: Session | null): Promise<void> {
    const nextSync = sessionSyncQueue.catch(() => undefined).then(() => syncSession(nextSession))

    sessionSyncQueue = nextSync
    return nextSync
  }

  function subscribeToAuthChanges() {
    if (authSubscription) return

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        isPasswordRecovery.value = Boolean(nextSession)
      } else if (
        event === 'SIGNED_OUT' ||
        (event === 'SIGNED_IN' && nextSession?.user.id !== session.value?.user.id)
      ) {
        isPasswordRecovery.value = false
      }

      if (
        event === 'TOKEN_REFRESHED' &&
        nextSession?.user &&
        currentUser.value?.id === nextSession.user.id
      ) {
        session.value = nextSession
        return
      }

      void queueSessionSync(nextSession).catch(async (error: unknown) => {
        setError(error, 'Unable to synchronize your authentication session.')
        if (nextSession) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
        }
        await queueSessionSync(null)
      })
    })

    authSubscription = data.subscription
  }

  async function initializeAuth(): Promise<void> {
    if (initializationPromise) return initializationPromise

    initializationPromise = (async () => {
      isLoading.value = true
      clearError()
      subscribeToAuthChanges()

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        await queueSessionSync(data.session)
      } catch (error) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
        await queueSessionSync(null)
        setError(error, 'Unable to restore your authentication session.')
      } finally {
        authReady.value = true
        isLoading.value = false
      }
    })()

    return initializationPromise
  }

  async function login(email: string, password: string): Promise<UserProfile> {
    isLoading.value = true
    isPasswordRecovery.value = false
    clearError()
    let sessionCreated = false

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error
      if (!data.session) throw new Error('Supabase did not return a session for this login.')

      sessionCreated = true
      await queueSessionSync(data.session)

      if (!currentUser.value) {
        throw new Error('Your account is authenticated but has no valid campus profile.')
      }

      clearError()
      return currentUser.value
    } catch (error) {
      if (sessionCreated) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
        await queueSessionSync(null)
      }
      throw setError(error, 'Unable to sign in.')
    } finally {
      isLoading.value = false
    }
  }

  async function register(details: RegistrationDetails): Promise<RegistrationResult> {
    isLoading.value = true
    isPasswordRecovery.value = false
    clearError()
    let sessionCreated = false

    try {
      const { data, error } = await supabase.auth.signUp({
        email: details.email.trim(),
        password: details.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
          data: {
            full_name: details.name.trim(),
            major: details.major?.trim() ?? '',
            grade: details.grade?.trim() ?? '',
          },
        },
      })

      if (error) throw error

      if (!data.session) {
        return {
          requiresEmailConfirmation: true,
          profile: null,
        }
      }

      sessionCreated = true
      await queueSessionSync(data.session)
      if (!currentUser.value) {
        throw new Error('Your account was created but its campus profile could not be loaded.')
      }

      clearError()
      return {
        requiresEmailConfirmation: false,
        profile: currentUser.value,
      }
    } catch (error) {
      if (sessionCreated) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
        await queueSessionSync(null)
      }
      throw setError(error, 'Unable to create your account.')
    } finally {
      isLoading.value = false
    }
  }

  async function requestPasswordReset(email: string): Promise<void> {
    isLoading.value = true
    clearError()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
    } catch (error) {
      throw setError(error, 'Unable to send the password reset email.')
    } finally {
      isLoading.value = false
    }
  }

  async function updatePassword(password: string): Promise<void> {
    if (!isPasswordRecovery.value || !isAuthenticated.value) {
      throw setError(
        new Error('Open a valid password recovery link before setting a new password.'),
        'A valid password recovery session is required.',
      )
    }

    isLoading.value = true
    clearError()

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      isPasswordRecovery.value = false
    } catch (error) {
      throw setError(error, 'Unable to update your password.')
    } finally {
      isLoading.value = false
    }
  }

  async function updateProfile(updatedData: Partial<UserProfile>): Promise<UserProfile> {
    const authUser = session.value?.user
    if (!authUser || !isAuthenticated.value) {
      throw new Error('You must be signed in with a synchronized profile to update it.')
    }

    isLoading.value = true
    clearError()

    try {
      const profileUpdate: ProfileUpdate = {}

      if (updatedData.name !== undefined) profileUpdate.full_name = updatedData.name.trim()
      if (updatedData.avatar !== undefined) profileUpdate.avatar_url = updatedData.avatar || null
      if (updatedData.major !== undefined) profileUpdate.major = updatedData.major.trim()
      if (updatedData.grade !== undefined) profileUpdate.grade = updatedData.grade.trim()
      if (updatedData.bio !== undefined) profileUpdate.bio = updatedData.bio.trim()
      if (updatedData.interests !== undefined) profileUpdate.interests = [...updatedData.interests]
      if (updatedData.clubs !== undefined) profileUpdate.clubs = [...updatedData.clubs]
      if (updatedData.availableTime !== undefined) {
        profileUpdate.available_time = [...updatedData.availableTime]
      }
      if (updatedData.notificationPreferences !== undefined) {
        profileUpdate.notification_preferences = { ...updatedData.notificationPreferences }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', authUser.id)
        .select(PROFILE_COLUMNS)
        .single()

      if (error) throw error
      if (!data) throw new Error('Supabase did not return the updated profile.')

      currentUser.value = normalizeProfile(authUser, data)
      return currentUser.value
    } catch (error) {
      throw setError(error, 'Unable to update your profile.')
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    clearError()

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch (error) {
      throw setError(error, 'Unable to sign out cleanly.')
    } finally {
      await queueSessionSync(null)
      isLoading.value = false
    }
  }

  function disposeAuth() {
    authSubscription?.unsubscribe()
    authSubscription = null
    initializationPromise = null
  }

  return {
    session,
    currentUser,
    authReady,
    isPasswordRecovery,
    isLoading,
    errorMessage,
    isAuthenticated,
    userRole,
    homePath,
    clearError,
    initializeAuth,
    login,
    register,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    logout,
    disposeAuth,
  }
})
