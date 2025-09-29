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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      banks: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          default_calculation_method: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          default_calculation_method?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          default_calculation_method?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_rates: {
        Row: {
          annual_percent: number
          created_at: string
          credit_id: string
          effective_date: string
          id: string
          note: string | null
        }
        Insert: {
          annual_percent: number
          created_at?: string
          credit_id: string
          effective_date: string
          id?: string
          note?: string | null
        }
        Update: {
          annual_percent?: number
          created_at?: string
          credit_id?: string
          effective_date?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_rates_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          bank_id: string | null
          contract_number: string
          created_at: string
          currency: string
          deferment_mode: string
          deferment_months: number
          id: string
          method: string
          payment_day: number
          principal: number
          start_date: string
          status: string
          term_months: number
          updated_at: string
        }
        Insert: {
          bank_id?: string | null
          contract_number: string
          created_at?: string
          currency?: string
          deferment_mode?: string
          deferment_months?: number
          id?: string
          method: string
          payment_day: number
          principal: number
          start_date: string
          status?: string
          term_months: number
          updated_at?: string
        }
        Update: {
          bank_id?: string | null
          contract_number?: string
          created_at?: string
          currency?: string
          deferment_mode?: string
          deferment_months?: number
          id?: string
          method?: string
          payment_day?: number
          principal?: number
          start_date?: string
          status?: string
          term_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string
          credit_id: string
          due_date: string
          id: string
          interest_due: number
          paid_amount: number | null
          paid_at: string | null
          period_number: number
          principal_due: number
          recalculated_version: number
          remaining_balance: number
          status: string
          total_due: number
        }
        Insert: {
          created_at?: string
          credit_id: string
          due_date: string
          id?: string
          interest_due?: number
          paid_amount?: number | null
          paid_at?: string | null
          period_number: number
          principal_due?: number
          recalculated_version?: number
          remaining_balance?: number
          status?: string
          total_due?: number
        }
        Update: {
          created_at?: string
          credit_id?: string
          due_date?: string
          id?: string
          interest_due?: number
          paid_amount?: number | null
          paid_at?: string | null
          period_number?: number
          principal_due?: number
          recalculated_version?: number
          remaining_balance?: number
          status?: string
          total_due?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      principal_adjustments: {
        Row: {
          amount: number
          created_at: string
          credit_id: string
          effective_date: string
          id: string
          note: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          credit_id: string
          effective_date: string
          id?: string
          note?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          credit_id?: string
          effective_date?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "principal_adjustments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          id: string
          source: string
          run_id: string
          started_at: string
          finished_at: string | null
          status: string
          rows_imported: number | null
          error: string | null
          details: Json | null
        }
        Insert: {
          id?: string
          source: string
          run_id: string
          started_at?: string
          finished_at?: string | null
          status?: string
          rows_imported?: number | null
          error?: string | null
          details?: Json | null
        }
        Update: {
          id?: string
          source?: string
          run_id?: string
          started_at?: string
          finished_at?: string | null
          status?: string
          rows_imported?: number | null
          error?: string | null
          details?: Json | null
        }
        Relationships: []
      }
      import_cursors: {
        Row: {
          id: string
          source: string
          last_row_index: number | null
          last_date: string | null
          last_run_at: string | null
          cursor: Json | null
        }
        Insert: {
          id?: string
          source: string
          last_row_index?: number | null
          last_date?: string | null
          last_run_at?: string | null
          cursor?: Json | null
        }
        Update: {
          id?: string
          source?: string
          last_row_index?: number | null
          last_date?: string | null
          last_run_at?: string | null
          cursor?: Json | null
        }
        Relationships: []
      }
      dept_aliases: {
        Row: {
          id: string
          raw: string
          canonical: string
          created_at: string
        }
        Insert: {
          id?: string
          raw: string
          canonical: string
          created_at?: string
        }
        Update: {
          id?: string
          raw?: string
          canonical?: string
          created_at?: string
        }
        Relationships: []
      }
      supplier_aliases: {
        Row: {
          id: string
          raw: string
          canonical: string
          created_at: string
        }
        Insert: {
          id?: string
          raw: string
          canonical: string
          created_at?: string
        }
        Update: {
          id?: string
          raw?: string
          canonical?: string
          created_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          source: string
          date: string
          amount: number
          currency: string
          department: string | null
          supplier: string | null
          category: string
          description: string | null
          meta: Json | null
          row_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          source: string
          date: string
          amount: number
          currency?: string
          department?: string | null
          supplier?: string | null
          category: string
          description?: string | null
          meta?: Json | null
          row_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          source?: string
          date?: string
          amount?: number
          currency?: string
          department?: string | null
          supplier?: string | null
          category?: string
          description?: string | null
          meta?: Json | null
          row_hash?: string
          created_at?: string
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
