export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
  role: 'student' | 'organiser' | 'admin'
  avatar_url: string | null
  student_id: string | null
  major: string | null
  grade: string | null
  bio: string | null
  interests: string[]
  clubs: string[]
  available_time: string[]
  notification_preferences: Json
  created_at: string
  updated_at: string
}

export interface ProfileUpdate {
  full_name?: string | null
  avatar_url?: string | null
  major?: string | null
  grade?: string | null
  bio?: string | null
  interests?: string[]
  clubs?: string[]
  available_time?: string[]
  notification_preferences?: Json
}
