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

  const savedUser = localStorage.getItem(STORAGE_KEY)
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
   * Real Supabase & Strict Offline Login Interceptor
   */
  async function login(email: string, password?: string, fallbackRole: UserRole = 'STUDENT'): Promise<{ success: boolean; message?: string }> {
    isLoading.value = true
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

    // Validate if Key is proper JWT format
    const isStandardJwt = anonKey && anonKey.startsWith('eyJ')

    try {
      if (import.meta.env.VITE_SUPABASE_URL && isStandardJwt) {
        // Race condition timeout guard (3.5 seconds)
        const authPromise = supabase.auth.signInWithPassword({
          email,
          password: password || '',
        })
        const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Network request timed out. Please check your Supabase API credentials.' } }), 4000)
        )

        const { data: authData, error: authError } = await Promise.race([authPromise, timeoutPromise])

        if (authError || !authData?.user) {
          return {
            success: false,
            message: authError?.message || 'Account not found or password incorrect. Please register first.',
          }
        }

        // Fetch User Role & Profile from 'profiles' Table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        const dbRole: UserRole = profile?.role ? (profile.role.toUpperCase() as UserRole) : fallbackRole

        currentUser.value = {
          id: authData.user.id,
          name: profile?.name || (authData.user.email ? authData.user.email.split('@')[0] : '') || 'Campus User',
          email: authData.user.email || email,
          role: dbRole,
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
        return { success: true }
      } else if (anonKey && !isStandardJwt) {
        return {
          success: false,
          message: 'Invalid VITE_SUPABASE_ANON_KEY format! Key should be a JWT token starting with "eyJ...". Please check your .env.local file.',
        }
      }
    } catch (e: any) {
      console.warn('Supabase Auth attempt failed:', e)
    } finally {
      isLoading.value = false
    }

    // Strict Offline Local Validation (Check if user registered before)
    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = registeredUsers.value[normalizedEmail]

    if (!existingUser) {
      return {
        success: false,
        message: `No account found for "${email}"! Please register an account first.`,
      }
    }

    currentUser.value = existingUser
    isAuthenticated.value = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
    return { success: true }
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
              role: details.role.toLowerCase(),
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

        const newProfile: UserProfile = {
          id: authData.user.id,
          name: details.name,
          email: details.email,
          role: details.role,
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
        name: currentUser.value.name,
        bio: currentUser.value.bio,
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
