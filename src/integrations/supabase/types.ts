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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          reason: string | null
          target: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          kind: string
          name: string | null
          url: string
          width: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          kind?: string
          name?: string | null
          url: string
          width?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          kind?: string
          name?: string | null
          url?: string
          width?: number | null
          workspace_id?: string
        }
        Relationships: []
      }
      brand_kit: {
        Row: {
          body_font: string | null
          colors: string[]
          created_at: string
          custom_fonts: Json
          default_logo_positions: Json
          end_card: Json
          headline_font: string | null
          id: string
          logo_size_pct: number
          logos: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body_font?: string | null
          colors?: string[]
          created_at?: string
          custom_fonts?: Json
          default_logo_positions?: Json
          end_card?: Json
          headline_font?: string | null
          id?: string
          logo_size_pct?: number
          logos?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body_font?: string | null
          colors?: string[]
          created_at?: string
          custom_fonts?: Json
          default_logo_positions?: Json
          end_card?: Json
          headline_font?: string | null
          id?: string
          logo_size_pct?: number
          logos?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      brand_kits: {
        Row: {
          colors: string[]
          created_at: string
          created_by: string | null
          headline_font: string | null
          id: string
          is_default: boolean
          logo_dark_url: string | null
          logo_url: string | null
          name: string
          subline_font: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          colors?: string[]
          created_at?: string
          created_by?: string | null
          headline_font?: string | null
          id?: string
          is_default?: boolean
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          subline_font?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          colors?: string[]
          created_at?: string
          created_by?: string | null
          headline_font?: string | null
          id?: string
          is_default?: boolean
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          subline_font?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      export_usage: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          stamp: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          stamp: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          stamp?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          channels: string[]
          created_at: string
          error: string | null
          formats: string[]
          id: string
          project_id: string | null
          stamp: string
          status: string
          total_bytes: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          error?: string | null
          formats?: string[]
          id?: string
          project_id?: string | null
          stamp: string
          status?: string
          total_bytes?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          error?: string | null
          formats?: string[]
          id?: string
          project_id?: string | null
          stamp?: string
          status?: string
          total_bytes?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      frames: {
        Row: {
          created_at: string
          duration_sec: number
          headline: Json | null
          id: string
          logo_visible: boolean
          photo: Json
          project_id: string
          sort_order: number
          subline: Json | null
          transition_in: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number
          headline?: Json | null
          id?: string
          logo_visible?: boolean
          photo?: Json
          project_id: string
          sort_order?: number
          subline?: Json | null
          transition_in?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_sec?: number
          headline?: Json | null
          id?: string
          logo_visible?: boolean
          photo?: Json
          project_id?: string
          sort_order?: number
          subline?: Json | null
          transition_in?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "frames_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          amount_cents: number
          id: string
          interval: string
          monthly_exports: number | null
          name: string
          price_id: string
          seats: number
          sort_order: number
        }
        Insert: {
          amount_cents: number
          id: string
          interval: string
          monthly_exports?: number | null
          name: string
          price_id: string
          seats?: number
          sort_order?: number
        }
        Update: {
          amount_cents?: number
          id?: string
          interval?: string
          monthly_exports?: number | null
          name?: string
          price_id?: string
          seats?: number
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          brand_kit_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_card: Json
          formats: string[]
          id: string
          is_template: boolean
          logo: Json
          name: string
          pace: string
          primary_format: string
          template_id: string | null
          thumbnail_url: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_kit_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_card?: Json
          formats?: string[]
          id?: string
          is_template?: boolean
          logo?: Json
          name?: string
          pace?: string
          primary_format?: string
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_kit_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_card?: Json
          formats?: string[]
          id?: string
          is_template?: boolean
          logo?: Json
          name?: string
          pace?: string
          primary_format?: string
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          reason: string
          workspace_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          reason: string
          workspace_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          reason?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ad_id: string | null
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          topic: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ad_id?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          topic: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          ad_id?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          topic?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          audience: string[]
          created_at: string
          created_by: string | null
          description: string | null
          draft: Json | null
          featured: boolean
          format: string | null
          id: string
          is_reusable: boolean
          name: string
          new_until: string | null
          published_at: string | null
          settings: Json
          slides: Json
          slug: string | null
          sort_order: number
          source: string
          status: string
          style: Json
          thumbnail_url: string | null
          updated_at: string
          version: number
          visibility: string
          workspace_id: string | null
        }
        Insert: {
          audience?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          draft?: Json | null
          featured?: boolean
          format?: string | null
          id?: string
          is_reusable?: boolean
          name?: string
          new_until?: string | null
          published_at?: string | null
          settings?: Json
          slides?: Json
          slug?: string | null
          sort_order?: number
          source?: string
          status?: string
          style?: Json
          thumbnail_url?: string | null
          updated_at?: string
          version?: number
          visibility?: string
          workspace_id?: string | null
        }
        Update: {
          audience?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          draft?: Json | null
          featured?: boolean
          format?: string | null
          id?: string
          is_reusable?: boolean
          name?: string
          new_until?: string | null
          published_at?: string | null
          settings?: Json
          slides?: Json
          slug?: string | null
          sort_order?: number
          source?: string
          status?: string
          style?: Json
          thumbnail_url?: string | null
          updated_at?: string
          version?: number
          visibility?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_billing: {
        Row: {
          cancel_at_period_end: boolean
          comp_plan: string | null
          comp_until: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          extra_exports: number
          last_topup_session: string | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          comp_plan?: string | null
          comp_until?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          extra_exports?: number
          last_topup_session?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          comp_plan?: string | null
          comp_until?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          extra_exports?: number
          last_topup_session?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_billing_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          suspended_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          suspended_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          suspended_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _token: string }; Returns: string }
      accept_my_invites: { Args: never; Returns: string }
      admin_storage_by_workspace: {
        Args: never
        Returns: {
          bytes: number
          workspace_id: string
        }[]
      }
      billing_covered: { Args: { _src: string }; Returns: string[] }
      billing_source: { Args: { _ws: string }; Returns: string }
      brand_kits_enabled: { Args: { _ws: string }; Returns: boolean }
      can_save_export: {
        Args: { _stamp: string; _ws: string }
        Returns: boolean
      }
      delete_workspace: { Args: { _ws: string }; Returns: undefined }
      effective_billing: { Args: { _ws: string }; Returns: Json }
      ensure_workspace: { Args: never; Returns: string }
      export_status: { Args: { _ws: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_support_session: { Args: { _ws: string }; Returns: boolean }
      in_other_team: { Args: { _uid: string; _ws: string }; Returns: string }
      is_platform_admin: { Args: never; Returns: boolean }
      is_workspace_admin: { Args: { _ws: string }; Returns: boolean }
      is_workspace_member: { Args: { _ws: string }; Returns: boolean }
      kit_shared: { Args: { _ws: string }; Returns: boolean }
      kit_workspaces: { Args: { _ws: string }; Returns: string[] }
      record_export: {
        Args: { _project: string; _stamp: string; _ws: string }
        Returns: boolean
      }
      set_default_brand_kit: {
        Args: { _kit: string; _ws: string }
        Returns: undefined
      }
      workspace_is_team: { Args: { _ws: string }; Returns: boolean }
      workspace_member_list: {
        Args: { _ws: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          role: string
          user_id: string
        }[]
      }
      workspace_seats: { Args: { _ws: string }; Returns: number }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
    },
  },
} as const
