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
      client_invites: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      email_settings_requests: {
        Row: {
          client_id: string
          created_at: string
          domain: string
          id: string
          mailbox_address: string
          request_type: string
          requesting_email: string
          requesting_name: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          domain: string
          id?: string
          mailbox_address: string
          request_type?: string
          requesting_email: string
          requesting_name?: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          domain?: string
          id?: string
          mailbox_address?: string
          request_type?: string
          requesting_email?: string
          requesting_name?: string
          status?: string
        }
        Relationships: []
      }
      staff_authorizations: {
        Row: {
          access_cpanel: boolean
          access_email: boolean
          access_website: boolean
          client_id: string
          created_at: string
          id: string
          owner_email: string
          owner_name: string
          staff_email: string
          staff_full_name: string
          staff_phone: string | null
          staff_role: string | null
          status: string
        }
        Insert: {
          access_cpanel?: boolean
          access_email?: boolean
          access_website?: boolean
          client_id: string
          created_at?: string
          id?: string
          owner_email: string
          owner_name: string
          staff_email: string
          staff_full_name: string
          staff_phone?: string | null
          staff_role?: string | null
          status?: string
        }
        Update: {
          access_cpanel?: boolean
          access_email?: boolean
          access_website?: boolean
          client_id?: string
          created_at?: string
          id?: string
          owner_email?: string
          owner_name?: string
          staff_email?: string
          staff_full_name?: string
          staff_phone?: string | null
          staff_role?: string | null
          status?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          client_id: string | null
          client_name: string | null
          created_at: string
          description: string | null
          id: string
          resolution_notes: string | null
          source: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolution_notes?: string | null
          source?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolution_notes?: string | null
          source?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      upgrade_requests: {
        Row: {
          business_description: string
          client_id: string
          created_at: string
          current_platform: string
          current_website_url: string | null
          goals: string | null
          id: string
          status: string
          submitter_email: string
          submitter_name: string
          upgrade_type: string
        }
        Insert: {
          business_description: string
          client_id: string
          created_at?: string
          current_platform?: string
          current_website_url?: string | null
          goals?: string | null
          id?: string
          status?: string
          submitter_email: string
          submitter_name: string
          upgrade_type?: string
        }
        Update: {
          business_description?: string
          client_id?: string
          created_at?: string
          current_platform?: string
          current_website_url?: string | null
          goals?: string | null
          id?: string
          status?: string
          submitter_email?: string
          submitter_name?: string
          upgrade_type?: string
        }
        Relationships: []
      }
      whm_quota_checks: {
        Row: {
          alert_type: string | null
          checked_at: string
          domain: string
          id: string
          is_over_80: boolean
          is_suspended: boolean
          usage_percent: number
        }
        Insert: {
          alert_type?: string | null
          checked_at?: string
          domain: string
          id?: string
          is_over_80?: boolean
          is_suspended?: boolean
          usage_percent?: number
        }
        Update: {
          alert_type?: string | null
          checked_at?: string
          domain?: string
          id?: string
          is_over_80?: boolean
          is_suspended?: boolean
          usage_percent?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
