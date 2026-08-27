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
      events: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          event_date: string
          start_time: string
          end_time: string
          location: string | null
          online_link: string | null
          capacity: number
          image_url: string | null
          status: string
          organiser_id: string
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          category: string
          event_date: string
          start_time: string
          end_time: string
          location?: string | null
          online_link?: string | null
          capacity: number
          image_url?: string | null
          status?: string
          organiser_id: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string
          category?: string
          event_date?: string
          start_time?: string
          end_time?: string
          location?: string | null
          online_link?: string | null
          capacity?: number
          image_url?: string | null
          status?: string
          organiser_id?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          id: string
          event_id: string
          student_id: string
          status: string
          attendance_status: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          student_id: string
          status?: string
          attendance_status?: string
          created_at?: string
        }
        Update: {
          status?: string
          attendance_status?: string
        }
        Relationships: []
      }
      saved_events: {
        Row: {
          student_id: string
          event_id: string
          created_at: string
        }
        Insert: {
          student_id: string
          event_id: string
          created_at?: string
        }
        Update: Record<string, never>
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
