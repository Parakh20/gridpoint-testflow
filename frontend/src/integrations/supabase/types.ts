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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      addon_catalog: {
        Row: {
          addon_key: string
          created_at: string
          description: string | null
          is_active: boolean
          kind: string
          max_quantity: number
          name: string
          sort_order: number
          unit_price_inr: number
          updated_at: string
        }
        Insert: {
          addon_key: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          kind?: string
          max_quantity?: number
          name: string
          sort_order?: number
          unit_price_inr: number
          updated_at?: string
        }
        Update: {
          addon_key?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          kind?: string
          max_quantity?: number
          name?: string
          sort_order?: number
          unit_price_inr?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      audit_logs_archive: {
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
        Relationships: []
      }
      billing_audit_logs: {
        Row: {
          action: string
          actor: string
          company_id: string | null
          created_at: string
          id: string
          metadata: Json
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor: string
          company_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor?: string
          company_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          company_id: string | null
          event_type: string
          id: string
          processed_at: string
          provider: string
          provider_event_id: string
          raw_payload: Json | null
        }
        Insert: {
          company_id?: string | null
          event_type: string
          id?: string
          processed_at?: string
          provider?: string
          provider_event_id: string
          raw_payload?: Json | null
        }
        Update: {
          company_id?: string | null
          event_type?: string
          id?: string
          processed_at?: string
          provider?: string
          provider_event_id?: string
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_company_id_fkey"
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
          company_size: string | null
          country: string | null
          created_at: string
          features: Json
          id: string
          industry: string | null
          is_active: boolean
          name: string
          oauth_provisioning: string
          phone: string | null
          slug: string
          trial_ends_at: string | null
        }
        Insert: {
          allowed_domains?: string[]
          company_size?: string | null
          country?: string | null
          created_at?: string
          features?: Json
          id?: string
          industry?: string | null
          is_active?: boolean
          name: string
          oauth_provisioning?: string
          phone?: string | null
          slug: string
          trial_ends_at?: string | null
        }
        Update: {
          allowed_domains?: string[]
          company_size?: string | null
          country?: string | null
          created_at?: string
          features?: Json
          id?: string
          industry?: string | null
          is_active?: boolean
          name?: string
          oauth_provisioning?: string
          phone?: string | null
          slug?: string
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      company_domains: {
        Row: {
          company_id: string
          created_at: string
          domain: string
          id: string
          provisioned_at: string | null
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          domain: string
          id?: string
          provisioned_at?: string | null
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          domain?: string
          id?: string
          provisioned_at?: string | null
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      email_log: {
        Row: {
          actor: string
          body_html: string | null
          company_id: string | null
          error: string | null
          id: string
          resend_message_id: string | null
          sent_at: string
          status: string
          subject: string
          template: string
          to_email: string
          to_user_id: string | null
        }
        Insert: {
          actor?: string
          body_html?: string | null
          company_id?: string | null
          error?: string | null
          id?: string
          resend_message_id?: string | null
          sent_at?: string
          status: string
          subject: string
          template?: string
          to_email: string
          to_user_id?: string | null
        }
        Update: {
          actor?: string
          body_html?: string | null
          company_id?: string | null
          error?: string | null
          id?: string
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          template?: string
          to_email?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_contracts: {
        Row: {
          company_id: string
          contract_end: string | null
          contract_start: string
          created_at: string
          custom_annual_price_inr: number | null
          custom_features: Json
          custom_monthly_price_inr: number | null
          id: string
          max_active_projects: number | null
          max_storage_gb: number | null
          max_users: number | null
          sla_level: string | null
          support_level: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_end?: string | null
          contract_start?: string
          created_at?: string
          custom_annual_price_inr?: number | null
          custom_features?: Json
          custom_monthly_price_inr?: number | null
          id?: string
          max_active_projects?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          sla_level?: string | null
          support_level?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_end?: string | null
          contract_start?: string
          created_at?: string
          custom_annual_price_inr?: number | null
          custom_features?: Json
          custom_monthly_price_inr?: number | null
          id?: string
          max_active_projects?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          sla_level?: string | null
          support_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      inbound_emails: {
        Row: {
          attachments: Json
          company_id: string | null
          from_email: string
          from_name: string | null
          handled: boolean
          html_body: string | null
          id: string
          provider_event_id: string
          raw_payload: Json | null
          received_at: string
          subject: string | null
          text_body: string | null
          to_email: string | null
        }
        Insert: {
          attachments?: Json
          company_id?: string | null
          from_email: string
          from_name?: string | null
          handled?: boolean
          html_body?: string | null
          id?: string
          provider_event_id: string
          raw_payload?: Json | null
          received_at?: string
          subject?: string | null
          text_body?: string | null
          to_email?: string | null
        }
        Update: {
          attachments?: Json
          company_id?: string | null
          from_email?: string
          from_name?: string | null
          handled?: boolean
          html_body?: string | null
          id?: string
          provider_event_id?: string
          raw_payload?: Json | null
          received_at?: string
          subject?: string | null
          text_body?: string | null
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      lead_activities: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          lead_id: string
          occurred_at: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          lead_id: string
          occurred_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          lead_id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_contacts: {
        Row: {
          created_at: string
          email: string | null
          email_status: string
          full_name: string | null
          id: string
          is_primary: boolean
          lead_id: string
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          seniority: string
          source_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_status?: string
          full_name?: string | null
          id?: string
          is_primary?: boolean
          lead_id: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          seniority?: string
          source_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_status?: string
          full_name?: string | null
          id?: string
          is_primary?: boolean
          lead_id?: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          seniority?: string
          source_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          buyer_title: string | null
          company_id: string | null
          company_name: string
          confidence: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          last_contacted_at: string | null
          next_action_date: string | null
          notes: string | null
          outreach_approach: string | null
          priority: number | null
          region: string | null
          segment: string | null
          size_signal: string | null
          source_url: string | null
          stage: string
          tech_stack: string | null
          tech_stack_source: string | null
          updated_at: string
          why_fit: string | null
        }
        Insert: {
          buyer_title?: string | null
          company_id?: string | null
          company_name: string
          confidence?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          last_contacted_at?: string | null
          next_action_date?: string | null
          notes?: string | null
          outreach_approach?: string | null
          priority?: number | null
          region?: string | null
          segment?: string | null
          size_signal?: string | null
          source_url?: string | null
          stage?: string
          tech_stack?: string | null
          tech_stack_source?: string | null
          updated_at?: string
          why_fit?: string | null
        }
        Update: {
          buyer_title?: string | null
          company_id?: string | null
          company_name?: string
          confidence?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          last_contacted_at?: string | null
          next_action_date?: string | null
          notes?: string | null
          outreach_approach?: string | null
          priority?: number | null
          region?: string | null
          segment?: string | null
          size_signal?: string | null
          source_url?: string | null
          stage?: string
          tech_stack?: string | null
          tech_stack_source?: string | null
          updated_at?: string
          why_fit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
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
      orders: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          provider_payment_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          provider_payment_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          provider_payment_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          config: Json
          enabled: boolean
          feature_key: string
          id: string
          plan_id: string
        }
        Insert: {
          config?: Json
          enabled?: boolean
          feature_key: string
          id?: string
          plan_id: string
        }
        Update: {
          config?: Json
          enabled?: boolean
          feature_key?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_provider_mapping: {
        Row: {
          annual_price_inr_at_mapping: number | null
          monthly_price_inr_at_mapping: number | null
          plan_id: string
          provider_mode: string | null
          razorpay_plan_id_annual: string | null
          razorpay_plan_id_monthly: string | null
          updated_at: string
        }
        Insert: {
          annual_price_inr_at_mapping?: number | null
          monthly_price_inr_at_mapping?: number | null
          plan_id: string
          provider_mode?: string | null
          razorpay_plan_id_annual?: string | null
          razorpay_plan_id_monthly?: string | null
          updated_at?: string
        }
        Update: {
          annual_price_inr_at_mapping?: number | null
          monthly_price_inr_at_mapping?: number | null
          plan_id?: string
          provider_mode?: string | null
          razorpay_plan_id_annual?: string | null
          razorpay_plan_id_monthly?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_provider_mapping_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          annual_price_inr: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_custom: boolean
          is_public: boolean
          max_active_projects: number | null
          max_users: number | null
          monthly_price_inr: number | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          annual_price_inr?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          is_public?: boolean
          max_active_projects?: number | null
          max_users?: number | null
          monthly_price_inr?: number | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          annual_price_inr?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          is_public?: boolean
          max_active_projects?: number | null
          max_users?: number | null
          monthly_price_inr?: number | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
      rework_notifications: {
        Row: {
          company_id: string
          created_at: string
          engineer_id: string
          id: string
          sent_at: string | null
          test_task_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          engineer_id: string
          id?: string
          sent_at?: string | null
          test_task_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          engineer_id?: string
          id?: string
          sent_at?: string | null
          test_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rework_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rework_notifications_test_task_id_fkey"
            columns: ["test_task_id"]
            isOneToOne: false
            referencedRelation: "test_tasks"
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
      subscription_addons: {
        Row: {
          addon_key: string
          created_at: string
          id: string
          provider_payment_id: string | null
          quantity: number
          status: string
          subscription_id: string
          unit_price_inr: number | null
          updated_at: string
        }
        Insert: {
          addon_key: string
          created_at?: string
          id?: string
          provider_payment_id?: string | null
          quantity?: number
          status?: string
          subscription_id: string
          unit_price_inr?: number | null
          updated_at?: string
        }
        Update: {
          addon_key?: string
          created_at?: string
          id?: string
          provider_payment_id?: string | null
          quantity?: number
          status?: string
          subscription_id?: string
          unit_price_inr?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_addons_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at: string | null
          company_id: string
          created_at: string
          credit_balance_inr: number
          current_period_end: string | null
          current_period_start: string | null
          discount_pct: number | null
          id: string
          last_event_at: string | null
          pending_plan_id: string | null
          pending_plan_requested_at: string | null
          plan_id: string | null
          provider: string
          provider_customer_id: string | null
          provider_plan_id: string | null
          provider_subscription_id: string | null
          raw_provider_payload: Json | null
          seat_count: number
          status: string
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at?: string | null
          company_id: string
          created_at?: string
          credit_balance_inr?: number
          current_period_end?: string | null
          current_period_start?: string | null
          discount_pct?: number | null
          id?: string
          last_event_at?: string | null
          pending_plan_id?: string | null
          pending_plan_requested_at?: string | null
          plan_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_plan_id?: string | null
          provider_subscription_id?: string | null
          raw_provider_payload?: Json | null
          seat_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at?: string | null
          company_id?: string
          created_at?: string
          credit_balance_inr?: number
          current_period_end?: string | null
          current_period_start?: string | null
          discount_pct?: number | null
          id?: string
          last_event_at?: string | null
          pending_plan_id?: string | null
          pending_plan_requested_at?: string | null
          plan_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_plan_id?: string | null
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
          {
            foreignKeyName: "subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
      usage_records: {
        Row: {
          company_id: string
          id: string
          metadata: Json
          metric: string
          occurred_at: string
        }
        Insert: {
          company_id: string
          id?: string
          metadata?: Json
          metric: string
          occurred_at?: string
        }
        Update: {
          company_id?: string
          id?: string
          metadata?: Json
          metric?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      apply_plan_upgrade: {
        Args: {
          _company_id?: string
          _period_end?: string
          _period_start?: string
          _target_plan_id?: string
        }
        Returns: Json
      }
      approve_oauth_user: {
        Args: { _role?: string; _user_id: string }
        Returns: undefined
      }
      archive_old_audit_logs: { Args: never; Returns: Json }
      can_create_project: { Args: { _company_id?: string }; Returns: boolean }
      can_invite_user: { Args: { _company_id?: string }; Returns: boolean }
      check_can_create_project: { Args: never; Returns: Json }
      check_plan_downgrade_feasibility: {
        Args: { _company_id?: string; _target_plan_id?: string }
        Returns: Json
      }
      check_plan_upgrade_eligibility: {
        Args: { _company_id?: string; _target_plan_id?: string }
        Returns: Json
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
      company_for_domain: { Args: { _domain: string }; Returns: Json }
      erase_user_data: { Args: { _user_id: string }; Returns: Json }
      find_cheapest_plan_for: {
        Args: { _required_count: number; _resource: string }
        Returns: string
      }
      flip_expired_cancellations: { Args: never; Returns: number }
      generate_project_equipment: {
        Args: { _project_id: string }
        Returns: Json
      }
      get_company_entitlements: {
        Args: { _company_id?: string }
        Returns: Json
      }
      get_company_usage: { Args: { _company_id?: string }; Returns: Json }
      get_pending_rework_notifications: {
        Args: { _limit?: number }
        Returns: {
          engineer_email: string
          engineer_name: string
          equipment_label: string
          notification_id: string
          project_name: string
          test_task_id: string
        }[]
      }
      get_resource_limit_status: {
        Args: { _company_id?: string; _resource: string }
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
      is_past_due_grace_expired: {
        Args: { _company_id: string }
        Returns: boolean
      }
      mark_custom_domain_provisioned: {
        Args: { _domain: string }
        Returns: Json
      }
      mark_custom_domain_verified: { Args: { _domain: string }; Returns: Json }
      mark_rework_notification_sent: {
        Args: { _notification_id: string }
        Returns: undefined
      }
      my_company_id: { Args: never; Returns: string }
      offboard_user: {
        Args: { _from_user: string; _to_user: string }
        Returns: Json
      }
      pending_custom_domains: {
        Args: never
        Returns: {
          domain: string
          verification_token: string
          verified_at: string
        }[]
      }
      purge_old_soft_deleted: { Args: never; Returns: Json }
      rate_limit_check: {
        Args: { _key: string; _limit: number; _window_minutes: number }
        Returns: boolean
      }
      rate_limit_gc: { Args: never; Returns: undefined }
      record_addon_purchase: {
        Args: {
          _addon_key: string
          _amount_paid_inr: number
          _company_id: string
          _provider_payment_id: string
          _quantity: number
        }
        Returns: Json
      }
      record_billing_event: {
        Args: {
          _company_id: string
          _event_type: string
          _provider: string
          _provider_event_id: string
          _raw: Json
        }
        Returns: boolean
      }
      record_inbound_email: {
        Args: {
          _attachments: Json
          _from_email: string
          _from_name: string
          _html_body: string
          _provider_event_id: string
          _raw: Json
          _subject: string
          _text_body: string
          _to_email: string
        }
        Returns: boolean
      }
      reject_oauth_user: { Args: { _user_id: string }; Returns: undefined }
      release_ai_report_lock: {
        Args: { _project_id: string; _success: boolean }
        Returns: undefined
      }
      remove_custom_domain: { Args: never; Returns: Json }
      request_custom_domain: { Args: { _domain: string }; Returns: Json }
      request_data_export: { Args: { _user_id: string }; Returns: Json }
      request_plan_downgrade: {
        Args: { _company_id?: string; _target_plan_id?: string }
        Returns: Json
      }
      request_subscription_cancellation: {
        Args: { _company_id?: string }
        Returns: Json
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
      update_company_slug: { Args: { _new_slug: string }; Returns: Json }
      upsert_order: {
        Args: {
          _amount: number
          _company_id: string
          _currency: string
          _description: string
          _provider_payment_id: string
          _status: string
          _type: string
        }
        Returns: string
      }
      upsert_subscription:
        | {
            Args: {
              _company_id: string
              _period_end: string
              _period_start: string
              _provider_cust_id: string
              _provider_plan_id: string
              _provider_sub_id: string
              _raw: Json
              _seat_count: number
              _status: string
            }
            Returns: string
          }
        | {
            Args: {
              _company_id: string
              _event_created_at?: string
              _period_end: string
              _period_start: string
              _provider_cust_id: string
              _provider_plan_id: string
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
