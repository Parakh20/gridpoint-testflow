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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
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
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      equipment_instances: {
        Row: {
          assigned_to: string | null
          created_at: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id: string
          label: string
          project_id: string
          scope_item_id: string
          seq_number: number
          status: Database["public"]["Enums"]["instance_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id?: string
          label: string
          project_id: string
          scope_item_id: string
          seq_number: number
          status?: Database["public"]["Enums"]["instance_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          equipment_type?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          label?: string
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
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client: string | null
          created_at: string
          created_by: string
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
          approved_at?: string | null
          approved_by?: string | null
          client?: string | null
          created_at?: string
          created_by: string
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
          approved_at?: string | null
          approved_by?: string | null
          client?: string | null
          created_at?: string
          created_by?: string
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
        ]
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
      test_records: {
        Row: {
          ambient: Json | null
          created_at: string
          created_by: string
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
            isOneToOne: false
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
