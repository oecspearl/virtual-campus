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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accessibility_preferences: {
        Row: {
          caption_background: string | null
          caption_font_size: string | null
          caption_language: string | null
          captions_enabled: boolean | null
          created_at: string | null
          focus_indicators_enhanced: boolean | null
          high_contrast: boolean | null
          id: string
          keyboard_shortcuts_enabled: boolean | null
          large_text: boolean | null
          reduce_motion: boolean | null
          screen_reader_optimized: boolean | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          caption_background?: string | null
          caption_font_size?: string | null
          caption_language?: string | null
          captions_enabled?: boolean | null
          created_at?: string | null
          focus_indicators_enhanced?: boolean | null
          high_contrast?: boolean | null
          id?: string
          keyboard_shortcuts_enabled?: boolean | null
          large_text?: boolean | null
          reduce_motion?: boolean | null
          screen_reader_optimized?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          caption_background?: string | null
          caption_font_size?: string | null
          caption_language?: string | null
          captions_enabled?: boolean | null
          created_at?: string | null
          focus_indicators_enhanced?: boolean | null
          high_contrast?: boolean | null
          id?: string
          keyboard_shortcuts_enabled?: boolean | null
          large_text?: boolean | null
          reduce_motion?: boolean | null
          screen_reader_optimized?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      accessibility_reports: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          content_id: string
          content_type: string
          id: string
          issues: Json
          score: number | null
          tenant_id: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          content_id: string
          content_type: string
          id?: string
          issues?: Json
          score?: number | null
          tenant_id?: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          content_id?: string
          content_type?: string
          id?: string
          issues?: Json
          score?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_reports_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_module_types: {
        Row: {
          capabilities: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          schema_version: number
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id: string
          name: string
          schema_version?: number
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          schema_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      adaptive_rules: {
        Row: {
          action_data: Json | null
          action_target: string | null
          action_type: string
          condition_type: string
          condition_value: Json
          course_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string | null
          priority: number | null
          quiz_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          action_data?: Json | null
          action_target?: string | null
          action_type: string
          condition_type: string
          condition_value: Json
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          priority?: number | null
          quiz_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          action_data?: Json | null
          action_target?: string | null
          action_type?: string
          condition_type?: string
          condition_value?: Json
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          priority?: number | null
          quiz_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptive_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptive_rules_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptive_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_applications: {
        Row: {
          access_token: string
          answers: Json | null
          applicant_email: string
          applicant_name: string
          applicant_phone: string | null
          change_request_message: string | null
          created_at: string | null
          enrollment_id: string | null
          form_id: string
          id: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string
          answers?: Json | null
          applicant_email: string
          applicant_name: string
          applicant_phone?: string | null
          change_request_message?: string | null
          created_at?: string | null
          enrollment_id?: string | null
          form_id: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          answers?: Json | null
          applicant_email?: string
          applicant_name?: string
          applicant_phone?: string | null
          change_request_message?: string | null
          created_at?: string | null
          enrollment_id?: string | null
          form_id?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_applications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "admission_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_documents: {
        Row: {
          application_id: string
          field_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          storage_path: string
          tenant_id: string
          uploaded_at: string | null
        }
        Insert: {
          application_id: string
          field_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          storage_path: string
          tenant_id?: string
          uploaded_at?: string | null
        }
        Update: {
          application_id?: string
          field_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_documents_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "admission_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_form_fields: {
        Row: {
          created_at: string | null
          description: string | null
          form_id: string
          id: string
          label: string
          options: Json | null
          order: number
          placeholder: string | null
          required: boolean
          section: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          form_id: string
          id?: string
          label: string
          options?: Json | null
          order?: number
          placeholder?: string | null
          required?: boolean
          section?: string | null
          tenant_id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          form_id?: string
          id?: string
          label?: string
          options?: Json | null
          order?: number
          placeholder?: string | null
          required?: boolean
          section?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "admission_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_form_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_forms: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          programme_id: string | null
          settings: Json | null
          slug: string
          status: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          programme_id?: string | null
          settings?: Json | null
          slug: string
          status?: string
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          programme_id?: string | null
          settings?: Json | null
          slug?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_forms_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_reviews: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          reviewer_id: string
          tenant_id: string
        }
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          reviewer_id: string
          tenant_id?: string
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          reviewer_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_context_cache: {
        Row: {
          context_data: Json
          context_key: string
          created_at: string | null
          expires_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          context_data: Json
          context_key: string
          created_at?: string | null
          expires_at: string
          id?: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          context_data?: Json
          context_key?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_context_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          tenant_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          confidence: number | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          insight: string
          insight_type: string
          is_actionable: boolean | null
          is_read: boolean | null
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          insight: string
          insight_type: string
          is_actionable?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          tenant_id?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          insight?: string
          insight_type?: string
          is_actionable?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          tenant_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          tenant_id?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_analytics: {
        Row: {
          concepts_explained: number | null
          course_id: string | null
          created_at: string | null
          examples_requested: number | null
          help_requests: number | null
          id: string
          interaction_count: number | null
          lesson_id: string
          practice_requests: number | null
          questions_asked: number | null
          satisfaction_rating: number | null
          session_duration: number | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          concepts_explained?: number | null
          course_id?: string | null
          created_at?: string | null
          examples_requested?: number | null
          help_requests?: number | null
          id?: string
          interaction_count?: number | null
          lesson_id: string
          practice_requests?: number | null
          questions_asked?: number | null
          satisfaction_rating?: number | null
          session_duration?: number | null
          student_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          concepts_explained?: number | null
          course_id?: string | null
          created_at?: string | null
          examples_requested?: number | null
          help_requests?: number | null
          id?: string
          interaction_count?: number | null
          lesson_id?: string
          practice_requests?: number | null
          questions_asked?: number | null
          satisfaction_rating?: number | null
          session_duration?: number | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_analytics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_analytics_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_analytics_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_conversations: {
        Row: {
          ai_response: string
          context_data: Json | null
          course_id: string | null
          created_at: string | null
          id: string
          lesson_id: string
          response_type: string | null
          student_id: string
          tenant_id: string
          updated_at: string | null
          user_message: string
        }
        Insert: {
          ai_response: string
          context_data?: Json | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          response_type?: string | null
          student_id: string
          tenant_id?: string
          updated_at?: string | null
          user_message: string
        }
        Update: {
          ai_response?: string
          context_data?: Json | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          response_type?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_conversations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_conversations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_preferences: {
        Row: {
          auto_activate: boolean | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          learning_focus: string | null
          preferred_style: string | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_activate?: boolean | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          learning_focus?: string | null
          preferred_style?: string | null
          student_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          auto_activate?: boolean | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          learning_focus?: string | null
          preferred_style?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_preferences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_tracking: {
        Row: {
          api_calls: number | null
          cost_usd: number | null
          created_at: string | null
          date: string | null
          id: string
          tenant_id: string
          tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_calls?: number | null
          cost_usd?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          tenant_id?: string
          tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_calls?: number | null
          cost_usd?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          tenant_id?: string
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_dashboards: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_shared: boolean | null
          name: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          is_shared?: boolean | null
          name: string
          tenant_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_shared?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_dashboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_metrics: {
        Row: {
          created_at: string
          dimensions: Json | null
          id: string
          metric_date: string
          metric_type: string
          metric_value: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimensions?: Json | null
          id?: string
          metric_date: string
          metric_type: string
          metric_value: Json
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimensions?: Json | null
          id?: string
          metric_date?: string
          metric_type?: string
          metric_value?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_reports: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          id: string
          last_run_at: string | null
          name: string
          report_type: string
          schedule: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          created_by: string
          id?: string
          last_run_at?: string | null
          name: string
          report_type: string
          schedule?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          last_run_at?: string | null
          name?: string
          report_type?: string
          schedule?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_views: {
        Row: {
          announcement_id: string
          id: string
          tenant_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          announcement_id: string
          id?: string
          tenant_id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          announcement_id?: string
          id?: string
          tenant_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "course_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submission_rubric_scores: {
        Row: {
          comment: string | null
          criterion_id: string
          graded_at: string
          graded_by: string | null
          id: string
          level_index: number | null
          points: number | null
          submission_id: string
          tenant_id: string
        }
        Insert: {
          comment?: string | null
          criterion_id: string
          graded_at?: string
          graded_by?: string | null
          id?: string
          level_index?: number | null
          points?: number | null
          submission_id: string
          tenant_id?: string
        }
        Update: {
          comment?: string | null
          criterion_id?: string
          graded_at?: string
          graded_by?: string | null
          id?: string
          level_index?: number | null
          points?: number | null
          submission_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submission_rubric_scores_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submission_rubric_scores_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submission_rubric_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string | null
          content: string | null
          created_at: string | null
          feedback: string | null
          files: Json | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          group_id: string | null
          id: string
          late: boolean | null
          rubric_scores: Json | null
          status: string | null
          student_id: string | null
          submission_type: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          content?: string | null
          created_at?: string | null
          feedback?: string | null
          files?: Json | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          group_id?: string | null
          id?: string
          late?: boolean | null
          rubric_scores?: Json | null
          status?: string | null
          student_id?: string | null
          submission_type: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          content?: string | null
          created_at?: string | null
          feedback?: string | null
          files?: Json | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          group_id?: string | null
          id?: string
          late?: boolean | null
          rubric_scores?: Json | null
          status?: string | null
          student_id?: string | null
          submission_type?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "course_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_late_submissions: boolean | null
          anonymous_grading: boolean | null
          class_id: string | null
          course_id: string | null
          created_at: string | null
          creator_id: string | null
          curriculum_order: number | null
          description: string | null
          due_date: string | null
          file_types_allowed: string[] | null
          group_set_id: string | null
          id: string
          is_group_assignment: boolean | null
          late_penalty: number | null
          lesson_id: string | null
          max_file_size: number | null
          one_submission_per_group: boolean | null
          peer_review_anonymous: boolean | null
          peer_review_due_date: string | null
          peer_review_enabled: boolean | null
          peer_review_rubric: Json | null
          peer_reviews_required: number | null
          points: number | null
          published: boolean | null
          rubric: Json | null
          show_in_curriculum: boolean | null
          submission_types: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_late_submissions?: boolean | null
          anonymous_grading?: boolean | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          curriculum_order?: number | null
          description?: string | null
          due_date?: string | null
          file_types_allowed?: string[] | null
          group_set_id?: string | null
          id?: string
          is_group_assignment?: boolean | null
          late_penalty?: number | null
          lesson_id?: string | null
          max_file_size?: number | null
          one_submission_per_group?: boolean | null
          peer_review_anonymous?: boolean | null
          peer_review_due_date?: string | null
          peer_review_enabled?: boolean | null
          peer_review_rubric?: Json | null
          peer_reviews_required?: number | null
          points?: number | null
          published?: boolean | null
          rubric?: Json | null
          show_in_curriculum?: boolean | null
          submission_types?: string[] | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_late_submissions?: boolean | null
          anonymous_grading?: boolean | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          curriculum_order?: number | null
          description?: string | null
          due_date?: string | null
          file_types_allowed?: string[] | null
          group_set_id?: string | null
          id?: string
          is_group_assignment?: boolean | null
          late_penalty?: number | null
          lesson_id?: string | null
          max_file_size?: number | null
          one_submission_per_group?: boolean | null
          peer_review_anonymous?: boolean | null
          peer_review_due_date?: string | null
          peer_review_enabled?: boolean | null
          peer_review_rubric?: Json | null
          peer_reviews_required?: number | null
          points?: number | null
          published?: boolean | null
          rubric?: Json | null
          show_in_curriculum?: boolean | null
          submission_types?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_group_set_id_fkey"
            columns: ["group_set_id"]
            isOneToOne: false
            referencedRelation: "course_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string | null
          created_at: string | null
          date: string
          id: string
          records: Json
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          records?: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          records?: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          badge_class_id: string | null
          created_at: string
          created_by: string | null
          criteria_url: string | null
          description: string
          id: string
          image_url: string
          issuer_email: string | null
          issuer_name: string
          issuer_url: string | null
          name: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          badge_class_id?: string | null
          created_at?: string
          created_by?: string | null
          criteria_url?: string | null
          description: string
          id?: string
          image_url: string
          issuer_email?: string | null
          issuer_name?: string
          issuer_url?: string | null
          name: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          badge_class_id?: string | null
          created_at?: string
          created_by?: string | null
          criteria_url?: string | null
          description?: string
          id?: string
          image_url?: string
          issuer_email?: string | null
          issuer_name?: string
          issuer_url?: string | null
          name?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          background_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          logo_url: string | null
          name: string
          template_html: string
          tenant_id: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name: string
          template_html: string
          tenant_id?: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          background_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          template_html?: string
          tenant_id?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          grade_percentage: number | null
          id: string
          issued_at: string
          metadata: Json | null
          pdf_url: string | null
          student_id: string
          template_id: string | null
          tenant_id: string
          updated_at: string
          verification_code: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          grade_percentage?: number | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          pdf_url?: string | null
          student_id: string
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
          verification_code: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          grade_percentage?: number | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          pdf_url?: string | null
          student_id?: string
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ceu_credits: {
        Row: {
          certificate_id: string | null
          course_id: string
          created_at: string
          credit_type: string
          credits: number
          id: string
          issued_at: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          certificate_id?: string | null
          course_id: string
          created_at?: string
          credit_type?: string
          credits: number
          id?: string
          issued_at?: string
          student_id: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          certificate_id?: string | null
          course_id?: string
          created_at?: string
          credit_type?: string
          credits?: number
          id?: string
          issued_at?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceu_credits_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceu_credits_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceu_credits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceu_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      class_instructors: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          instructor_id: string | null
          tenant_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          tenant_id?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_instructors_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_instructors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          student_id: string | null
          tenant_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          student_id?: string | null
          tenant_id?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          student_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          active: boolean | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          enrollment_code: string | null
          enrollment_end: string | null
          enrollment_open: boolean | null
          enrollment_start: string | null
          id: string
          is_default: boolean | null
          max_enrollment: number | null
          name: string
          schedule: Json | null
          section: string | null
          start_date: string | null
          status: string | null
          tenant_id: string
          term: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_code?: string | null
          enrollment_end?: string | null
          enrollment_open?: boolean | null
          enrollment_start?: string | null
          id?: string
          is_default?: boolean | null
          max_enrollment?: number | null
          name: string
          schedule?: Json | null
          section?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          term?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_code?: string | null
          enrollment_end?: string | null
          enrollment_open?: boolean | null
          enrollment_start?: string | null
          id?: string
          is_default?: boolean | null
          max_enrollment?: number | null
          name?: string
          schedule?: Json | null
          section?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          term?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_analytics: {
        Row: {
          active_count: number | null
          avg_grade: number | null
          avg_progress: number | null
          cohort_id: string
          completed_count: number | null
          created_at: string | null
          dropped_count: number | null
          id: string
          last_calculated_at: string | null
          tenant_id: string
          total_enrolled: number | null
          updated_at: string | null
        }
        Insert: {
          active_count?: number | null
          avg_grade?: number | null
          avg_progress?: number | null
          cohort_id: string
          completed_count?: number | null
          created_at?: string | null
          dropped_count?: number | null
          id?: string
          last_calculated_at?: string | null
          tenant_id?: string
          total_enrolled?: number | null
          updated_at?: string | null
        }
        Update: {
          active_count?: number | null
          avg_grade?: number | null
          avg_progress?: number | null
          cohort_id?: string
          completed_count?: number | null
          created_at?: string | null
          dropped_count?: number | null
          id?: string
          last_calculated_at?: string | null
          tenant_id?: string
          total_enrolled?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_analytics_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_content_overrides: {
        Row: {
          available_from: string | null
          available_until: string | null
          cohort_id: string
          created_at: string | null
          id: string
          is_hidden: boolean | null
          lesson_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          cohort_id: string
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          lesson_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          cohort_id?: string
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          lesson_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_content_overrides_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_content_overrides_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_content_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_facilitators: {
        Row: {
          cohort_id: string
          created_at: string | null
          id: string
          role: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_facilitators_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_facilitators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_facilitators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      competencies: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_global: boolean | null
          level: number | null
          name: string
          parent_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean | null
          level?: number | null
          name: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean | null
          level?: number | null
          name?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competencies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          label: string
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label: string
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      conference_participants: {
        Row: {
          conference_id: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          role: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          conference_id?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          conference_id?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conference_participants_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "video_conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conference_recordings: {
        Row: {
          added_by: string | null
          conference_id: string | null
          created_at: string | null
          file_size: number | null
          id: string
          recording_duration: number | null
          recording_url: string
          status: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          conference_id?: string | null
          created_at?: string | null
          file_size?: number | null
          id?: string
          recording_duration?: number | null
          recording_url: string
          status?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          conference_id?: string | null
          created_at?: string | null
          file_size?: number | null
          id?: string
          recording_duration?: number | null
          recording_url?: string
          status?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conference_recordings_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_recordings_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "video_conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_recordings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conference_whiteboards: {
        Row: {
          added_by: string
          available_from: string
          collaboration: string
          conference_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          tenant_id: string
          whiteboard_id: string
        }
        Insert: {
          added_by: string
          available_from?: string
          collaboration?: string
          conference_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          tenant_id?: string
          whiteboard_id: string
        }
        Update: {
          added_by?: string
          available_from?: string
          collaboration?: string
          conference_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          tenant_id?: string
          whiteboard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conference_whiteboards_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_whiteboards_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "video_conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_whiteboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conference_whiteboards_whiteboard_id_fkey"
            columns: ["whiteboard_id"]
            isOneToOne: false
            referencedRelation: "whiteboards"
            referencedColumns: ["id"]
          },
        ]
      }
      content_item_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          content_index: number
          created_at: string | null
          id: string
          lesson_id: string
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          content_index: number
          created_at?: string | null
          id?: string
          lesson_id: string
          student_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          content_index?: number
          created_at?: string | null
          id?: string
          lesson_id?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_item_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_announcements: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          author_id: string
          cohort_id: string | null
          content: string
          course_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          scheduled_for: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_id: string
          cohort_id?: string | null
          content: string
          course_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          scheduled_for?: string | null
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_id?: string
          cohort_id?: string | null
          content?: string
          course_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          scheduled_for?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_announcements_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_global: boolean | null
          name: string
          order: number | null
          parent_id: string | null
          slug: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name: string
          order?: number | null
          parent_id?: string | null
          slug: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name?: string
          order?: number | null
          parent_id?: string | null
          slug?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_category_assignments: {
        Row: {
          category_id: string
          course_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          tenant_id: string
        }
        Insert: {
          category_id: string
          course_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          tenant_id?: string
        }
        Update: {
          category_id?: string
          course_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_category_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_category_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_competencies: {
        Row: {
          competency_id: string | null
          course_id: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          proficiency_level: number | null
          tenant_id: string
          weight: number | null
        }
        Insert: {
          competency_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          proficiency_level?: number | null
          tenant_id?: string
          weight?: number | null
        }
        Update: {
          competency_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          proficiency_level?: number | null
          tenant_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_competencies_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_competencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_discussions: {
        Row: {
          author_id: string | null
          cohort_id: string | null
          content: string
          course_id: string | null
          created_at: string | null
          curriculum_order: number | null
          due_date: string | null
          grading_criteria: string | null
          id: string
          is_graded: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          min_replies: number | null
          min_words: number | null
          points: number | null
          rubric: Json | null
          show_in_curriculum: boolean | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          cohort_id?: string | null
          content: string
          course_id?: string | null
          created_at?: string | null
          curriculum_order?: number | null
          due_date?: string | null
          grading_criteria?: string | null
          id?: string
          is_graded?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          min_replies?: number | null
          min_words?: number | null
          points?: number | null
          rubric?: Json | null
          show_in_curriculum?: boolean | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          cohort_id?: string | null
          content?: string
          course_id?: string | null
          created_at?: string | null
          curriculum_order?: number | null
          due_date?: string | null
          grading_criteria?: string | null
          id?: string
          is_graded?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          min_replies?: number | null
          min_words?: number | null
          points?: number | null
          rubric?: Json | null
          show_in_curriculum?: boolean | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_discussions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_discussions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_grade_categories: {
        Row: {
          aggregation: string
          course_id: string
          created_at: string
          display_color: string | null
          drop_highest: number
          drop_lowest: number
          extra_credit: boolean
          hidden: boolean
          id: string
          keep_highest: number | null
          name: string
          parent_id: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          aggregation?: string
          course_id: string
          created_at?: string
          display_color?: string | null
          drop_highest?: number
          drop_lowest?: number
          extra_credit?: boolean
          hidden?: boolean
          id?: string
          keep_highest?: number | null
          name: string
          parent_id?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          aggregation?: string
          course_id?: string
          created_at?: string
          display_color?: string | null
          drop_highest?: number
          drop_lowest?: number
          extra_credit?: boolean
          hidden?: boolean
          id?: string
          keep_highest?: number | null
          name?: string
          parent_id?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_grade_categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "course_grade_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_grade_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          course_grade_id: string
          id: string
          new_feedback: string | null
          new_score: number | null
          previous_feedback: string | null
          previous_score: number | null
          reason: string | null
          tenant_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          course_grade_id: string
          id?: string
          new_feedback?: string | null
          new_score?: number | null
          previous_feedback?: string | null
          previous_score?: number | null
          reason?: string | null
          tenant_id?: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          course_grade_id?: string
          id?: string
          new_feedback?: string | null
          new_score?: number | null
          previous_feedback?: string | null
          previous_score?: number | null
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_grade_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_history_course_grade_id_fkey"
            columns: ["course_grade_id"]
            isOneToOne: false
            referencedRelation: "course_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_grade_items: {
        Row: {
          assessment_id: string | null
          category: string
          category_id: string | null
          course_id: string
          created_at: string | null
          due_date: string | null
          extra_credit: boolean
          hidden: boolean
          id: string
          is_active: boolean | null
          locked: boolean
          min_score: number
          points: number
          sort_order: number
          tenant_id: string
          title: string
          type: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          assessment_id?: string | null
          category: string
          category_id?: string | null
          course_id: string
          created_at?: string | null
          due_date?: string | null
          extra_credit?: boolean
          hidden?: boolean
          id?: string
          is_active?: boolean | null
          locked?: boolean
          min_score?: number
          points: number
          sort_order?: number
          tenant_id?: string
          title: string
          type: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          assessment_id?: string | null
          category?: string
          category_id?: string | null
          course_id?: string
          created_at?: string | null
          due_date?: string | null
          extra_credit?: boolean
          hidden?: boolean
          id?: string
          is_active?: boolean | null
          locked?: boolean
          min_score?: number
          points?: number
          sort_order?: number
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_grade_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_grade_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_grade_letters: {
        Row: {
          course_id: string
          created_at: string
          id: string
          letter: string
          min_percentage: number
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          letter: string
          min_percentage: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          letter?: string
          min_percentage?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_grade_letters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_letters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_grade_summary: {
        Row: {
          breakdown: Json
          computed_at: string
          computed_version: string | null
          course_id: string
          id: string
          letter: string | null
          percentage: number | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          breakdown?: Json
          computed_at?: string
          computed_version?: string | null
          course_id: string
          id?: string
          letter?: string | null
          percentage?: number | null
          student_id: string
          tenant_id?: string
        }
        Update: {
          breakdown?: Json
          computed_at?: string
          computed_version?: string | null
          course_id?: string
          id?: string
          letter?: string | null
          percentage?: number | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_grade_summary_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grade_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_gradebook_settings: {
        Row: {
          categories: Json | null
          course_id: string
          created_at: string | null
          grading_scheme: string | null
          id: string
          tenant_id: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          categories?: Json | null
          course_id: string
          created_at?: string | null
          grading_scheme?: string | null
          id?: string
          tenant_id?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          categories?: Json | null
          course_id?: string
          created_at?: string | null
          grading_scheme?: string | null
          id?: string
          tenant_id?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_gradebook_settings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_gradebook_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_grades: {
        Row: {
          course_id: string
          created_at: string | null
          feedback: string | null
          grade_item_id: string
          graded_at: string | null
          graded_by: string | null
          id: string
          max_score: number
          percentage: number
          score: number
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          feedback?: string | null
          grade_item_id: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score: number
          percentage: number
          score: number
          student_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          feedback?: string | null
          grade_item_id?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score?: number
          percentage?: number
          score?: number
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grades_grade_item_id_fkey"
            columns: ["grade_item_id"]
            isOneToOne: false
            referencedRelation: "course_grade_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          student_id: string
          tenant_id?: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "course_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_group_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_group_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_groups: {
        Row: {
          allow_self_enrollment: boolean | null
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          max_members: number | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_self_enrollment?: boolean | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          max_members?: number | null
          name: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          allow_self_enrollment?: boolean | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          max_members?: number | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          instructor_id: string | null
          tenant_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          tenant_id?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_library_resources: {
        Row: {
          added_by: string | null
          course_id: string
          created_at: string | null
          id: string
          lesson_id: string | null
          order: number | null
          resource_id: string
          tenant_id: string
        }
        Insert: {
          added_by?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          order?: number | null
          resource_id: string
          tenant_id?: string
        }
        Update: {
          added_by?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          order?: number | null
          resource_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_library_resources_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_library_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_library_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_library_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "library_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_library_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          collapsed: boolean | null
          course_id: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          order: number
          published: boolean | null
          start_date: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          collapsed?: boolean | null
          course_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          order?: number
          published?: boolean | null
          start_date?: string | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          collapsed?: boolean | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          order?: number
          published?: boolean | null
          start_date?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_sections_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_shares: {
        Row: {
          allow_fork: boolean
          can_add_supplemental_content: boolean
          can_enroll: boolean
          can_post_grades: boolean
          can_schedule_live_sessions: boolean
          course_id: string
          created_at: string | null
          description_snapshot: string | null
          id: string
          permission: string
          revoked_at: string | null
          shared_by: string
          source_tenant_id: string
          target_tenant_id: string | null
          thumbnail_snapshot: string | null
          title_snapshot: string
        }
        Insert: {
          allow_fork?: boolean
          can_add_supplemental_content?: boolean
          can_enroll?: boolean
          can_post_grades?: boolean
          can_schedule_live_sessions?: boolean
          course_id: string
          created_at?: string | null
          description_snapshot?: string | null
          id?: string
          permission?: string
          revoked_at?: string | null
          shared_by: string
          source_tenant_id: string
          target_tenant_id?: string | null
          thumbnail_snapshot?: string | null
          title_snapshot: string
        }
        Update: {
          allow_fork?: boolean
          can_add_supplemental_content?: boolean
          can_enroll?: boolean
          can_post_grades?: boolean
          can_schedule_live_sessions?: boolean
          course_id?: string
          created_at?: string | null
          description_snapshot?: string | null
          id?: string
          permission?: string
          revoked_at?: string | null
          shared_by?: string
          source_tenant_id?: string
          target_tenant_id?: string | null
          thumbnail_snapshot?: string | null
          title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_shares_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_shares_source_tenant_id_fkey"
            columns: ["source_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_shares_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          allow_lesson_personalisation: boolean
          ceu_credits: number | null
          course_format: string
          created_at: string | null
          credit_type: string | null
          description: string | null
          difficulty: string | null
          estimated_duration: string | null
          featured: boolean | null
          forked_at: string | null
          forked_from_course_id: string | null
          forked_from_tenant_id: string | null
          grade_level: string | null
          id: string
          is_public: boolean
          modality: string | null
          published: boolean | null
          start_date: string | null
          subject_area: string | null
          syllabus: string | null
          tenant_id: string
          thumbnail: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_lesson_personalisation?: boolean
          ceu_credits?: number | null
          course_format?: string
          created_at?: string | null
          credit_type?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration?: string | null
          featured?: boolean | null
          forked_at?: string | null
          forked_from_course_id?: string | null
          forked_from_tenant_id?: string | null
          grade_level?: string | null
          id?: string
          is_public?: boolean
          modality?: string | null
          published?: boolean | null
          start_date?: string | null
          subject_area?: string | null
          syllabus?: string | null
          tenant_id?: string
          thumbnail?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_lesson_personalisation?: boolean
          ceu_credits?: number | null
          course_format?: string
          created_at?: string | null
          credit_type?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration?: string | null
          featured?: boolean | null
          forked_at?: string | null
          forked_from_course_id?: string | null
          forked_from_tenant_id?: string | null
          grade_level?: string | null
          id?: string
          is_public?: boolean
          modality?: string | null
          published?: boolean | null
          start_date?: string | null
          subject_area?: string | null
          syllabus?: string | null
          tenant_id?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_record_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          credit_record_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          credit_record_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          credit_record_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_record_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_record_comments_credit_record_id_fkey"
            columns: ["credit_record_id"]
            isOneToOne: false
            referencedRelation: "credit_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_record_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_records: {
        Row: {
          awarded_credits: number | null
          completion_date: string | null
          course_code: string | null
          course_title: string
          created_at: string | null
          credits: number
          equivalence_notes: string | null
          equivalent_course_id: string | null
          evidence_url: string | null
          grade: string | null
          grade_scale: string | null
          id: string
          issuing_institution_name: string
          issuing_tenant_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_course_id: string | null
          source_enrollment_id: string | null
          source_type: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          awarded_credits?: number | null
          completion_date?: string | null
          course_code?: string | null
          course_title: string
          created_at?: string | null
          credits: number
          equivalence_notes?: string | null
          equivalent_course_id?: string | null
          evidence_url?: string | null
          grade?: string | null
          grade_scale?: string | null
          id?: string
          issuing_institution_name: string
          issuing_tenant_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_course_id?: string | null
          source_enrollment_id?: string | null
          source_type?: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          awarded_credits?: number | null
          completion_date?: string | null
          course_code?: string | null
          course_title?: string
          created_at?: string | null
          credits?: number
          equivalence_notes?: string | null
          equivalent_course_id?: string | null
          evidence_url?: string | null
          grade?: string | null
          grade_scale?: string | null
          id?: string
          issuing_institution_name?: string
          issuing_tenant_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_course_id?: string | null
          source_enrollment_id?: string | null
          source_type?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_records_equivalent_course_id_fkey"
            columns: ["equivalent_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_records_issuing_tenant_id_fkey"
            columns: ["issuing_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_records_source_course_id_fkey"
            columns: ["source_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_records_source_enrollment_id_fkey"
            columns: ["source_enrollment_id"]
            isOneToOne: false
            referencedRelation: "cross_tenant_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaign_recipients: {
        Row: {
          application_token: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string | null
          email: string
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          application_token?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          student_id: string
          tenant_id?: string
        }
        Update: {
          application_token?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaign_recipients_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaign_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string | null
          created_by: string
          id: string
          metadata: Json | null
          name: string
          scheduled_for: string | null
          segment_id: string | null
          sent_at: string | null
          stats: Json | null
          status: string | null
          subject: string
          template_variables: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          metadata?: Json | null
          name: string
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          stats?: Json | null
          status?: string | null
          subject: string
          template_variables?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          metadata?: Json | null
          name?: string
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          stats?: Json | null
          status?: string | null
          subject?: string
          template_variables?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "crm_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_engagement_config: {
        Row: {
          config_name: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string | null
          weights: Json
        }
        Insert: {
          config_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          weights?: Json
        }
        Update: {
          config_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crm_engagement_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_engagement_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_engagement_scores: {
        Row: {
          component_scores: Json
          config_id: string | null
          course_id: string | null
          created_at: string | null
          id: string
          score: number
          score_date: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          component_scores?: Json
          config_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          score: number
          score_date?: string
          student_id: string
          tenant_id?: string
        }
        Update: {
          component_scores?: Json
          config_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          score?: number
          score_date?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_engagement_scores_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "crm_engagement_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_engagement_scores_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_engagement_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_engagement_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          body: string | null
          course_id: string | null
          created_at: string | null
          created_by: string
          id: string
          interaction_type: string
          is_private: boolean | null
          metadata: Json | null
          student_id: string
          subject: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          interaction_type: string
          is_private?: boolean | null
          metadata?: Json | null
          student_id: string
          subject: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          interaction_type?: string
          is_private?: boolean | null
          metadata?: Json | null
          student_id?: string
          subject?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_segment_members: {
        Row: {
          added_at: string | null
          id: string
          segment_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          segment_id: string
          student_id: string
          tenant_id?: string
        }
        Update: {
          added_at?: string | null
          id?: string
          segment_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "crm_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_segment_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_segment_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_segments: {
        Row: {
          created_at: string | null
          created_by: string
          criteria: Json
          description: string | null
          id: string
          is_dynamic: boolean | null
          is_shared: boolean | null
          last_calculated_at: string | null
          logic: string | null
          member_count: number | null
          metadata: Json | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          criteria?: Json
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          is_shared?: boolean | null
          last_calculated_at?: string | null
          logic?: string | null
          member_count?: number | null
          metadata?: Json | null
          name: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          is_shared?: boolean | null
          last_calculated_at?: string | null
          logic?: string | null
          member_count?: number | null
          metadata?: Json | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_student_lifecycle: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          previous_stage: string | null
          stage: string
          stage_changed_at: string | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          previous_stage?: string | null
          stage: string
          stage_changed_at?: string | null
          student_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          previous_stage?: string | null
          stage?: string
          stage_changed_at?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_student_lifecycle_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_student_lifecycle_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_student_lifecycle_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string | null
          source: string | null
          source_id: string | null
          status: string | null
          student_id: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          source?: string | null
          source_id?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          source?: string | null
          source_id?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflow_executions: {
        Row: {
          actions_executed: Json | null
          error_message: string | null
          executed_at: string | null
          id: string
          status: string | null
          student_id: string | null
          tenant_id: string
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          actions_executed?: Json | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          actions_executed?: Json | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_executions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflows: {
        Row: {
          actions: Json
          conditions: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          metadata: Json | null
          name: string
          tenant_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          conditions?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          metadata?: Json | null
          name: string
          tenant_id?: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          metadata?: Json | null
          name?: string
          tenant_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          job_name: string
          result: Json | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          job_name: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          job_name?: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      cross_tenant_enrollments: {
        Row: {
          completed_at: string | null
          course_share_id: string
          enrolled_at: string | null
          id: string
          progress_percentage: number
          source_course_id: string
          source_tenant_id: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          course_share_id: string
          enrolled_at?: string | null
          id?: string
          progress_percentage?: number
          source_course_id: string
          source_tenant_id: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          course_share_id?: string
          enrolled_at?: string | null
          id?: string
          progress_percentage?: number
          source_course_id?: string
          source_tenant_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_tenant_enrollments_course_share_id_fkey"
            columns: ["course_share_id"]
            isOneToOne: false
            referencedRelation: "course_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_enrollments_source_course_id_fkey"
            columns: ["source_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_enrollments_source_tenant_id_fkey"
            columns: ["source_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_tenant_grades: {
        Row: {
          assessment_id: string
          assessment_type: string
          created_at: string | null
          enrollment_id: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          max_score: number | null
          percentage: number | null
          score: number | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          assessment_type: string
          created_at?: string | null
          enrollment_id: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          score?: number | null
          student_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          assessment_type?: string
          created_at?: string | null
          enrollment_id?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          score?: number | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_tenant_grades_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "cross_tenant_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_grades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_tenant_lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          enrollment_id: string
          id: string
          last_accessed_at: string | null
          lesson_id: string
          student_id: string
          tenant_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          enrollment_id: string
          id?: string
          last_accessed_at?: string | null
          lesson_id: string
          student_id: string
          tenant_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          enrollment_id?: string
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string
          student_id?: string
          tenant_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_tenant_lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "cross_tenant_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_tenant_lesson_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_report_executions: {
        Row: {
          error_message: string | null
          executed_at: string | null
          executed_by: string
          execution_time_ms: number | null
          id: string
          report_id: string
          result_count: number | null
          result_data: Json | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          executed_by: string
          execution_time_ms?: number | null
          id?: string
          report_id: string
          result_count?: number | null
          result_data?: Json | null
          status?: string | null
          tenant_id?: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string
          execution_time_ms?: number | null
          id?: string
          report_id?: string
          result_count?: number | null
          result_data?: Json | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_report_executions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_report_executions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "custom_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_report_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      data_warehouse_configs: {
        Row: {
          connection_config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          sync_frequency: string | null
          tenant_id: string
          updated_at: string | null
          warehouse_type: string
        }
        Insert: {
          connection_config: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          sync_frequency?: string | null
          tenant_id?: string
          updated_at?: string | null
          warehouse_type: string
        }
        Update: {
          connection_config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          sync_frequency?: string | null
          tenant_id?: string
          updated_at?: string | null
          warehouse_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_warehouse_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_grades: {
        Row: {
          course_id: string
          created_at: string | null
          discussion_id: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          max_score: number | null
          percentage: number | null
          rubric_scores: Json | null
          score: number | null
          student_id: string
          tenant_id: string
          total_posts: number | null
          total_replies: number | null
          total_words: number | null
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          discussion_id: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          rubric_scores?: Json | null
          score?: number | null
          student_id: string
          tenant_id?: string
          total_posts?: number | null
          total_replies?: number | null
          total_words?: number | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          discussion_id?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          rubric_scores?: Json | null
          score?: number | null
          student_id?: string
          tenant_id?: string
          total_posts?: number | null
          total_replies?: number | null
          total_words?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_grades_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "course_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_grades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          discussion_id: string | null
          id: string
          is_solution: boolean | null
          parent_reply_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          is_solution?: boolean | null
          parent_reply_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          is_solution?: boolean | null
          parent_reply_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "course_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_rubric_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          rubric: Json
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          rubric: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          rubric?: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_rubric_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_rubric_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_votes: {
        Row: {
          created_at: string | null
          discussion_id: string | null
          id: string
          reply_id: string | null
          tenant_id: string
          user_id: string | null
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          tenant_id?: string
          user_id?: string | null
          vote_type: string
        }
        Update: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          tenant_id?: string
          user_id?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_votes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "course_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_votes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          author_id: string | null
          content: string | null
          course_id: string | null
          created_at: string | null
          id: string
          published: boolean | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          published?: boolean | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          published?: boolean | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_digests: {
        Row: {
          body_html: string
          created_at: string
          digest_type: string
          id: string
          notification_ids: string[] | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          subject: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          body_html: string
          created_at?: string
          digest_type: string
          id?: string
          notification_ids?: string[] | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          subject: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          body_html?: string
          created_at?: string
          digest_type?: string
          id?: string
          notification_ids?: string[] | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_digests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          sent_at: string | null
          status: string | null
          subject: string
          tenant_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string | null
          subject: string
          tenant_id?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html_template: string
          body_text_template: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject_template: string
          tenant_id: string
          type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_html_template: string
          body_text_template?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject_template: string
          tenant_id?: string
          type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_html_template?: string
          body_text_template?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject_template?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_metrics: {
        Row: {
          assignments_on_time: number | null
          assignments_submitted: number | null
          course_id: string | null
          created_at: string | null
          discussions_participated: number | null
          engagement_score: number | null
          id: string
          lessons_completed: number | null
          login_count: number | null
          metric_date: string
          quizzes_completed: number | null
          student_id: string
          tenant_id: string
          time_spent_minutes: number | null
          videos_watched: number | null
        }
        Insert: {
          assignments_on_time?: number | null
          assignments_submitted?: number | null
          course_id?: string | null
          created_at?: string | null
          discussions_participated?: number | null
          engagement_score?: number | null
          id?: string
          lessons_completed?: number | null
          login_count?: number | null
          metric_date: string
          quizzes_completed?: number | null
          student_id: string
          tenant_id?: string
          time_spent_minutes?: number | null
          videos_watched?: number | null
        }
        Update: {
          assignments_on_time?: number | null
          assignments_submitted?: number | null
          course_id?: string | null
          created_at?: string | null
          discussions_participated?: number | null
          engagement_score?: number | null
          id?: string
          lessons_completed?: number | null
          login_count?: number | null
          metric_date?: string
          quizzes_completed?: number | null
          student_id?: string
          tenant_id?: string
          time_spent_minutes?: number | null
          videos_watched?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_metrics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_metrics_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string | null
          completed_at: string | null
          course_id: string | null
          enrolled_at: string | null
          id: string
          learning_preferences: Json | null
          profile_created_at: string | null
          progress_percentage: number
          status: string | null
          student_avatar: string | null
          student_bio: string | null
          student_email: string | null
          student_gender: string | null
          student_id: string | null
          student_name: string | null
          student_role: string | null
          tenant_id: string
          updated_at: string | null
          user_created_at: string | null
        }
        Insert: {
          class_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          learning_preferences?: Json | null
          profile_created_at?: string | null
          progress_percentage?: number
          status?: string | null
          student_avatar?: string | null
          student_bio?: string | null
          student_email?: string | null
          student_gender?: string | null
          student_id?: string | null
          student_name?: string | null
          student_role?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_created_at?: string | null
        }
        Update: {
          class_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          learning_preferences?: Json | null
          profile_created_at?: string | null
          progress_percentage?: number
          status?: string | null
          student_avatar?: string | null
          student_bio?: string | null
          student_email?: string | null
          student_gender?: string | null
          student_id?: string | null
          student_name?: string | null
          student_role?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_pipeline_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          pipeline_name: string
          records_failed: number | null
          records_processed: number | null
          started_at: string | null
          status: string | null
          tenant_id: string
          warehouse_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          pipeline_name: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          warehouse_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          pipeline_name?: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etl_pipeline_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etl_pipeline_jobs_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "data_warehouse_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_pipeline_schedules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          pipeline_name: string
          schedule_config: Json
          schedule_type: string
          tenant_id: string
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          pipeline_name: string
          schedule_config: Json
          schedule_type: string
          tenant_id?: string
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          pipeline_name?: string
          schedule_config?: Json
          schedule_type?: string
          tenant_id?: string
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etl_pipeline_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etl_pipeline_schedules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "data_warehouse_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          name: string
          size: number
          tenant_id: string
          type: string
          updated_at: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          name: string
          size: number
          tenant_id?: string
          type: string
          updated_at?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          name?: string
          size?: number
          tenant_id?: string
          type?: string
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_profiles: {
        Row: {
          created_at: string
          last_active_at: string | null
          level: number
          streak_count: number
          tenant_id: string
          updated_at: string
          user_id: string
          xp_total: number
        }
        Insert: {
          created_at?: string
          last_active_at?: string | null
          level?: number
          streak_count?: number
          tenant_id?: string
          updated_at?: string
          user_id: string
          xp_total?: number
        }
        Update: {
          created_at?: string
          last_active_at?: string | null
          level?: number
          streak_count?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamification_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_xp_ledger: {
        Row: {
          course_id: string | null
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          lesson_id: string | null
          metadata: Json | null
          reason: string | null
          tenant_id: string
          user_id: string
          xp_delta: number
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          reason?: string | null
          tenant_id?: string
          user_id: string
          xp_delta: number
        }
        Update: {
          course_id?: string | null
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          reason?: string | null
          tenant_id?: string
          user_id?: string
          xp_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamification_xp_ledger_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_xp_ledger_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_xp_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_xp_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      global_announcements: {
        Row: {
          announcement_type: string | null
          created_at: string | null
          created_by: string
          end_date: string | null
          id: string
          is_active: boolean | null
          is_dismissible: boolean | null
          message: string
          notification_channels: string[] | null
          priority: string | null
          send_notification: boolean | null
          show_in_dashboard: boolean | null
          show_on_login: boolean | null
          start_date: string | null
          target_courses: string[] | null
          target_roles: string[] | null
          target_tenants: string[] | null
          target_users: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_type?: string | null
          created_at?: string | null
          created_by: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          message: string
          notification_channels?: string[] | null
          priority?: string | null
          send_notification?: boolean | null
          show_in_dashboard?: boolean | null
          show_on_login?: boolean | null
          start_date?: string | null
          target_courses?: string[] | null
          target_roles?: string[] | null
          target_tenants?: string[] | null
          target_users?: string[] | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_type?: string | null
          created_at?: string | null
          created_by?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          message?: string
          notification_channels?: string[] | null
          priority?: string | null
          send_notification?: boolean | null
          show_in_dashboard?: boolean | null
          show_on_login?: boolean | null
          start_date?: string | null
          target_courses?: string[] | null
          target_roles?: string[] | null
          target_tenants?: string[] | null
          target_users?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_discussion_categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_global: boolean | null
          name: string
          slug: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name: string
          slug: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name?: string
          slug?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_discussion_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_discussion_replies: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          discussion_id: string | null
          id: string
          is_hidden: boolean | null
          is_solution: boolean | null
          parent_reply_id: string | null
          tenant_id: string
          updated_at: string | null
          vote_count: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          is_hidden?: boolean | null
          is_solution?: boolean | null
          parent_reply_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          vote_count?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          is_hidden?: boolean | null
          is_solution?: boolean | null
          parent_reply_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "global_discussion_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "global_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "global_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_replies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_discussion_subscriptions: {
        Row: {
          created_at: string | null
          discussion_id: string | null
          id: string
          notify_on_reply: boolean | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          notify_on_reply?: boolean | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          notify_on_reply?: boolean | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_discussion_subscriptions_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "global_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      global_discussion_votes: {
        Row: {
          created_at: string | null
          discussion_id: string | null
          id: string
          reply_id: string | null
          tenant_id: string
          user_id: string | null
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          tenant_id?: string
          user_id?: string | null
          vote_type: string
        }
        Update: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          tenant_id?: string
          user_id?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_discussion_votes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "global_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "global_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_votes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussion_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      global_discussions: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string | null
          id: string
          is_featured: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          last_activity_at: string | null
          reply_count: number | null
          tenant_id: string
          title: string
          updated_at: string | null
          view_count: number | null
          vote_count: number | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          reply_count?: number | null
          tenant_id?: string
          title: string
          updated_at?: string | null
          view_count?: number | null
          vote_count?: number | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          reply_count?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "global_discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "global_discussion_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_discussions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_items: {
        Row: {
          assessment_id: string | null
          category: string
          class_id: string | null
          created_at: string | null
          id: string
          points: number
          tenant_id: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          assessment_id?: string | null
          category: string
          class_id?: string | null
          created_at?: string | null
          id?: string
          points: number
          tenant_id?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string | null
          category?: string
          class_id?: string | null
          created_at?: string | null
          id?: string
          points?: number
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_items_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          class_id: string | null
          created_at: string | null
          feedback: string | null
          grade_item_id: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          max_score: number
          percentage: number
          score: number
          student_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          feedback?: string | null
          grade_item_id?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score: number
          percentage: number
          score: number
          student_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          feedback?: string | null
          grade_item_id?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_score?: number
          percentage?: number
          score?: number
          student_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_grade_item_id_fkey"
            columns: ["grade_item_id"]
            isOneToOne: false
            referencedRelation: "grade_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          metadata: Json | null
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_analytics_models: {
        Row: {
          accuracy_metrics: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          model_config: Json
          model_file_url: string | null
          model_name: string
          model_type: string
          model_version: string
          tenant_id: string
          trained_at: string | null
          trained_by: string | null
          training_data_range: Json | null
          updated_at: string | null
        }
        Insert: {
          accuracy_metrics?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_config: Json
          model_file_url?: string | null
          model_name: string
          model_type: string
          model_version: string
          tenant_id?: string
          trained_at?: string | null
          trained_by?: string | null
          training_data_range?: Json | null
          updated_at?: string | null
        }
        Update: {
          accuracy_metrics?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_config?: Json
          model_file_url?: string | null
          model_name?: string
          model_type?: string
          model_version?: string
          tenant_id?: string
          trained_at?: string | null
          trained_by?: string | null
          training_data_range?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_analytics_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_analytics_models_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_analytics_predictions: {
        Row: {
          actual_value: Json | null
          confidence: number | null
          course_id: string | null
          features: Json | null
          id: string
          model_id: string
          predicted_at: string | null
          predicted_value: Json
          prediction_type: string
          student_id: string
          tenant_id: string
          validated_at: string | null
        }
        Insert: {
          actual_value?: Json | null
          confidence?: number | null
          course_id?: string | null
          features?: Json | null
          id?: string
          model_id: string
          predicted_at?: string | null
          predicted_value: Json
          prediction_type: string
          student_id: string
          tenant_id?: string
          validated_at?: string | null
        }
        Update: {
          actual_value?: Json | null
          confidence?: number | null
          course_id?: string | null
          features?: Json | null
          id?: string
          model_id?: string
          predicted_at?: string | null
          predicted_value?: Json
          prediction_type?: string
          student_id?: string
          tenant_id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_analytics_predictions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_analytics_predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "learning_analytics_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_analytics_predictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_analytics_predictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_courses: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          learning_path_id: string | null
          order: number
          tenant_id: string
          unlock_after_previous: boolean | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          learning_path_id?: string | null
          order?: number
          tenant_id?: string
          unlock_after_previous?: boolean | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          learning_path_id?: string | null
          order?: number
          tenant_id?: string
          unlock_after_previous?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_courses_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_enrollments: {
        Row: {
          completed_at: string | null
          enrolled_at: string | null
          id: string
          learning_path_id: string | null
          progress_percentage: number | null
          status: string | null
          student_id: string | null
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          enrolled_at?: string | null
          id?: string
          learning_path_id?: string | null
          progress_percentage?: number | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
        }
        Update: {
          completed_at?: string | null
          enrolled_at?: string | null
          id?: string
          learning_path_id?: string | null
          progress_percentage?: number | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_enrollments_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          estimated_duration: string | null
          featured: boolean | null
          id: string
          is_global: boolean | null
          published: boolean | null
          tenant_id: string
          thumbnail: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration?: string | null
          featured?: boolean | null
          id?: string
          is_global?: boolean | null
          published?: boolean | null
          tenant_id?: string
          thumbnail?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration?: string | null
          featured?: boolean | null
          id?: string
          is_global?: boolean | null
          published?: boolean | null
          tenant_id?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_paths_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_competencies: {
        Row: {
          competency_id: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          tenant_id: string
          weight: number | null
        }
        Insert: {
          competency_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          tenant_id?: string
          weight?: number | null
        }
        Update: {
          competency_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          tenant_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_competencies_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_competencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_concepts: {
        Row: {
          concept_id: string
          created_at: string
          id: string
          lesson_id: string
          relation: string
          tenant_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          id?: string
          lesson_id: string
          relation?: string
          tenant_id?: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          relation?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_concepts_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_concepts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_concepts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_discussion_replies: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          discussion_id: string | null
          id: string
          is_solution: boolean | null
          parent_reply_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          is_solution?: boolean | null
          parent_reply_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          is_solution?: boolean | null
          parent_reply_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_discussion_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "lesson_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussion_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "lesson_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussion_replies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_discussion_votes: {
        Row: {
          created_at: string | null
          discussion_id: string | null
          id: string
          reply_id: string | null
          tenant_id: string
          user_id: string | null
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          tenant_id?: string
          user_id?: string | null
          vote_type: string
        }
        Update: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          tenant_id?: string
          user_id?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_discussion_votes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "lesson_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussion_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "lesson_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussion_votes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussion_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_discussions: {
        Row: {
          author_id: string | null
          content: string
          course_id: string | null
          created_at: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          lesson_id: string | null
          published: boolean | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          lesson_id?: string | null
          published?: boolean | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          lesson_id?: string | null
          published?: boolean | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_discussions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          lesson_id: string | null
          started_at: string | null
          status: string | null
          student_id: string | null
          tenant_id: string
          time_spent: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          started_at?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          time_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          started_at?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          time_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_id: string | null
          content: Json | null
          content_type: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          difficulty: number | null
          estimated_time: number | null
          id: string
          learning_outcomes: string[] | null
          lesson_instructions: string | null
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          order: number
          prerequisite_lesson_id: string | null
          prerequisite_min_score: number | null
          prerequisite_type: string | null
          published: boolean | null
          resources: Json | null
          section_id: string | null
          subject_id: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          content?: Json | null
          content_type?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          estimated_time?: number | null
          id?: string
          learning_outcomes?: string[] | null
          lesson_instructions?: string | null
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          order?: number
          prerequisite_lesson_id?: string | null
          prerequisite_min_score?: number | null
          prerequisite_type?: string | null
          published?: boolean | null
          resources?: Json | null
          section_id?: string | null
          subject_id?: string | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          content?: Json | null
          content_type?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          estimated_time?: number | null
          id?: string
          learning_outcomes?: string[] | null
          lesson_instructions?: string | null
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          order?: number
          prerequisite_lesson_id?: string | null
          prerequisite_min_score?: number | null
          prerequisite_type?: string | null
          published?: boolean | null
          resources?: Json | null
          section_id?: string | null
          subject_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_content_type_fkey"
            columns: ["content_type"]
            isOneToOne: false
            referencedRelation: "activity_module_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_prerequisite_lesson_id_fkey"
            columns: ["prerequisite_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resource_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order: number | null
          parent_id: string | null
          slug: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order?: number | null
          parent_id?: string | null
          slug: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order?: number | null
          parent_id?: string | null
          slug?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_resource_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "library_resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resource_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resource_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          resource_id: string
          tenant_id: string
          url: string | null
          version: number
          version_notes: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          resource_id: string
          tenant_id?: string
          url?: string | null
          version: number
          version_notes?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          resource_id?: string
          tenant_id?: string
          url?: string | null
          version?: number
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_resource_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resource_versions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "library_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resource_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resources: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          resource_type: string
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
          updated_by: string | null
          url: string | null
          version: number | null
          version_notes: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          resource_type: string
          tags?: string[] | null
          tenant_id?: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          resource_type?: string
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "library_resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          api_key: string | null
          api_secret: string | null
          channel_type: string
          configuration: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string | null
          rate_limit_per_minute: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          channel_type: string
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string | null
          rate_limit_per_minute?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          channel_type?: string
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string | null
          rate_limit_per_minute?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_frequency: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          phone_number: string | null
          preferences: Json | null
          push_enabled: boolean | null
          push_tokens: Json | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          tenant_id: string
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          digest_frequency?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          phone_number?: string | null
          preferences?: Json | null
          push_enabled?: boolean | null
          push_tokens?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          digest_frequency?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          phone_number?: string | null
          preferences?: Json | null
          push_enabled?: boolean | null
          push_tokens?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_providers: {
        Row: {
          authorization_url: string | null
          auto_provision_users: boolean | null
          button_icon: string | null
          button_label: string | null
          client_id: string
          client_secret_encrypted: string
          connection_status: string | null
          created_at: string | null
          created_by: string | null
          default_role: string | null
          display_name: string
          email_domain_restriction: string | null
          enabled: boolean | null
          id: string
          last_used_at: string | null
          provider_tenant_id: string | null
          provider_type: string
          scopes: string | null
          sort_order: number | null
          tenant_id: string
          token_url: string | null
          updated_at: string | null
          userinfo_url: string | null
        }
        Insert: {
          authorization_url?: string | null
          auto_provision_users?: boolean | null
          button_icon?: string | null
          button_label?: string | null
          client_id: string
          client_secret_encrypted: string
          connection_status?: string | null
          created_at?: string | null
          created_by?: string | null
          default_role?: string | null
          display_name: string
          email_domain_restriction?: string | null
          enabled?: boolean | null
          id?: string
          last_used_at?: string | null
          provider_tenant_id?: string | null
          provider_type: string
          scopes?: string | null
          sort_order?: number | null
          tenant_id?: string
          token_url?: string | null
          updated_at?: string | null
          userinfo_url?: string | null
        }
        Update: {
          authorization_url?: string | null
          auto_provision_users?: boolean | null
          button_icon?: string | null
          button_label?: string | null
          client_id?: string
          client_secret_encrypted?: string
          connection_status?: string | null
          created_at?: string | null
          created_by?: string | null
          default_role?: string | null
          display_name?: string
          email_domain_restriction?: string | null
          enabled?: boolean | null
          id?: string
          last_used_at?: string | null
          provider_tenant_id?: string | null
          provider_type?: string
          scopes?: string | null
          sort_order?: number | null
          tenant_id?: string
          token_url?: string | null
          updated_at?: string | null
          userinfo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_providers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      omnichannel_notifications: {
        Row: {
          channels: Json
          created_at: string | null
          id: string
          link_url: string | null
          message: string
          metadata: Json | null
          notification_type: string
          priority: string | null
          scheduled_for: string | null
          sent_at: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string | null
          id?: string
          link_url?: string | null
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          tenant_id?: string
          title: string
          user_id: string
        }
        Update: {
          channels?: Json
          created_at?: string | null
          id?: string
          link_url?: string | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_review_assignments: {
        Row: {
          assigned_at: string | null
          assignment_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          reviewer_id: string
          status: string | null
          submission_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assignment_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          reviewer_id: string
          status?: string | null
          submission_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assignment_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          reviewer_id?: string
          status?: string | null
          submission_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peer_review_assignments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_review_assignments_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_review_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_review_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_reviews: {
        Row: {
          assignment_id: string
          created_at: string | null
          feedback: string | null
          helpfulness_rating: number | null
          id: string
          is_helpful: boolean | null
          overall_score: number | null
          peer_assignment_id: string
          reviewer_id: string
          rubric_scores: Json | null
          submission_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          feedback?: string | null
          helpfulness_rating?: number | null
          id?: string
          is_helpful?: boolean | null
          overall_score?: number | null
          peer_assignment_id: string
          reviewer_id: string
          rubric_scores?: Json | null
          submission_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          feedback?: string | null
          helpfulness_rating?: number | null
          id?: string
          is_helpful?: boolean | null
          overall_score?: number | null
          peer_assignment_id?: string
          reviewer_id?: string
          rubric_scores?: Json | null
          submission_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peer_reviews_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_reviews_peer_assignment_id_fkey"
            columns: ["peer_assignment_id"]
            isOneToOne: false
            referencedRelation: "peer_review_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personalised_course_lessons: {
        Row: {
          accepted: boolean | null
          created_at: string
          id: string
          insert_after_position: number | null
          item_type: string
          lesson_id: string | null
          lesson_title_snapshot: string
          path_instructions: string | null
          path_outcomes: string[]
          personalised_course_id: string
          position: number
          rationale: string | null
          tenant_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          id?: string
          insert_after_position?: number | null
          item_type?: string
          lesson_id?: string | null
          lesson_title_snapshot: string
          path_instructions?: string | null
          path_outcomes?: string[]
          personalised_course_id: string
          position: number
          rationale?: string | null
          tenant_id?: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          id?: string
          insert_after_position?: number | null
          item_type?: string
          lesson_id?: string | null
          lesson_title_snapshot?: string
          path_instructions?: string | null
          path_outcomes?: string[]
          personalised_course_id?: string
          position?: number
          rationale?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalised_course_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalised_course_lessons_personalised_course_id_fkey"
            columns: ["personalised_course_id"]
            isOneToOne: false
            referencedRelation: "personalised_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalised_course_lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personalised_course_requests: {
        Row: {
          available_lesson_count: number | null
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          learner_id: string
          llm_model: string | null
          llm_provider: string | null
          outcome: string
          personalised_course_id: string | null
          prompt_tokens: number | null
          prompt_version: string | null
          selected_lesson_count: number
          tenant_id: string
        }
        Insert: {
          available_lesson_count?: number | null
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          learner_id: string
          llm_model?: string | null
          llm_provider?: string | null
          outcome: string
          personalised_course_id?: string | null
          prompt_tokens?: number | null
          prompt_version?: string | null
          selected_lesson_count: number
          tenant_id?: string
        }
        Update: {
          available_lesson_count?: number | null
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          learner_id?: string
          llm_model?: string | null
          llm_provider?: string | null
          outcome?: string
          personalised_course_id?: string | null
          prompt_tokens?: number | null
          prompt_version?: string | null
          selected_lesson_count?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalised_course_requests_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalised_course_requests_personalised_course_id_fkey"
            columns: ["personalised_course_id"]
            isOneToOne: false
            referencedRelation: "personalised_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalised_course_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personalised_courses: {
        Row: {
          approved_at: string | null
          course_description: string | null
          course_title: string | null
          created_at: string
          flagged_conflicts: string[]
          flagged_gaps: string[]
          generated_syllabus: string | null
          id: string
          inferred_objectives: string[]
          learner_goal: string
          learner_id: string
          llm_model: string | null
          llm_provider: string | null
          prompt_version: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          course_description?: string | null
          course_title?: string | null
          created_at?: string
          flagged_conflicts?: string[]
          flagged_gaps?: string[]
          generated_syllabus?: string | null
          id?: string
          inferred_objectives?: string[]
          learner_goal: string
          learner_id: string
          llm_model?: string | null
          llm_provider?: string | null
          prompt_version?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          course_description?: string | null
          course_title?: string | null
          created_at?: string
          flagged_conflicts?: string[]
          flagged_gaps?: string[]
          generated_syllabus?: string | null
          id?: string
          inferred_objectives?: string[]
          learner_goal?: string
          learner_id?: string
          llm_model?: string | null
          llm_provider?: string | null
          prompt_version?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalised_courses_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalised_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_events: {
        Row: {
          auto_flagged: boolean | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          severity: string
          tenant_id: string
        }
        Insert: {
          auto_flagged?: boolean | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          severity?: string
          tenant_id?: string
        }
        Update: {
          auto_flagged?: boolean | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          severity?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "proctoring_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_services: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          configuration: Json
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          service_type: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          configuration?: Json
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          service_type: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          configuration?: Json
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          service_type?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_sessions: {
        Row: {
          ai_monitoring: boolean | null
          allow_switching_tabs: boolean | null
          assignment_id: string | null
          browser_lock_enabled: boolean | null
          course_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          human_review: boolean | null
          id: string
          max_tab_switches: number | null
          prevent_copy_paste: boolean | null
          prevent_new_tabs: boolean | null
          prevent_printing: boolean | null
          prevent_screen_capture: boolean | null
          proctoring_service: string | null
          quiz_id: string | null
          require_fullscreen: boolean | null
          require_microphone: boolean | null
          require_screen_share: boolean | null
          require_webcam: boolean | null
          session_type: string
          started_at: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string | null
          violation_count: number | null
          violations: Json | null
        }
        Insert: {
          ai_monitoring?: boolean | null
          allow_switching_tabs?: boolean | null
          assignment_id?: string | null
          browser_lock_enabled?: boolean | null
          course_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          human_review?: boolean | null
          id?: string
          max_tab_switches?: number | null
          prevent_copy_paste?: boolean | null
          prevent_new_tabs?: boolean | null
          prevent_printing?: boolean | null
          prevent_screen_capture?: boolean | null
          proctoring_service?: string | null
          quiz_id?: string | null
          require_fullscreen?: boolean | null
          require_microphone?: boolean | null
          require_screen_share?: boolean | null
          require_webcam?: boolean | null
          session_type: string
          started_at?: string | null
          status?: string
          student_id: string
          tenant_id?: string
          updated_at?: string | null
          violation_count?: number | null
          violations?: Json | null
        }
        Update: {
          ai_monitoring?: boolean | null
          allow_switching_tabs?: boolean | null
          assignment_id?: string | null
          browser_lock_enabled?: boolean | null
          course_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          human_review?: boolean | null
          id?: string
          max_tab_switches?: number | null
          prevent_copy_paste?: boolean | null
          prevent_new_tabs?: boolean | null
          prevent_printing?: boolean | null
          prevent_screen_capture?: boolean | null
          proctoring_service?: string | null
          quiz_id?: string | null
          require_fullscreen?: boolean | null
          require_microphone?: boolean | null
          require_screen_share?: boolean | null
          require_webcam?: boolean | null
          session_type?: string
          started_at?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
          violation_count?: number | null
          violations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_application_fields: {
        Row: {
          campaign_id: string
          created_at: string | null
          description: string | null
          id: string
          options: Json | null
          order: number | null
          question_text: string
          required: boolean | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          options?: Json | null
          order?: number | null
          question_text: string
          required?: boolean | null
          tenant_id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          options?: Json | null
          order?: number | null
          question_text?: string
          required?: boolean | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_application_fields_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_application_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_applications: {
        Row: {
          answers: Json | null
          applicant_email: string
          applicant_id: string
          applicant_name: string
          campaign_id: string
          created_at: string | null
          enrollment_id: string | null
          id: string
          programme_id: string
          recipient_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          answers?: Json | null
          applicant_email: string
          applicant_id: string
          applicant_name: string
          campaign_id: string
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          programme_id: string
          recipient_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          answers?: Json | null
          applicant_email?: string
          applicant_id?: string
          applicant_name?: string
          campaign_id?: string
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          programme_id?: string
          recipient_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_applications_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_applications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "crm_campaign_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_courses: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          is_required: boolean | null
          order: number
          programme_id: string
          tenant_id: string
          weight: number | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          order?: number
          programme_id: string
          tenant_id?: string
          weight?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          order?: number
          programme_id?: string
          tenant_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_courses_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_enrollments: {
        Row: {
          certificate_issued: boolean | null
          completed_at: string | null
          enrolled_at: string | null
          final_score: number | null
          id: string
          programme_id: string
          status: string | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          certificate_issued?: boolean | null
          completed_at?: string | null
          enrolled_at?: string | null
          final_score?: number | null
          id?: string
          programme_id: string
          status?: string | null
          student_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          certificate_issued?: boolean | null
          completed_at?: string | null
          enrolled_at?: string | null
          final_score?: number | null
          id?: string
          programme_id?: string
          status?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_enrollments_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          estimated_duration: string | null
          id: string
          is_global: boolean | null
          passing_score: number | null
          published: boolean | null
          slug: string
          tenant_id: string
          thumbnail: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration?: string | null
          id?: string
          is_global?: boolean | null
          passing_score?: number | null
          published?: boolean | null
          slug: string
          tenant_id?: string
          thumbnail?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration?: string | null
          id?: string
          is_global?: boolean | null
          passing_score?: number | null
          published?: boolean | null
          slug?: string
          tenant_id?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programmes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          last_accessed: string | null
          lesson_id: string | null
          progress_percentage: number | null
          status: string | null
          student_id: string | null
          tenant_id: string
          time_spent: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          lesson_id?: string | null
          progress_percentage?: number | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          time_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          lesson_id?: string | null
          progress_percentage?: number | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          time_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          device_token: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          platform: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          device_token?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          platform?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          device_token?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          platform?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          case_sensitive: boolean | null
          correct_answer: Json | null
          created_at: string | null
          feedback_correct: string | null
          feedback_incorrect: string | null
          id: string
          options: Json | null
          order: number | null
          points: number | null
          question_text: string
          quiz_id: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          case_sensitive?: boolean | null
          correct_answer?: Json | null
          created_at?: string | null
          feedback_correct?: string | null
          feedback_incorrect?: string | null
          id?: string
          options?: Json | null
          order?: number | null
          points?: number | null
          question_text: string
          quiz_id?: string | null
          tenant_id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          case_sensitive?: boolean | null
          correct_answer?: Json | null
          created_at?: string | null
          feedback_correct?: string | null
          feedback_incorrect?: string | null
          id?: string
          options?: Json | null
          order?: number | null
          points?: number | null
          question_text?: string
          quiz_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          attempt_number: number
          course_id: string | null
          created_at: string | null
          id: string
          max_score: number | null
          percentage: number | null
          quiz_id: string | null
          score: number | null
          started_at: string | null
          status: string | null
          student_id: string | null
          submitted_at: string | null
          tenant_id: string
          time_taken: number | null
          updated_at: string | null
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number
          course_id?: string | null
          created_at?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          quiz_id?: string | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
          tenant_id?: string
          time_taken?: number | null
          updated_at?: string | null
        }
        Update: {
          answers?: Json | null
          attempt_number?: number
          course_id?: string | null
          created_at?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          quiz_id?: string | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
          tenant_id?: string
          time_taken?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_extensions: {
        Row: {
          course_id: string
          created_at: string | null
          extended_available_until: string | null
          extended_due_date: string | null
          extra_attempts: number | null
          extra_time_minutes: number | null
          granted_by: string
          id: string
          quiz_id: string
          reason: string | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          extended_available_until?: string | null
          extended_due_date?: string | null
          extra_attempts?: number | null
          extra_time_minutes?: number | null
          granted_by: string
          id?: string
          quiz_id: string
          reason?: string | null
          student_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          extended_available_until?: string | null
          extended_due_date?: string | null
          extra_attempts?: number | null
          extra_time_minutes?: number | null
          granted_by?: string
          id?: string
          quiz_id?: string
          reason?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_extensions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_extensions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_extensions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_extensions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_extensions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_proctor_logs: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          quiz_attempt_id: string
          severity: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          quiz_attempt_id: string
          severity?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          quiz_attempt_id?: string
          severity?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_proctor_logs_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_proctor_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          attempts_allowed: number | null
          available_from: string | null
          available_until: string | null
          course_id: string | null
          created_at: string | null
          creator_id: string | null
          curriculum_order: number | null
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          passing_score: number | null
          points: number | null
          proctor_settings: Json | null
          proctored_mode: string | null
          published: boolean | null
          randomize_answers: boolean | null
          randomize_questions: boolean | null
          show_correct_answers: boolean | null
          show_feedback: string | null
          show_in_curriculum: boolean | null
          tenant_id: string
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attempts_allowed?: number | null
          available_from?: string | null
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          curriculum_order?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          passing_score?: number | null
          points?: number | null
          proctor_settings?: Json | null
          proctored_mode?: string | null
          published?: boolean | null
          randomize_answers?: boolean | null
          randomize_questions?: boolean | null
          show_correct_answers?: boolean | null
          show_feedback?: string | null
          show_in_curriculum?: boolean | null
          tenant_id?: string
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attempts_allowed?: number | null
          available_from?: string | null
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          curriculum_order?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          passing_score?: number | null
          points?: number | null
          proctor_settings?: Json | null
          proctored_mode?: string | null
          published?: boolean | null
          randomize_answers?: boolean | null
          randomize_questions?: boolean | null
          show_correct_answers?: boolean | null
          show_feedback?: string | null
          show_in_curriculum?: boolean | null
          tenant_id?: string
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string | null
          frequency: string
          id: string
          is_active: boolean | null
          last_run: string | null
          next_run: string | null
          recipients: string[]
          report_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          next_run?: string | null
          recipients?: string[]
          report_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          next_run?: string | null
          recipients?: string[]
          report_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "custom_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_links: {
        Row: {
          body_html: string | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          lesson_id: string | null
          link_type: string | null
          order: number | null
          tenant_id: string
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          body_html?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          lesson_id?: string | null
          link_type?: string | null
          order?: number | null
          tenant_id?: string
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          body_html?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          lesson_id?: string | null
          link_type?: string | null
          order?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_links_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_links_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_packages: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          identifier: string | null
          lesson_id: string
          manifest_xml: string | null
          package_size: number | null
          package_url: string
          schema_location: string | null
          schema_version: string | null
          scorm_version: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identifier?: string | null
          lesson_id: string
          manifest_xml?: string | null
          package_size?: number | null
          package_url: string
          schema_location?: string | null
          schema_version?: string | null
          scorm_version: string
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identifier?: string | null
          lesson_id?: string
          manifest_xml?: string | null
          package_size?: number | null
          package_url?: string
          schema_location?: string | null
          schema_version?: string | null
          scorm_version?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorm_packages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_packages_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_tracking: {
        Row: {
          attempts: number | null
          completion_status: string | null
          course_id: string | null
          created_at: string
          entry: string | null
          exit: string | null
          id: string
          interactions: Json | null
          last_accessed: string | null
          last_saved: string | null
          launch_data: string | null
          lesson_id: string | null
          location: string | null
          mastery_score: number | null
          max_time_allowed: string | null
          objectives: Json | null
          progress_measure: number | null
          scaled_passing_score: number | null
          score_max: number | null
          score_min: number | null
          score_raw: number | null
          score_scaled: number | null
          scorm_package_id: string
          session_time: number | null
          student_id: string
          success_status: string | null
          suspend_data: string | null
          tenant_id: string
          time_limit_action: string | null
          time_spent: number | null
          total_time: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          completion_status?: string | null
          course_id?: string | null
          created_at?: string
          entry?: string | null
          exit?: string | null
          id?: string
          interactions?: Json | null
          last_accessed?: string | null
          last_saved?: string | null
          launch_data?: string | null
          lesson_id?: string | null
          location?: string | null
          mastery_score?: number | null
          max_time_allowed?: string | null
          objectives?: Json | null
          progress_measure?: number | null
          scaled_passing_score?: number | null
          score_max?: number | null
          score_min?: number | null
          score_raw?: number | null
          score_scaled?: number | null
          scorm_package_id: string
          session_time?: number | null
          student_id: string
          success_status?: string | null
          suspend_data?: string | null
          tenant_id?: string
          time_limit_action?: string | null
          time_spent?: number | null
          total_time?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          completion_status?: string | null
          course_id?: string | null
          created_at?: string
          entry?: string | null
          exit?: string | null
          id?: string
          interactions?: Json | null
          last_accessed?: string | null
          last_saved?: string | null
          launch_data?: string | null
          lesson_id?: string | null
          location?: string | null
          mastery_score?: number | null
          max_time_allowed?: string | null
          objectives?: Json | null
          progress_measure?: number | null
          scaled_passing_score?: number | null
          score_max?: number | null
          score_min?: number | null
          score_raw?: number | null
          score_scaled?: number | null
          scorm_package_id?: string
          session_time?: number | null
          student_id?: string
          success_status?: string | null
          suspend_data?: string | null
          tenant_id?: string
          time_limit_action?: string | null
          time_spent?: number | null
          total_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorm_tracking_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_tracking_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_tracking_scorm_package_id_fkey"
            columns: ["scorm_package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_tracking_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_course_acceptances: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          accepting_tenant_id: string
          course_share_id: string
          created_at: string | null
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          accepting_tenant_id: string
          course_share_id: string
          created_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          accepting_tenant_id?: string
          course_share_id?: string
          created_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_course_acceptances_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_acceptances_accepting_tenant_id_fkey"
            columns: ["accepting_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_acceptances_course_share_id_fkey"
            columns: ["course_share_id"]
            isOneToOne: false
            referencedRelation: "course_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_acceptances_declined_by_fkey"
            columns: ["declined_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_course_live_sessions: {
        Row: {
          course_share_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          instructor_id: string | null
          meeting_url: string | null
          provider: string
          scheduled_at: string
          source_course_id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          course_share_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          meeting_url?: string | null
          provider?: string
          scheduled_at: string
          source_course_id: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          course_share_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          meeting_url?: string | null
          provider?: string
          scheduled_at?: string
          source_course_id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_course_live_sessions_course_share_id_fkey"
            columns: ["course_share_id"]
            isOneToOne: false
            referencedRelation: "course_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_live_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_live_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_course_supplements: {
        Row: {
          author_id: string | null
          body: string | null
          course_share_id: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          kind: string
          link_type: string | null
          position: number | null
          published: boolean
          source_course_id: string
          tenant_id: string
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          course_share_id: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          kind: string
          link_type?: string | null
          position?: number | null
          published?: boolean
          source_course_id: string
          tenant_id: string
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          course_share_id?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          kind?: string
          link_type?: string | null
          position?: number | null
          published?: boolean
          source_course_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_course_supplements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_supplements_course_share_id_fkey"
            columns: ["course_share_id"]
            isOneToOne: false
            referencedRelation: "course_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_supplements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_type: string | null
          setting_value: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string | null
          setting_value?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string | null
          setting_value?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_notifications: {
        Row: {
          cost: number | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message: string
          notification_id: string | null
          phone_number: string
          provider_message_id: string | null
          sent_at: string | null
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          notification_id?: string | null
          phone_number: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          notification_id?: string | null
          phone_number?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sonisweb_connections: {
        Row: {
          api_mode: string
          api_password_encrypted: string
          api_username: string
          auth_flow: string
          base_url: string
          connection_status: string | null
          created_at: string | null
          enrollment_sync_enabled: boolean | null
          grade_passback_enabled: boolean | null
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          name: string
          settings: Json | null
          student_sync_enabled: boolean | null
          sync_enabled: boolean | null
          sync_schedule: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_mode?: string
          api_password_encrypted: string
          api_username: string
          auth_flow?: string
          base_url: string
          connection_status?: string | null
          created_at?: string | null
          enrollment_sync_enabled?: boolean | null
          grade_passback_enabled?: boolean | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          name: string
          settings?: Json | null
          student_sync_enabled?: boolean | null
          sync_enabled?: boolean | null
          sync_schedule?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          api_mode?: string
          api_password_encrypted?: string
          api_username?: string
          auth_flow?: string
          base_url?: string
          connection_status?: string | null
          created_at?: string | null
          enrollment_sync_enabled?: boolean | null
          grade_passback_enabled?: boolean | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          name?: string
          settings?: Json | null
          student_sync_enabled?: boolean | null
          sync_enabled?: boolean | null
          sync_schedule?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sonisweb_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sonisweb_field_mappings: {
        Row: {
          connection_id: string
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          lms_field: string
          lms_table: string | null
          sonisweb_field: string
          sort_order: number | null
          tenant_id: string
          transform_config: Json | null
          transform_type: string | null
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          lms_field: string
          lms_table?: string | null
          sonisweb_field: string
          sort_order?: number | null
          tenant_id?: string
          transform_config?: Json | null
          transform_type?: string | null
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          lms_field?: string
          lms_table?: string | null
          sonisweb_field?: string
          sort_order?: number | null
          tenant_id?: string
          transform_config?: Json | null
          transform_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sonisweb_field_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sonisweb_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sonisweb_field_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sonisweb_grade_sync_config: {
        Row: {
          configured_by: string | null
          connection_id: string
          course_id: string
          created_at: string | null
          enabled: boolean | null
          grade_format: string | null
          grade_items: Json | null
          id: string
          last_passback_at: string | null
          last_passback_status: string | null
          sonisweb_course_code: string | null
          sonisweb_section: string | null
          sync_mode: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          configured_by?: string | null
          connection_id: string
          course_id: string
          created_at?: string | null
          enabled?: boolean | null
          grade_format?: string | null
          grade_items?: Json | null
          id?: string
          last_passback_at?: string | null
          last_passback_status?: string | null
          sonisweb_course_code?: string | null
          sonisweb_section?: string | null
          sync_mode?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          configured_by?: string | null
          connection_id?: string
          course_id?: string
          created_at?: string | null
          enabled?: boolean | null
          grade_format?: string | null
          grade_items?: Json | null
          id?: string
          last_passback_at?: string | null
          last_passback_status?: string | null
          sonisweb_course_code?: string | null
          sonisweb_section?: string | null
          sync_mode?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sonisweb_grade_sync_config_configured_by_fkey"
            columns: ["configured_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sonisweb_grade_sync_config_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sonisweb_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sonisweb_grade_sync_config_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sonisweb_grade_sync_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sonisweb_id_mappings: {
        Row: {
          connection_id: string
          created_at: string | null
          entity_type: string
          id: string
          last_synced_at: string | null
          lms_id: string
          sonisweb_data: Json | null
          sonisweb_id: string
          sync_direction: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          entity_type: string
          id?: string
          last_synced_at?: string | null
          lms_id: string
          sonisweb_data?: Json | null
          sonisweb_id: string
          sync_direction?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          entity_type?: string
          id?: string
          last_synced_at?: string | null
          lms_id?: string
          sonisweb_data?: Json | null
          sonisweb_id?: string
          sync_direction?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sonisweb_id_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sonisweb_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sonisweb_id_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sonisweb_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string | null
          error_details: Json | null
          id: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_skipped: number | null
          records_updated: number | null
          started_at: string | null
          status: string
          summary: Json | null
          sync_type: string
          tenant_id: string
          trigger_type: string
          triggered_by: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string | null
          error_details?: Json | null
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_skipped?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          summary?: Json | null
          sync_type: string
          tenant_id?: string
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string | null
          error_details?: Json | null
          id?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_skipped?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string
          summary?: Json | null
          sync_type?: string
          tenant_id?: string
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sonisweb_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sonisweb_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sonisweb_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sonisweb_sync_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sonisweb_webhook_events: {
        Row: {
          connection_id: string | null
          created_at: string | null
          error_message: string | null
          event_type: string
          headers: Json | null
          id: string
          ip_address: string | null
          payload: Json
          processed_at: string | null
          processing_result: Json | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          headers?: Json | null
          id?: string
          ip_address?: string | null
          payload: Json
          processed_at?: string | null
          processing_result?: Json | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          headers?: Json | null
          id?: string
          ip_address?: string | null
          payload?: Json
          processed_at?: string | null
          processing_result?: Json | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sonisweb_webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sonisweb_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sonisweb_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activity_log: {
        Row: {
          action: string
          activity_type: string
          course_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          item_id: string | null
          item_type: string | null
          metadata: Json | null
          student_id: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          activity_type: string
          course_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          item_id?: string | null
          item_type?: string | null
          metadata?: Json | null
          student_id: string
          tenant_id?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          activity_type?: string
          course_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          item_id?: string | null
          item_type?: string | null
          metadata?: Json | null
          student_id?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_adaptive_recommendations: {
        Row: {
          acted_at: string | null
          created_at: string | null
          id: string
          message: string | null
          quiz_attempt_id: string | null
          recommendation_type: string
          rule_id: string | null
          status: string | null
          student_id: string | null
          target_id: string | null
          target_title: string | null
          tenant_id: string
        }
        Insert: {
          acted_at?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          quiz_attempt_id?: string | null
          recommendation_type: string
          rule_id?: string | null
          status?: string | null
          student_id?: string | null
          target_id?: string | null
          target_title?: string | null
          tenant_id?: string
        }
        Update: {
          acted_at?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          quiz_attempt_id?: string | null
          recommendation_type?: string
          rule_id?: string | null
          status?: string | null
          student_id?: string | null
          target_id?: string | null
          target_title?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_adaptive_recommendations_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_adaptive_recommendations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "adaptive_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_adaptive_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_adaptive_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_bookmarks: {
        Row: {
          bookmark_id: string
          bookmark_type: string
          created_at: string | null
          folder: string | null
          id: string
          notes: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          bookmark_id: string
          bookmark_type: string
          created_at?: string | null
          folder?: string | null
          id?: string
          notes?: string | null
          student_id: string
          tenant_id?: string
        }
        Update: {
          bookmark_id?: string
          bookmark_type?: string
          created_at?: string | null
          folder?: string | null
          id?: string
          notes?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_bookmarks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bookmarks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_calendar_events: {
        Row: {
          all_day: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          end_datetime: string | null
          event_type: string
          id: string
          is_synced: boolean | null
          location: string | null
          recurrence_rule: string | null
          reminder_minutes: number[] | null
          source_id: string | null
          source_type: string | null
          start_datetime: string
          student_id: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type: string
          id?: string
          is_synced?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number[] | null
          source_id?: string | null
          source_type?: string | null
          start_datetime: string
          student_id: string
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: string
          id?: string
          is_synced?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number[] | null
          source_id?: string | null
          source_type?: string | null
          start_datetime?: string
          student_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_calendar_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chat_blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          tenant_id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          tenant_id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_chat_blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_blocked_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chat_members: {
        Row: {
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          member_role: string
          room_id: string
          tenant_id: string
          unread_count: number
          user_id: string
        }
        Insert: {
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          member_role?: string
          room_id: string
          tenant_id?: string
          unread_count?: number
          user_id: string
        }
        Update: {
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          member_role?: string
          room_id?: string
          tenant_id?: string
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "student_chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chat_messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_deleted: boolean
          message_type: string
          reply_to_id: string | null
          room_id: string
          sender_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          message_type?: string
          reply_to_id?: string | null
          room_id: string
          sender_id: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          message_type?: string
          reply_to_id?: string | null
          room_id?: string
          sender_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "student_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "student_chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chat_rooms: {
        Row: {
          avatar_url: string | null
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean
          last_message_at: string | null
          name: string | null
          room_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          name?: string | null
          room_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          name?: string | null
          room_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_chat_rooms_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chat_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_competencies: {
        Row: {
          competency_id: string | null
          current_level: number | null
          evidence: Json | null
          id: string
          student_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          competency_id?: string | null
          current_level?: number | null
          evidence?: Json | null
          id?: string
          student_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          competency_id?: string | null
          current_level?: number | null
          evidence?: Json | null
          id?: string
          student_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competencies_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          content: string
          content_position: Json | null
          course_id: string | null
          created_at: string | null
          highlight_color: string | null
          id: string
          is_private: boolean | null
          lesson_id: string | null
          student_id: string
          tags: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          content_position?: Json | null
          course_id?: string | null
          created_at?: string | null
          highlight_color?: string | null
          id?: string
          is_private?: boolean | null
          lesson_id?: string | null
          student_id: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_position?: Json | null
          course_id?: string | null
          created_at?: string | null
          highlight_color?: string | null
          id?: string
          is_private?: boolean | null
          lesson_id?: string | null
          student_id?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_risk_indicators: {
        Row: {
          attendance_rate: number | null
          calculated_at: string | null
          confidence: number | null
          course_id: string | null
          engagement_score: number | null
          expires_at: string | null
          id: string
          last_activity_at: string | null
          metadata: Json | null
          performance_score: number | null
          predicted_grade: string | null
          risk_factors: Json | null
          risk_level: string
          risk_score: number
          student_id: string
          tenant_id: string
        }
        Insert: {
          attendance_rate?: number | null
          calculated_at?: string | null
          confidence?: number | null
          course_id?: string | null
          engagement_score?: number | null
          expires_at?: string | null
          id?: string
          last_activity_at?: string | null
          metadata?: Json | null
          performance_score?: number | null
          predicted_grade?: string | null
          risk_factors?: Json | null
          risk_level: string
          risk_score: number
          student_id: string
          tenant_id?: string
        }
        Update: {
          attendance_rate?: number | null
          calculated_at?: string | null
          confidence?: number | null
          course_id?: string | null
          engagement_score?: number | null
          expires_at?: string | null
          id?: string
          last_activity_at?: string | null
          metadata?: Json | null
          performance_score?: number | null
          predicted_grade?: string | null
          risk_factors?: Json | null
          risk_level?: string
          risk_score?: number
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_risk_indicators_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_risk_indicators_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_risk_indicators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_risk_scores: {
        Row: {
          calculated_at: string | null
          course_id: string | null
          created_at: string | null
          factors: Json
          id: string
          risk_level: string
          risk_score: number
          student_id: string
          tenant_id: string
        }
        Insert: {
          calculated_at?: string | null
          course_id?: string | null
          created_at?: string | null
          factors?: Json
          id?: string
          risk_level: string
          risk_score: number
          student_id: string
          tenant_id?: string
        }
        Update: {
          calculated_at?: string | null
          course_id?: string | null
          created_at?: string | null
          factors?: Json
          id?: string
          risk_level?: string
          risk_score?: number
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_risk_scores_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_risk_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_risk_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_study_sessions: {
        Row: {
          course_id: string | null
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          focus_score: number | null
          id: string
          lesson_id: string | null
          notes: string | null
          start_time: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          focus_score?: number | null
          id?: string
          lesson_id?: string | null
          notes?: string | null
          start_time?: string
          student_id: string
          tenant_id?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          focus_score?: number | null
          id?: string
          lesson_id?: string | null
          notes?: string | null
          start_time?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_study_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_study_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_study_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_study_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_todos: {
        Row: {
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_synced: boolean | null
          priority: string | null
          source_id: string | null
          source_type: string | null
          status: string | null
          student_id: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_synced?: boolean | null
          priority?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          student_id: string
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_synced?: boolean | null
          priority?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          student_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_todos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_todos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_todos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_datetime: string | null
          group_id: string
          id: string
          location: string | null
          meeting_link: string | null
          start_datetime: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_datetime?: string | null
          group_id: string
          id?: string
          location?: string | null
          meeting_link?: string | null
          start_datetime: string
          tenant_id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_datetime?: string | null
          group_id?: string
          id?: string
          location?: string | null
          meeting_link?: string | null
          start_datetime?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          last_active_at: string | null
          nickname: string | null
          notifications_enabled: boolean | null
          role: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          nickname?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          student_id: string
          tenant_id?: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          nickname?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          group_id: string
          id: string
          is_pinned: boolean | null
          message_type: string | null
          reply_to_id: string | null
          sender_id: string
          tenant_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          group_id: string
          id?: string
          is_pinned?: boolean | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id: string
          tenant_id?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          group_id?: string
          id?: string
          is_pinned?: boolean | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "study_group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          avatar_url: string | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          join_code: string | null
          max_members: number | null
          name: string
          settings: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          join_code?: string | null
          max_members?: number | null
          name: string
          settings?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          join_code?: string | null
          max_members?: number | null
          name?: string
          settings?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          estimated_duration: string | null
          id: string
          is_global: boolean | null
          learning_objectives: string[] | null
          order: number
          published: boolean | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_global?: boolean | null
          learning_objectives?: string[] | null
          order?: number
          published?: boolean | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: string | null
          id?: string
          is_global?: boolean | null
          learning_objectives?: string[] | null
          order?: number
          published?: boolean | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supported_locales: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_rtl: boolean | null
          name: string
          native_name: string
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_rtl?: boolean | null
          name: string
          native_name: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_rtl?: boolean | null
          name?: string
          native_name?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supported_locales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_analytics: {
        Row: {
          avg_completion_time: number | null
          completion_rate: number | null
          created_at: string | null
          id: string
          last_computed_at: string | null
          nps_score: number | null
          question_stats: Json | null
          response_count: number | null
          survey_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          avg_completion_time?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          last_computed_at?: string | null
          nps_score?: number | null
          question_stats?: Json | null
          response_count?: number | null
          survey_id: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          avg_completion_time?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          last_computed_at?: string | null
          nps_score?: number | null
          question_stats?: Json | null
          response_count?: number | null
          survey_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_analytics_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: true
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          category: string | null
          conditional_logic: Json | null
          created_at: string | null
          description: string | null
          id: string
          options: Json | null
          order: number | null
          question_text: string
          required: boolean | null
          survey_id: string
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          conditional_logic?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          options?: Json | null
          order?: number | null
          question_text: string
          required?: boolean | null
          survey_id: string
          tenant_id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          conditional_logic?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          options?: Json | null
          order?: number | null
          question_text?: string
          required?: boolean | null
          survey_id?: string
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json | null
          completion_time: number | null
          course_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          respondent_id: string | null
          started_at: string | null
          status: string | null
          submitted_at: string | null
          survey_id: string
          tenant_id: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          answers?: Json | null
          completion_time?: number | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          respondent_id?: string | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          survey_id: string
          tenant_id?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          answers?: Json | null
          completion_time?: number | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          respondent_id?: string | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          survey_id?: string
          tenant_id?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_templates: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          questions: Json
          survey_type: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          questions: Json
          survey_type?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          questions?: Json
          survey_type?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          allow_multiple_responses: boolean | null
          available_from: string | null
          available_until: string | null
          course_id: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          instructions: string | null
          is_anonymous: boolean | null
          lesson_id: string | null
          published: boolean | null
          randomize_questions: boolean | null
          show_progress_bar: boolean | null
          survey_type: string | null
          tenant_id: string
          thank_you_message: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_multiple_responses?: boolean | null
          available_from?: string | null
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          is_anonymous?: boolean | null
          lesson_id?: string | null
          published?: boolean | null
          randomize_questions?: boolean | null
          show_progress_bar?: boolean | null
          survey_type?: string | null
          tenant_id?: string
          thank_you_message?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_multiple_responses?: boolean | null
          available_from?: string | null
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          is_anonymous?: boolean | null
          lesson_id?: string | null
          published?: boolean | null
          randomize_questions?: boolean | null
          show_progress_bar?: boolean | null
          survey_type?: string | null
          tenant_id?: string
          thank_you_message?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          role: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          role?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          role?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          credit_transfer_accept_enabled: boolean
          credit_transfer_issue_enabled: boolean
          custom_domain: string | null
          id: string
          max_users: number | null
          name: string
          personalised_courses_enabled: boolean
          plan: string | null
          regional_catalogue_consume_enabled: boolean
          regional_catalogue_publish_enabled: boolean
          settings: Json | null
          slug: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credit_transfer_accept_enabled?: boolean
          credit_transfer_issue_enabled?: boolean
          custom_domain?: string | null
          id?: string
          max_users?: number | null
          name: string
          personalised_courses_enabled?: boolean
          plan?: string | null
          regional_catalogue_consume_enabled?: boolean
          regional_catalogue_publish_enabled?: boolean
          settings?: Json | null
          slug: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credit_transfer_accept_enabled?: boolean
          credit_transfer_issue_enabled?: boolean
          custom_domain?: string | null
          id?: string
          max_users?: number | null
          name?: string
          personalised_courses_enabled?: boolean
          plan?: string | null
          regional_catalogue_consume_enabled?: boolean
          regional_catalogue_publish_enabled?: boolean
          settings?: Json | null
          slug?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          course_data: Json
          created_at: string
          generated_at: string
          gpa: number | null
          id: string
          pdf_url: string | null
          student_id: string
          tenant_id: string
          total_credits: number | null
          updated_at: string
        }
        Insert: {
          course_data?: Json
          created_at?: string
          generated_at?: string
          gpa?: number | null
          id?: string
          pdf_url?: string | null
          student_id: string
          tenant_id?: string
          total_credits?: number | null
          updated_at?: string
        }
        Update: {
          course_data?: Json
          created_at?: string
          generated_at?: string
          gpa?: number | null
          id?: string
          pdf_url?: string | null
          student_id?: string
          tenant_id?: string
          total_credits?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          created_by: string | null
          field_name: string
          id: string
          locale: string
          tenant_id: string
          translation: string
          updated_at: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          created_by?: string | null
          field_name: string
          id?: string
          locale: string
          tenant_id?: string
          translation: string
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          created_by?: string | null
          field_name?: string
          id?: string
          locale?: string
          tenant_id?: string
          translation?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_assertion: Json | null
          badge_id: string
          course_id: string | null
          created_at: string
          evidence_url: string | null
          id: string
          issued_at: string
          tenant_id: string
          updated_at: string
          user_id: string
          verification_url: string | null
        }
        Insert: {
          badge_assertion?: Json | null
          badge_id: string
          course_id?: string | null
          created_at?: string
          evidence_url?: string | null
          id?: string
          issued_at?: string
          tenant_id?: string
          updated_at?: string
          user_id: string
          verification_url?: string | null
        }
        Update: {
          badge_assertion?: Json | null
          badge_id?: string
          course_id?: string | null
          created_at?: string
          evidence_url?: string | null
          id?: string
          issued_at?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_oauth_identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          last_login_at: string | null
          provider_subject: string
          provider_type: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          provider_subject: string
          provider_type: string
          tenant_id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          provider_subject?: string
          provider_type?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_oauth_identities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_oauth_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar: string | null
          bio: string | null
          created_at: string | null
          id: string
          learning_preferences: Json | null
          locale: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          learning_preferences?: Json | null
          locale?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          learning_preferences?: Json | null
          locale?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          gender: string | null
          id: string
          locale: string | null
          name: string
          role: string
          student_id: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          gender?: string | null
          id?: string
          locale?: string | null
          name: string
          role: string
          student_id?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          gender?: string | null
          id?: string
          locale?: string | null
          name?: string
          role?: string
          student_id?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      video_captions: {
        Row: {
          auto_generated: boolean | null
          caption_content: string | null
          caption_format: string
          caption_url: string
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string | null
          language: string
          lesson_id: string | null
          tenant_id: string
          updated_at: string | null
          uploaded_by: string | null
          video_url: string
        }
        Insert: {
          auto_generated?: boolean | null
          caption_content?: string | null
          caption_format?: string
          caption_url: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          language?: string
          lesson_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
          video_url: string
        }
        Update: {
          auto_generated?: boolean | null
          caption_content?: string | null
          caption_format?: string
          caption_url?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          language?: string
          lesson_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_captions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_captions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_captions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comments: {
        Row: {
          author_id: string
          body: string
          course_id: string | null
          created_at: string | null
          id: string
          is_edited: boolean | null
          lesson_id: string
          parent_id: string | null
          tenant_id: string
          updated_at: string | null
          video_timestamp: number | null
        }
        Insert: {
          author_id: string
          body: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          lesson_id: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          video_timestamp?: number | null
        }
        Update: {
          author_id?: string
          body?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          lesson_id?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          video_timestamp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      video_conferences: {
        Row: {
          bbb_attendee_pw: string | null
          bbb_meeting_id: string | null
          bbb_moderator_pw: string | null
          cohort_id: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          google_meet_link: string | null
          id: string
          instructor_id: string | null
          lesson_id: string | null
          max_participants: number | null
          meeting_id: string
          meeting_password: string | null
          meeting_url: string
          recording_enabled: boolean | null
          scheduled_at: string | null
          status: string | null
          tenant_id: string
          timezone: string | null
          title: string
          updated_at: string | null
          video_provider: string | null
          waiting_room_enabled: boolean | null
        }
        Insert: {
          bbb_attendee_pw?: string | null
          bbb_meeting_id?: string | null
          bbb_moderator_pw?: string | null
          cohort_id?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          google_meet_link?: string | null
          id?: string
          instructor_id?: string | null
          lesson_id?: string | null
          max_participants?: number | null
          meeting_id: string
          meeting_password?: string | null
          meeting_url: string
          recording_enabled?: boolean | null
          scheduled_at?: string | null
          status?: string | null
          tenant_id?: string
          timezone?: string | null
          title: string
          updated_at?: string | null
          video_provider?: string | null
          waiting_room_enabled?: boolean | null
        }
        Update: {
          bbb_attendee_pw?: string | null
          bbb_meeting_id?: string | null
          bbb_moderator_pw?: string | null
          cohort_id?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          google_meet_link?: string | null
          id?: string
          instructor_id?: string | null
          lesson_id?: string | null
          max_participants?: number | null
          meeting_id?: string
          meeting_password?: string | null
          meeting_url?: string
          recording_enabled?: boolean | null
          scheduled_at?: string | null
          status?: string | null
          tenant_id?: string
          timezone?: string | null
          title?: string
          updated_at?: string | null
          video_provider?: string | null
          waiting_room_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "video_conferences_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_conferences_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_conferences_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_conferences_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_conferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notifications: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message: string
          notification_id: string | null
          phone_number: string
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string | null
          template_name: string | null
          template_params: Json | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          notification_id?: string | null
          phone_number: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          template_params?: Json | null
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          notification_id?: string | null
          phone_number?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          template_params?: Json | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboard_versions: {
        Row: {
          app_state: Json | null
          created_at: string | null
          elements: Json
          frames: Json | null
          id: string
          label: string | null
          saved_by: string
          thumbnail_url: string | null
          whiteboard_id: string
        }
        Insert: {
          app_state?: Json | null
          created_at?: string | null
          elements: Json
          frames?: Json | null
          id?: string
          label?: string | null
          saved_by: string
          thumbnail_url?: string | null
          whiteboard_id: string
        }
        Update: {
          app_state?: Json | null
          created_at?: string | null
          elements?: Json
          frames?: Json | null
          id?: string
          label?: string | null
          saved_by?: string
          thumbnail_url?: string | null
          whiteboard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_versions_saved_by_fkey"
            columns: ["saved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboard_versions_whiteboard_id_fkey"
            columns: ["whiteboard_id"]
            isOneToOne: false
            referencedRelation: "whiteboards"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboards: {
        Row: {
          app_state: Json | null
          archived: boolean | null
          auto_snapshot: boolean | null
          collaboration: string
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          elements: Json
          frames: Json | null
          id: string
          is_template: boolean | null
          lesson_id: string | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          app_state?: Json | null
          archived?: boolean | null
          auto_snapshot?: boolean | null
          collaboration?: string
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          elements?: Json
          frames?: Json | null
          id?: string
          is_template?: boolean | null
          lesson_id?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          app_state?: Json | null
          archived?: boolean | null
          auto_snapshot?: boolean | null
          collaboration?: string
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          elements?: Json
          frames?: Json | null
          id?: string
          is_template?: boolean | null
          lesson_id?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboards_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_engagement_score: {
        Args: { p_course_id: string; p_date: string; p_student_id: string }
        Returns: number
      }
      calculate_learning_path_progress: {
        Args: { p_learning_path_id: string; p_student_id: string }
        Returns: number
      }
      check_lesson_prerequisites: {
        Args: { p_lesson_id: string; p_student_id: string }
        Returns: Json
      }
      cleanup_expired_ai_context: { Args: never; Returns: number }
      cleanup_old_cron_runs: { Args: never; Returns: undefined }
      compute_survey_analytics: {
        Args: { p_survey_id: string }
        Returns: undefined
      }
      current_tenant_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      generate_group_join_code: { Args: never; Returns: string }
      get_accessibility_score: {
        Args: { p_content_id: string; p_content_type: string }
        Returns: number
      }
      get_category_descendants: {
        Args: { parent_category_id: string }
        Returns: {
          id: string
        }[]
      }
      get_category_path: {
        Args: { category_id: string }
        Returns: {
          id: string
          level: number
          name: string
          slug: string
        }[]
      }
      get_translation: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_fallback?: string
          p_field_name: string
          p_locale: string
        }
        Returns: string
      }
      get_user_ai_usage_today: {
        Args: { user_uuid: string }
        Returns: {
          api_calls: number
          cost_usd: number
          tokens_used: number
        }[]
      }
      get_video_captions: {
        Args: { p_video_url: string }
        Returns: {
          caption_url: string
          id: string
          is_default: boolean
          label: string
          language: string
        }[]
      }
      health_check: { Args: never; Returns: Json }
      is_section_instructor: {
        Args: { p_class_id: string; p_user_id: string }
        Returns: boolean
      }
      set_tenant_context: { Args: { p_tenant_id: string }; Returns: undefined }
      sync_student_calendar_from_deadlines: {
        Args: { p_student_id: string }
        Returns: number
      }
      sync_student_todos_from_deadlines: {
        Args: { p_student_id: string }
        Returns: number
      }
      update_ai_usage: {
        Args: {
          additional_calls?: number
          additional_cost?: number
          additional_tokens?: number
          user_uuid: string
        }
        Returns: undefined
      }
      update_overdue_todos: { Args: never; Returns: number }
      update_student_competency: {
        Args: {
          p_competency_id: string
          p_score: number
          p_source_id: string
          p_source_type: string
          p_student_id: string
        }
        Returns: undefined
      }
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
