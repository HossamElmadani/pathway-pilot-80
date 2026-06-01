export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["application_status"]
          university_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          university_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          university_id?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          feedback: string | null
          file_name: string
          file_url: string
          id: string
          is_mandatory: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["doc_status"]
          step: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          file_name: string
          file_url: string
          id?: string
          is_mandatory?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          step?: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          file_name?: string
          file_url?: string
          id?: string
          is_mandatory?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          step?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academic_info: Json
          assigned_worker_id: string | null
          avatar_url: string | null
          created_at: string
          current_step: number
          email: string
          id: string
          must_change_password: boolean
          name: string
          personal_info: Json
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          academic_info?: Json
          assigned_worker_id?: string | null
          avatar_url?: string | null
          created_at?: string
          current_step?: number
          email?: string
          id: string
          must_change_password?: boolean
          name?: string
          personal_info?: Json
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          academic_info?: Json
          assigned_worker_id?: string | null
          avatar_url?: string | null
          created_at?: string
          current_step?: number
          email?: string
          id?: string
          must_change_password?: boolean
          name?: string
          personal_info?: Json
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      step_progress: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          data: Json
          id: string
          status: Database["public"]["Enums"]["step_status"]
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          data?: Json
          id?: string
          status?: Database["public"]["Enums"]["step_status"]
          step: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          data?: Json
          id?: string
          status?: Database["public"]["Enums"]["step_status"]
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suggested_universities: {
        Row: {
          created_at: string
          id: string
          note: string | null
          student_id: string
          suggested_by: string | null
          university_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          student_id: string
          suggested_by?: string | null
          university_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          student_id?: string
          suggested_by?: string | null
          university_id?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          badges: string[]
          country: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          location: string
          name: string
          price: number | null
          ranking: number | null
        }
        Insert: {
          badges?: string[]
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string
          name: string
          price?: number | null
          ranking?: number | null
        }
        Update: {
          badges?: string[]
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string
          name?: string
          price?: number | null
          ranking?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_student: { Args: { _student_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_director: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "director" | "worker" | "student"
      application_status:
        | "pending"
        | "submitted"
        | "accepted"
        | "rejected"
        | "waitlisted"
      doc_status: "pending" | "approved" | "rejected"
      step_status:
        | "locked"
        | "in_progress"
        | "pending_review"
        | "approved"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["director", "worker", "student"],
      application_status: [
        "pending",
        "submitted",
        "accepted",
        "rejected",
        "waitlisted",
      ],
      doc_status: ["pending", "approved", "rejected"],
      step_status: [
        "locked",
        "in_progress",
        "pending_review",
        "approved",
        "rejected",
      ],
    },
  },
} as const
