import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequest {
  source_id: string
  test_mode?: boolean
}

interface ExpenseData {
  date: string
  amount: number
  description: string
  category: string
  department?: string
  supplier?: string
  employee?: string
  vehicle?: string
  item?: string
  type?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { source_id, test_mode = false }: ImportRequest = await req.json()

    if (!source_id) {
      throw new Error('source_id is required')
    }

    // Get the expense source configuration
    const { data: source, error: sourceError } = await supabaseClient
      .from('expense_sources')
      .select('*')
      .eq('id', source_id)
      .single()

    if (sourceError || !source) {
      throw new Error(`Source not found: ${sourceError?.message}`)
    }

    if (!source.is_active) {
      throw new Error('Source is not active')
    }

    // Fetch data from Google Sheets
    const sheetData = await fetchGoogleSheetsData(source)
    
    // Parse the data according to column mapping
    const parsedData = parseSheetData(sheetData, source)

    if (test_mode) {
      // Return test results without importing
      return new Response(
        JSON.stringify({
          success: true,
          test_mode: true,
          preview_count: Math.min(parsedData.length, 5),
          total_count: parsedData.length,
          preview_data: parsedData.slice(0, 5),
          source_info: {
            category: source.category,
            sheet_name: source.sheet_name,
            range: `${source.range_start}:${source.range_end || ''}`
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Create import log entry
    const { data: importLog, error: logError } = await supabaseClient
      .from('import_logs')
      .insert({
        source_id: source.id,
        status: 'processing',
        total_records: parsedData.length,
        processed_records: 0,
        error_records: 0,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      throw new Error(`Failed to create import log: ${logError.message}`)
    }

    // Process and import expenses
    let processedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const expenseData of parsedData) {
      try {
        // Generate hash for duplicate detection
        const hash = await generateExpenseHash(expenseData, source.id)
        
        // Check for existing expense with same hash
        const { data: existing } = await supabaseClient
          .from('expenses')
          .select('id')
          .eq('import_hash', hash)
          .single()

        if (existing) {
          // Skip duplicate
          continue
        }

        // Insert new expense
        const { error: insertError } = await supabaseClient
          .from('expenses')
          .insert({
            source: 'google_sheets',
            date: expenseData.date,
            amount: expenseData.amount,
            currency: 'RUB',
            department: expenseData.department || '',
            supplier: expenseData.supplier || '',
            category: expenseData.category,
            description: expenseData.description,
            import_hash: hash,
            source_id: source.id,
            metadata: {
              employee: expenseData.employee,
              vehicle: expenseData.vehicle,
              item: expenseData.item,
              type: expenseData.type
            }
          })

        if (insertError) {
          errorCount++
          errors.push(`Row ${processedCount + 1}: ${insertError.message}`)
        } else {
          processedCount++
        }
      } catch (error) {
        errorCount++
        errors.push(`Row ${processedCount + 1}: ${error.message}`)
      }
    }

    // Update import log
    await supabaseClient
      .from('import_logs')
      .update({
        status: errorCount > 0 ? 'completed_with_errors' : 'completed',
        processed_records: processedCount,
        error_records: errorCount,
        completed_at: new Date().toISOString(),
        error_details: errors.length > 0 ? { errors } : null
      })
      .eq('id', importLog.id)

    return new Response(
      JSON.stringify({
        success: true,
        import_log_id: importLog.id,
        total_records: parsedData.length,
        processed_records: processedCount,
        error_records: errorCount,
        errors: errors.slice(0, 10) // Limit error details
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function fetchGoogleSheetsData(source: any): Promise<string[][]> {
  const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')
  if (!apiKey) {
    throw new Error('Google Sheets API key not configured')
  }

  // Extract spreadsheet ID from URL
  const match = source.sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!match) {
    throw new Error('Invalid Google Sheets URL')
  }
  
  const spreadsheetId = match[1]
  const sheetName = source.sheet_name || 'Sheet1'
  const range = source.range_end 
    ? `${source.range_start}:${source.range_end}`
    : source.range_start

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!' + range)}?key=${apiKey}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.values || []
}

function parseSheetData(rawData: string[][], source: any): ExpenseData[] {
  if (!rawData || rawData.length === 0) {
    return []
  }

  const results: ExpenseData[] = []
  const columnMapping = source.column_mapping || {}

  // Convert column letters to indices
  const columnIndices: Record<string, number> = {}
  Object.entries(columnMapping).forEach(([field, column]) => {
    columnIndices[field] = columnLetterToIndex(column as string)
  })

  for (const row of rawData) {
    try {
      const expenseData: ExpenseData = {
        date: parseDate(row[columnIndices.date] || ''),
        amount: parseAmount(row[columnIndices.amount] || '0'),
        description: row[columnIndices.description] || '',
        category: source.category,
        department: row[columnIndices.department] || '',
        supplier: row[columnIndices.supplier] || '',
        employee: row[columnIndices.employee] || '',
        vehicle: row[columnIndices.vehicle] || '',
        item: row[columnIndices.item] || '',
        type: row[columnIndices.type] || ''
      }

      // Skip rows with invalid data
      if (!expenseData.date || expenseData.amount <= 0) {
        continue
      }

      results.push(expenseData)
    } catch (error) {
      // Skip invalid rows
      continue
    }
  }

  return results
}

function columnLetterToIndex(letter: string): number {
  let result = 0
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
  }
  return result - 1
}

function parseDate(dateStr: string): string {
  if (!dateStr) return ''
  
  // Try different date formats
  const formats = [
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/ // MM/DD/YYYY
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      if (format === formats[0]) { // DD.MM.YYYY
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
      } else if (format === formats[1]) { // YYYY-MM-DD
        return dateStr
      } else if (format === formats[2]) { // MM/DD/YYYY
        return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
      }
    }
  }

  throw new Error(`Invalid date format: ${dateStr}`)
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0
  
  // Remove currency symbols and spaces
  const cleaned = amountStr.replace(/[^\d.,\-]/g, '')
  
  // Handle different decimal separators
  const normalized = cleaned.replace(',', '.')
  
  const amount = parseFloat(normalized)
  return isNaN(amount) ? 0 : Math.abs(amount)
}

async function generateExpenseHash(data: ExpenseData, sourceId: string): Promise<string> {
  const hashInput = `${sourceId}-${data.date}-${data.amount}-${data.description}`
  try {
    const encoder = new TextEncoder()
    const data_bytes = encoder.encode(hashInput)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data_bytes)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
  } catch {
    // Fallback to btoa if crypto fails
    return btoa(hashInput).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  }
}