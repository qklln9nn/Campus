import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

const DEFAULT_STUDENT_PROFILE: UserProfile = {
  id: 'usr-student-001',
  name: 'Alex Johnson',
  email: 'alex.johnson@campus.edu',
  role: 'STUDENT',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  studentId: 'STU-2026-8942',
  major: 'Computer Science & Software Engineering',
  grade: 'Senior (Year 4)',
  interests: ['AI & Machine Learning', 'Hackathons', 'Robotics & Hardware', 'Inter-Faculty Sports'],
  clubs: ['Google Developer Student Club', 'ACM Student Chapter', 'Campus Robotics League'],
  availableTime: ['Weekday Evenings (After 5 PM)', 'Saturday All Day'],
  notificationPreferences: {
    emailAlerts: true,
    pushNotifications: true,
    eventReminders: true,
    waitlistUpdates: true,
    weeklyDigest: false,
  },
  bio: 'Passionate about full-stack web applications, AI research, and campus event organizing.',
}

export const useAuthStore = defineStore('auth', () => {
  const STORAGE_KEY = 'campus_eventhub_user'

  const savedUser = localStorage.getItem(STORAGE_KEY)
  const currentUser = ref<UserProfile | null>(
    savedUser ? JSON.parse(savedUser) : DEFAULT_STUDENT_PROFILE
  )

  const isAuthenticated = ref<boolean>(!!currentUser.value)

  const userRole = computed<UserRole>(() => currentUser.value?.role || 'STUDENT')

  function login(email: string, _password: string, role: UserRole = 'STUDENT') {
    let name = 'Alex Johnson'
    let studentId = 'STU-2026-8942'
    if (role === 'ORGANISER') {
      name = 'Dr. Sarah Jenkins'
      studentId = 'ORG-8821'
    } else if (role === 'ADMIN') {
      name = 'Admin Officer'
      studentId = 'ADM-0001'
    }

    currentUser.value = {
      ...DEFAULT_STUDENT_PROFILE,
      id: `usr-${role.toLowerCase()}-${Date.now()}`,
      name: name,
      email: email || `${role.toLowerCase()}@campus.edu`,
      role: role,
      studentId: studentId,
    }
    isAuthenticated.value = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
  }

  function register(details: {
    name: string
    email: string
    password?: string
    role: UserRole
    major?: string
    grade?: string
  }) {
    currentUser.value = {
      ...DEFAULT_STUDENT_PROFILE,
      id: `usr-${Date.now()}`,
      name: details.name,
      email: details.email,
      role: details.role,
      major: details.major || 'Computer Science & Software Engineering',
      grade: details.grade || 'Freshman (Year 1)',
      studentId: `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    }
    isAuthenticated.value = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
  }

  function updateProfile(updatedData: Partial<UserProfile>) {
    if (!currentUser.value) return
    currentUser.value = {
      ...currentUser.value,
      ...updatedData,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
  }

  function logout() {
    currentUser.value = null
    isAuthenticated.value = false
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    currentUser,
    isAuthenticated,
    userRole,
    login,
    register,
    updateProfile,
    logout,
  }
})
