export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: 'student' | 'organiser' | 'admin'
          avatar_url: string | null
          student_id: string | null
          major: string
          grade: string
          bio: string
          interests: string[]
          clubs: string[]
          available_time: string[]
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: 'student' | 'organiser' | 'admin'
          avatar_url?: string | null
          student_id?: string | null
          major?: string
          grade?: string
          bio?: string
          interests?: string[]
          clubs?: string[]
          available_time?: string[]
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          student_id?: string | null
          major?: string
          grade?: string
          bio?: string
          interests?: string[]
          clubs?: string[]
          available_time?: string[]
          notification_preferences?: Json
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
