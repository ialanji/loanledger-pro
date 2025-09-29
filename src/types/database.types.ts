// Database types for Supabase integration
// Generated and maintained manually for expense management system

export interface Database {
  public: {
    Tables: {
      expenses: {
        Row: {
          id: string
          amount: number
          category: string
          department: string | null
          supplier: string | null
          date: string
          description: string | null
          source: string
          created_at: string
          updated_at: string
          project_id: string | null
          tags: string[] | null
          receipt_url: string | null
          status: string
          import_hash: string | null
          source_id: string | null
          metadata: Record<string, any> | null
        }
        Insert: {
          id?: string
          amount: number
          category: string
          department?: string | null
          supplier?: string | null
          date: string
          description?: string | null
          source?: string
          created_at?: string
          updated_at?: string
          project_id?: string | null
          tags?: string[] | null
          receipt_url?: string | null
          status?: string
          import_hash?: string | null
          source_id?: string | null
          metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          amount?: number
          category?: string
          department?: string | null
          supplier?: string | null
          date?: string
          description?: string | null
          source?: string
          created_at?: string
          updated_at?: string
          project_id?: string | null
          tags?: string[] | null
          receipt_url?: string | null
          status?: string
          import_hash?: string | null
          source_id?: string | null
          metadata?: Record<string, any> | null
        }
      }
      expense_sources: {
        Row: {
          id: string
          category: 'salary' | 'transport' | 'supplies' | 'other'
          sheet_url: string
          import_mode: 'google_sheets' | 'file'
          sheet_name: string | null
          range_start: string
          range_end: string | null
          column_mapping: Record<string, any> | null
          is_active: boolean
          last_import_at: string | null
          created_at: string
          updated_at: string
          import_settings: Record<string, any>
          validation_rules: Record<string, any>
        }
        Insert: {
          id?: string
          category: 'salary' | 'transport' | 'supplies' | 'other'
          sheet_url: string
          import_mode?: 'google_sheets' | 'file'
          sheet_name?: string | null
          range_start?: string
          range_end?: string | null
          column_mapping?: Record<string, any> | null
          is_active?: boolean
          last_import_at?: string | null
          created_at?: string
          updated_at?: string
          import_settings?: Record<string, any>
          validation_rules?: Record<string, any>
        }
        Update: {
          id?: string
          category?: 'salary' | 'transport' | 'supplies' | 'other'
          sheet_url?: string
          import_mode?: 'google_sheets' | 'file'
          sheet_name?: string | null
          range_start?: string
          range_end?: string | null
          column_mapping?: Record<string, any> | null
          is_active?: boolean
          last_import_at?: string | null
          created_at?: string
          updated_at?: string
          import_settings?: Record<string, any>
          validation_rules?: Record<string, any>
        }
      }
      import_logs: {
        Row: {
          id: string
          source_id: string
          status: 'processing' | 'completed' | 'completed_with_errors' | 'failed'
          total_records: number
          processed_records: number
          error_records: number
          started_at: string
          completed_at: string | null
          error_details: Record<string, any> | null
          metadata: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id: string
          status: 'processing' | 'completed' | 'completed_with_errors' | 'failed'
          total_records?: number
          processed_records?: number
          error_records?: number
          started_at?: string
          completed_at?: string | null
          error_details?: Record<string, any> | null
          metadata?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          status?: 'processing' | 'completed' | 'completed_with_errors' | 'failed'
          total_records?: number
          processed_records?: number
          error_records?: number
          started_at?: string
          completed_at?: string | null
          error_details?: Record<string, any> | null
          metadata?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      import_cursors: {
        Row: {
          source: string
          last_row_index: number
          last_import_date: string
          sheet_version: string | null
          metadata: Record<string, any> | null
        }
        Insert: {
          source: string
          last_row_index?: number
          last_import_date?: string
          sheet_version?: string | null
          metadata?: Record<string, any> | null
        }
        Update: {
          source?: string
          last_row_index?: number
          last_import_date?: string
          sheet_version?: string | null
          metadata?: Record<string, any> | null
        }
      }
    }
  }
}

// Type aliases for easier usage
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

export type ExpenseSource = Database['public']['Tables']['expense_sources']['Row']
export type ExpenseSourceInsert = Database['public']['Tables']['expense_sources']['Insert']
export type ExpenseSourceUpdate = Database['public']['Tables']['expense_sources']['Update']

export type ImportLog = Database['public']['Tables']['import_logs']['Row']
export type ImportLogInsert = Database['public']['Tables']['import_logs']['Insert']
export type ImportLogUpdate = Database['public']['Tables']['import_logs']['Update']

export type ImportCursor = Database['public']['Tables']['import_cursors']['Row']
export type ImportCursorInsert = Database['public']['Tables']['import_cursors']['Insert']
export type ImportCursorUpdate = Database['public']['Tables']['import_cursors']['Update']

// Additional types for UI components
export interface ExpenseSourceFormData {
  category: 'salary' | 'transport' | 'supplies' | 'other'
  sheet_url: string
  import_mode: 'google_sheets' | 'file'
  sheet_name?: string
  range_start?: string
  range_end?: string
  column_mapping?: Record<string, string>
  is_active?: boolean
  import_settings?: Record<string, any>
  validation_rules?: Record<string, any>
}

export interface ImportTestResult {
  success: boolean
  total_rows: number
  preview_data: any[]
  errors: string[]
  warnings: string[]
}