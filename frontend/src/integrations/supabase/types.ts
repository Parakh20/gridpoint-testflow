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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          company_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          allowed_domains: string[]
          created_at: string
          features: Json
          id: string
          is_active: boolean
          name: string
          oauth_provisioning: string
          slug: string
          trial_ends_at: string | null
        }
        Insert: {
          allowed_domains?: string[]
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          oauth_provisioning?: string
          slug: string
          trial_ends_at?: string | null
        }
        Update: {
          allowed_domains?: string[]
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          oauth_provisioning?: string
          slug?: string
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          source: string | null
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          source?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      equipment_instances: {
        Row: {
          assigned_to: string | null
          created_at: string
          deleted_at: string | null
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id: string
          label: string
          nameplate: Json
          project_id: string
          scope_item_id: string
          seq_number: number
          status: Database["public"]["Enums"]["instance_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id?: string
          label: string
          nameplate?: Json
          project_id: string
          scope_item_id: string
          seq_number: number
          status?: Database["public"]["Enums"]["instance_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          equipment_type?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          label?: string
          nameplate?: Json
          project_id?: string
          scope_item_id?: string
          seq_number?: number
          status?: Database["public"]["Enums"]["instance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_instances_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          calibration_due_at: string | null
          company_id: string | null
          created_at: string
          id: string
          last_calibrated_at: string | null
          make: string | null
          model: string | null
          owned_by: string | null
          serial_number: string
          type: string
        }
        Insert: {
          calibration_due_at?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          last_calibrated_at?: string | null
          make?: string | null
          model?: string | null
          owned_by?: string | null
          serial_number: string
          type: string
        }
        Update: {
          calibration_due_at?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          last_calibrated_at?: string | null
          make?: string | null
          model?: string | null
          owned_by?: string | null
          serial_number?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "instruments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nameplate_records: {
        Row: {
          created_at: string
          created_by: string
          equipment_instance_id: string
          id: string
          instrument_id: string | null
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          equipment_instance_id: string
          id?: string
          instrument_id?: string | null
          payload: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          equipment_instance_id?: string
          id?: string
          instrument_id?: string | null
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nameplate_records_equipment_instance_id_fkey"
            columns: ["equipment_instance_id"]
            isOneToOne: true
            referencedRelation: "equipment_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          oauth_pending: boolean
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name: string
          oauth_pending?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          oauth_pending?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_test_scope: {
        Row: {
          created_at: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id: string
          is_enabled: boolean
          project_id: string
          test_template_id: string
        }
        Insert: {
          created_at?: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id?: string
          is_enabled?: boolean
          project_id: string
          test_template_id: string
        }
        Update: {
          created_at?: string
          equipment_type?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          is_enabled?: boolean
          project_id?: string
          test_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_test_scope_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_test_scope_test_template_id_fkey"
            columns: ["test_template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_report_generated_at: string | null
          ai_report_generating_at: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          client: string | null
          company_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          end_date: string | null
          id: string
          project_number: string
          site_address: string
          site_name: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          ai_report_generated_at?: string | null
          ai_report_generating_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          client?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          project_number: string
          site_address: string
          site_name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          ai_report_generated_at?: string | null
          ai_report_generating_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          client?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          project_number?: string
          site_address?: string
          site_name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket_key: string
          count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      scope_items: {
        Row: {
          created_at: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id: string
          project_id: string
          quantity: number
          version: number
        }
        Insert: {
          created_at?: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id?: string
          project_id: string
          quantity: number
          version?: number
        }
        Update: {
          created_at?: string
          equipment_type?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          project_id?: string
          quantity?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          raw_provider_payload: Json | null
          seat_count: number
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          raw_provider_payload?: Json | null
          seat_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          raw_provider_payload?: Json | null
          seat_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_assignments: {
        Row: {
          created_at: string
          created_by: string
          gm_id: string
          id: string
          supervisor_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          gm_id: string
          id?: string
          supervisor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          gm_id?: string
          id?: string
          supervisor_id?: string
        }
        Relationships: []
      }
      test_records: {
        Row: {
          ambient: Json | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          instrument_id: string | null
          pass_fail: string | null
          payload: Json
          remarks: string | null
          test_task_id: string
          updated_at: string
        }
        Insert: {
          ambient?: Json | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          instrument_id?: string | null
          pass_fail?: string | null
          payload: Json
          remarks?: string | null
          test_task_id: string
          updated_at?: string
        }
        Update: {
          ambient?: Json | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          instrument_id?: string | null
          pass_fail?: string | null
          payload?: Json
          remarks?: string | null
          test_task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_records_test_task_id_fkey"
            columns: ["test_task_id"]
            isOneToOne: true
            referencedRelation: "test_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      test_tasks: {
        Row: {
          approved_at: string | null
          assigned_to: string | null
          created_at: string
          equipment_instance_id: string
          id: string
          rework_reason: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["test_status"]
          submitted_at: string | null
          test_template_id: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          assigned_to?: string | null
          created_at?: string
          equipment_instance_id: string
          id?: string
          rework_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["test_status"]
          submitted_at?: string | null
          test_template_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          assigned_to?: string | null
          created_at?: string
          equipment_instance_id?: string
          id?: string
          rework_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["test_status"]
          submitted_at?: string | null
          test_template_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_tasks_equipment_instance_id_fkey"
            columns: ["equipment_instance_id"]
            isOneToOne: false
            referencedRelation: "equipment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_tasks_test_template_id_fkey"
            columns: ["test_template_id"]
            isOneToOne: false
            referencedRelation: "test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_templates: {
        Row: {
          created_at: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          fields: Json
          id: string
          is_active: boolean
          tab: string
          test_code: string
          test_name: string
        }
        Insert: {
          created_at?: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          fields: Json
          id?: string
          is_active?: boolean
          tab: string
          test_code: string
          test_name: string
        }
        Update: {
          created_at?: string
          equipment_type?: Database["public"]["Enums"]["equipment_type"]
          fields?: Json
          id?: string
          is_active?: boolean
          tab?: string
          test_code?: string
          test_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_oauth_user: {
        Args: { _role?: string; _user_id: string }
        Returns: undefined
      }
      claim_ai_report_lock: { Args: { _project_id: string }; Returns: boolean }
      clone_project: {
        Args: {
          _new_project_number: string
          _new_site_address: string
          _new_site_name: string
          _source_project_id: string
        }
        Returns: string
      }
      generate_project_equipment: {
        Args: { _project_id: string }
        Returns: Json
      }
      has_feature: { Args: { _flag: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_company_id: { Args: never; Returns: string }
      offboard_user: {
        Args: { _from_user: string; _to_user: string }
        Returns: Json
      }
      rate_limit_check: {
        Args: { _key: string; _limit: number; _window_minutes: number }
        Returns: boolean
      }
      rate_limit_gc: { Args: never; Returns: undefined }
      reject_oauth_user: { Args: { _user_id: string }; Returns: undefined }
      release_ai_report_lock: {
        Args: { _project_id: string; _success: boolean }
        Returns: undefined
      }
      restore_project: { Args: { _project_id: string }; Returns: Json }
      set_company_active: {
        Args: { p_company_id: string; p_is_active: boolean }
        Returns: undefined
      }
      set_company_oauth_config: {
        Args: {
          _allowed_domains: string[]
          _company_id: string
          _oauth_provisioning: string
        }
        Returns: undefined
      }
      upsert_subscription: {
        Args: {
          _company_id: string
          _period_end: string
          _period_start: string
          _plan_id: string
          _provider_cust_id: string
          _provider_sub_id: string
          _raw: Json
          _seat_count: number
          _status: string
        }
        Returns: string
      }
      user_workload_summary: { Args: { _user_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "SUPERADMIN" | "GM" | "SUPERVISOR" | "ENGINEER"
      equipment_type:
        | "POWER_TRANSFORMER"
        | "CT"
        | "CVT"
        | "LA"
        | "SF6_BREAKER"
        | "ISOLATOR"
        | "VCB"
        | "EARTH_PIT"
        | "VT"
      instance_status:
        | "UNASSIGNED"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "SUBMITTED"
        | "APPROVED"
        | "REWORK"
        | "CANCELLED"
        | "DEFERRED"
      project_status: "DRAFT" | "APPROVED" | "ACTIVE" | "CLOSED"
      test_status: "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "REWORK"
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
      app_role: ["SUPERADMIN", "GM", "SUPERVISOR", "ENGINEER"],
      equipment_type: [
        "POWER_TRANSFORMER",
        "CT",
        "CVT",
        "LA",
        "SF6_BREAKER",
        "ISOLATOR",
        "VCB",
        "EARTH_PIT",
        "VT",
      ],
      instance_status: [
        "UNASSIGNED",
        "ASSIGNED",
        "IN_PROGRESS",
        "SUBMITTED",
        "APPROVED",
        "REWORK",
        "CANCELLED",
        "DEFERRED",
      ],
      project_status: ["DRAFT", "APPROVED", "ACTIVE", "CLOSED"],
      test_status: ["DRAFT", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REWORK"],
    },
  },
} as const
