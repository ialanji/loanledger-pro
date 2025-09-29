// Database types for PostgreSQL integration
// Adapted from Supabase types for direct SQL queries

// Base table interfaces for PostgreSQL
export interface Expense {
  id: string
  amount: number
  currency: string
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
  row_hash: string | null
  import_hash: string | null
  source_id: string | null
  metadata: Record<string, any> | null
}

export interface ExpenseInsert {
  id?: string
  amount: number
  currency?: string
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
  row_hash?: string | null
  import_hash?: string | null
  source_id?: string | null
  metadata?: Record<string, any> | null
}

export interface ExpenseUpdate {
  id?: string
  amount?: number
  currency?: string
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
  row_hash?: string | null
  import_hash?: string | null
  source_id?: string | null
  metadata?: Record<string, any> | null
}

export interface ExpenseSource {
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

export interface ExpenseSourceInsert {
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

export interface ExpenseSourceUpdate {
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

export interface ImportLog {
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

export interface ImportLogInsert {
  id?: string
  source_id: string
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

export interface ImportLogUpdate {
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

export interface ImportCursor {
  source: string
  last_row_index: number
  last_import_date: string
  sheet_version: string | null
  metadata: Record<string, any> | null
}

export interface ImportCursorInsert {
  source: string
  last_row_index?: number
  last_import_date?: string
  sheet_version?: string | null
  metadata?: Record<string, any> | null
}

export interface ImportCursorUpdate {
  source?: string
  last_row_index?: number
  last_import_date?: string
  sheet_version?: string | null
  metadata?: Record<string, any> | null
}

// Additional types for UI components (unchanged from Supabase version)
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

// PostgreSQL specific types for query results
export interface QueryResult<T = any> {
  rows: T[]
  rowCount: number
  command: string
}

export interface TransactionClient {
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>
  release: () => void
}

// Utility types for PostgreSQL operations
export type TableName = 'expenses' | 'expense_sources' | 'import_logs' | 'import_cursors'

export interface WhereClause {
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN'
  value: any
}

export interface OrderByClause {
  column: string
  direction: 'ASC' | 'DESC'
}

export interface QueryOptions {
  where?: WhereClause[]
  orderBy?: OrderByClause[]
  limit?: number
  offset?: number
}