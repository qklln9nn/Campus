import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export type UserRole = 'STUDENT' | 'ORGANISER' | 'ADMIN'

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

export const useAuthStore = defineStore('auth', () => {
  const STORAGE_KEY = 'campus_eventhub_user'
  const REGISTERED_USERS_KEY = 'campus_registered_users'
  const REMEMBERED_EMAIL_KEY = 'campus_remembered_email'

  const savedUser = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
  const currentUser = ref<UserProfile | null>(
    savedUser ? JSON.parse(savedUser) : null
  )

  // Local Registered Users Registry (For offline / non-supabase fallback validation)
  const savedRegisteredUsers = localStorage.getItem(REGISTERED_USERS_KEY)
  const registeredUsers = ref<Record<string, UserProfile>>(
    savedRegisteredUsers ? JSON.parse(savedRegisteredUsers) : {}
  )

  const isAuthenticated = ref<boolean>(!!currentUser.value)
  const isLoading = ref<boolean>(false)

  const userRole = computed<UserRole>(() => currentUser.value?.role || 'STUDENT')

  /**
   * Real Supabase Authentication Login Method
   */
  async function login(
    email: string,
    password?: string,
    fallbackRole: UserRole = 'STUDENT',
    rememberMe: boolean = true
  ): Promise<{ success: boolean; message?: string }> {
    isLoading.value = true
    const normalizedEmail = email.trim().toLowerCase()
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

    // Validate if Key is proper JWT format
    const isStandardJwt = anonKey && anonKey.startsWith('eyJ')

    try {
      if (import.meta.env.VITE_SUPABASE_URL && isStandardJwt) {
        // Race condition timeout guard (4.0 seconds)
        const authPromise = supabase.auth.signInWithPassword({
          email,
          password: password || '',
        })
        const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Network request timed out. Please check your network or Supabase credentials.' } }), 4000)
        )

        const { data: authData, error: authError } = await Promise.race([authPromise, timeoutPromise])

        if (authError || !authData?.user) {
          // Clean up any stale local registration cache for this email
          if (registeredUsers.value[normalizedEmail]) {
            delete registeredUsers.value[normalizedEmail]
            localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers.value))
          }
          return {
            success: false,
            message: authError?.message || 'Invalid login credentials. Account does not exist or has been deleted.',
          }
        }

        // Fetch user profile from public.profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle()

        // Priority 1: Database profiles table role (Authoritative)
        // Priority 2: Auth user_metadata role saved during signUp
        // Priority 3: Form fallbackRole selected during login
        let dbRole: UserRole = fallbackRole || 'STUDENT'
        if (profile?.role) {
          dbRole = profile.role.toUpperCase() as UserRole
        } else if (authData.user.user_metadata?.role) {
          dbRole = authData.user.user_metadata.role.toUpperCase() as UserRole
        }

        // If profile was missing or outdated, update profile table to keep in sync
        if (!profile || profile.role?.toUpperCase() !== dbRole) {
          await supabase.from('profiles').upsert(
            {
              id: authData.user.id,
              email: authData.user.email || email,
              full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || (email ? email.split('@')[0] : 'Campus Organiser'),
              role: dbRole.toLowerCase(),
            },
            { onConflict: 'id' }
          )
        }

        currentUser.value = {
          id: authData.user.id,
          name: profile?.full_name || profile?.name || (authData.user.email ? authData.user.email.split('@')[0] : '') || 'Campus User',
          email: authData.user.email || email,
          role: dbRole,
          avatar: profile?.avatar_url || profile?.avatar || '',
          studentId: profile?.student_id || '',
          major: profile?.major || '',
          grade: profile?.grade || '',
          interests: [],
          clubs: [],
          availableTime: [],
          notificationPreferences: {
            emailAlerts: true,
            pushNotifications: true,
            eventReminders: true,
            waitlistUpdates: true,
            weeklyDigest: false,
          },
          bio: profile?.bio || '',
        }
        isAuthenticated.value = true

        // Handle Remember Me persistent storage contract
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
        } else {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(REMEMBERED_EMAIL_KEY)
        }

        return { success: true }
      } else if (anonKey && !isStandardJwt) {
        return {
          success: false,
          message: 'Invalid VITE_SUPABASE_ANON_KEY format! Key should be a JWT token starting with "eyJ...". Please check your .env.local file.',
        }
      }

      return {
        success: false,
        message: 'Unable to connect to Supabase authentication server.',
      }
    } catch (e: any) {
      console.warn('Supabase Auth attempt failed:', e)
      return {
        success: false,
        message: e?.message || 'Login attempt failed.',
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Real Supabase & Strict Offline Registration Interceptor
   */
  async function register(details: {
    name: string
    email: string
    password?: string
    role: UserRole
    major?: string
    grade?: string
  }): Promise<{ success: boolean; message?: string }> {
    isLoading.value = true
    const normalizedEmail = details.email.trim().toLowerCase()
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const isStandardJwt = anonKey && anonKey.startsWith('eyJ')

    try {
      if (import.meta.env.VITE_SUPABASE_URL && isStandardJwt) {
        const signUpPromise = supabase.auth.signUp({
          email: details.email,
          password: details.password || '',
          options: {
            data: {
              name: details.name,
              full_name: details.name,
              role: details.role.toLowerCase(),
              major: details.major || '',
              grade: details.grade || '',
            },
          },
        })
        const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Supabase network timeout. Please check your API Key in .env.local.' } }), 4000)
        )

        const { data: authData, error: authError } = await Promise.race([signUpPromise, timeoutPromise])

        if (authError || !authData?.user) {
          return {
            success: false,
            message: authError?.message || 'Registration failed. Email may already be registered.',
          }
        }

        // Enforce Supabase database profiles sync with role, major, and grade
        const selectedRoleStr = details.role.toLowerCase()
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: details.email,
          full_name: details.name,
          role: selectedRoleStr,
          major: details.major || '',
          grade: details.grade || '',
        })

        const newProfile: UserProfile = {
          id: authData.user.id,
          name: details.name,
          email: details.email,
          role: details.role,
          avatar: '',
          major: details.major || '',
          grade: details.grade || '',
          studentId: `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          interests: [],
          clubs: [],
          availableTime: [],
          notificationPreferences: {
            emailAlerts: true,
            pushNotifications: true,
            eventReminders: true,
            waitlistUpdates: true,
            weeklyDigest: false,
          },
          bio: '',
        }

        currentUser.value = newProfile
        isAuthenticated.value = true
        registeredUsers.value[normalizedEmail] = newProfile
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers.value))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
        return { success: true }
      } else if (anonKey && !isStandardJwt) {
        return {
          success: false,
          message: 'Invalid VITE_SUPABASE_ANON_KEY format! Key in .env.local should be a JWT token starting with "eyJ...".',
        }
      }
    } catch (e: any) {
      console.warn('Supabase SignUp attempt warning:', e)
    } finally {
      isLoading.value = false
    }

    // Local Fallback User Save
    const newProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      name: details.name,
      email: details.email,
      role: details.role,
      avatar: '',
      major: details.major || '',
      grade: details.grade || '',
      studentId: `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      interests: [],
      clubs: [],
      availableTime: [],
      notificationPreferences: {
        emailAlerts: true,
        pushNotifications: true,
        eventReminders: true,
        waitlistUpdates: true,
        weeklyDigest: false,
      },
      bio: '',
    }

    registeredUsers.value[normalizedEmail] = newProfile
    currentUser.value = newProfile
    isAuthenticated.value = true
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers.value))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
    return { success: true }
  }

  function updateProfile(updatedData: Partial<UserProfile>) {
    if (!currentUser.value) return
    currentUser.value = {
      ...currentUser.value,
      ...updatedData,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))

    // Sync to Supabase if connected
    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      supabase.from('profiles').update({
        full_name: currentUser.value.name,
        bio: currentUser.value.bio,
        avatar_url: currentUser.value.avatar || null,
      }).eq('id', currentUser.value.id).then()
    }
  }

  function logout() {
    currentUser.value = null
    isAuthenticated.value = false
    localStorage.removeItem(STORAGE_KEY)
    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      supabase.auth.signOut().then()
    }
  }

  return {
    currentUser,
    isAuthenticated,
    isLoading,
    userRole,
    login,
    register,
    updateProfile,
    logout,
  }
})
