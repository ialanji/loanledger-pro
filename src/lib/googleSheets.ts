import { ExpenseSource, ImportTestResult } from '@/types/database.types'

// Google Sheets API configuration
const GOOGLE_SHEETS_API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || ''
const GOOGLE_SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets'

interface SheetData {
  values: string[][]
}

interface ParsedExpenseData {
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

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

/**
 * Build Google Sheets API URL for reading data
 */
function buildSheetsApiUrl(
  spreadsheetId: string, 
  sheetName: string = 'Sheet1', 
  range?: string
): string {
  const sheetRange = range ? `${sheetName}!${range}` : sheetName
  return `${GOOGLE_SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(sheetRange)}?key=${GOOGLE_SHEETS_API_KEY}`
}

/**
 * Fetch data from Google Sheets
 */
export async function fetchSheetData(
  spreadsheetId: string,
  sheetName: string = 'Sheet1',
  range?: string
): Promise<SheetData> {
  if (!GOOGLE_SHEETS_API_KEY) {
    throw new Error('Google Sheets API key not configured')
  }

  const url = buildSheetsApiUrl(spreadsheetId, sheetName, range)
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied. Check API key and sheet permissions.')
      }
      if (response.status === 404) {
        throw new Error('Spreadsheet or sheet not found.')
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      values: data.values || []
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch sheet data')
  }
}

/**
 * Parse raw sheet data according to column mapping
 */
export function parseSheetData(
  rawData: string[][],
  columnMapping: Record<string, string>,
  category: string
): ParsedExpenseData[] {
  if (!rawData || rawData.length === 0) {
    return []
  }

  const results: ParsedExpenseData[] = []

  // Convert column letters to indices
  const columnIndices: Record<string, number> = {}
  Object.entries(columnMapping).forEach(([field, column]) => {
    columnIndices[field] = columnLetterToIndex(column as string)
  })

  rawData.forEach((row, rowIndex) => {
    try {
      // Skip empty rows
      if (!row || row.every(cell => !cell || cell.trim() === '')) {
        return
      }

      const parsedRow: ParsedExpenseData = {
        date: '',
        amount: 0,
        description: '',
        category
      }

      // Map columns to fields
      Object.entries(columnIndices).forEach(([field, colIndex]) => {
        const cellValue = row[colIndex]?.toString().trim() || ''
        
        switch (field) {
          case 'date':
            parsedRow.date = parseDate(cellValue)
            break
          case 'amount':
            parsedRow.amount = parseAmount(cellValue)
            break
          case 'description':
            parsedRow.description = cellValue
            break
          case 'department':
            parsedRow.department = cellValue
            break
          case 'supplier':
            parsedRow.supplier = cellValue
            break
          case 'employee':
            parsedRow.employee = cellValue
            break
          case 'vehicle':
            parsedRow.vehicle = cellValue
            break
          case 'item':
            parsedRow.item = cellValue
            break
          case 'type':
            parsedRow.type = cellValue
            break
        }
      })

      // Validate required fields
      if (parsedRow.date && parsedRow.amount > 0) {
        results.push(parsedRow)
      }
    } catch (error) {
      console.warn(`Error parsing row ${rowIndex + 1}:`, error)
    }
  })

  return results
}

/**
 * Convert column letter (A, B, C, etc.) to zero-based index
 */
function columnLetterToIndex(letter: string): number {
  let result = 0
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
  }
  return result - 1
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return ''

  // Try different date formats
  const formats = [
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      if (format === formats[2]) {
        // YYYY-MM-DD format
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      } else {
        // DD.MM.YYYY or DD/MM/YYYY format
        const day = match[1].padStart(2, '0')
        const month = match[2].padStart(2, '0')
        const year = match[3]
        return `${year}-${month}-${day}`
      }
    }
  }

  // Try parsing as Excel serial date
  const serialDate = parseFloat(dateStr)
  if (!isNaN(serialDate) && serialDate > 25000) {
    const excelEpoch = new Date(1900, 0, 1)
    const date = new Date(excelEpoch.getTime() + (serialDate - 2) * 24 * 60 * 60 * 1000)
    return date.toISOString().split('T')[0]
  }

  return ''
}

/**
 * Parse amount from string, handling various formats
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0

  // Remove currency symbols and spaces
  const cleaned = amountStr
    .replace(/[₽$€£¥]/g, '')
    .replace(/\s/g, '')
    .replace(/,/g, '.')

  const amount = parseFloat(cleaned)
  return isNaN(amount) ? 0 : Math.abs(amount)
}

/**
 * Test import from Google Sheets source
 */
export async function testImportFromSource(source: ExpenseSource): Promise<ImportTestResult> {
  try {
    const spreadsheetId = extractSpreadsheetId(source.sheet_url)
    if (!spreadsheetId) {
      return {
        success: false,
        total_rows: 0,
        preview_data: [],
        errors: ['Invalid Google Sheets URL'],
        warnings: []
      }
    }

    // Build range if specified
    let range: string | undefined
    if (source.range_start) {
      range = source.range_end 
        ? `${source.range_start}:${source.range_end}`
        : source.range_start
    }

    // Fetch data from Google Sheets
    const sheetData = await fetchSheetData(
      spreadsheetId,
      source.sheet_name || 'Sheet1',
      range
    )

    // Parse the data
    const parsedData = parseSheetData(
      sheetData.values,
      source.column_mapping || {},
      source.category
    )

    const errors: string[] = []
    const warnings: string[] = []

    // Validate data
    if (parsedData.length === 0) {
      warnings.push('No valid data rows found')
    }

    // Check for common issues
    const emptyDescriptions = parsedData.filter(row => !row.description).length
    if (emptyDescriptions > 0) {
      warnings.push(`Found ${emptyDescriptions} records with empty descriptions`)
    }

    const zeroAmounts = parsedData.filter(row => row.amount === 0).length
    if (zeroAmounts > 0) {
      warnings.push(`Found ${zeroAmounts} records with zero amounts`)
    }

    const invalidDates = parsedData.filter(row => !row.date).length
    if (invalidDates > 0) {
      errors.push(`Found ${invalidDates} records with invalid dates`)
    }

    return {
      success: errors.length === 0,
      total_rows: parsedData.length,
      preview_data: parsedData.slice(0, 5).map(row => ({
        date: row.date,
        amount: row.amount,
        description: row.description,
        category: row.category,
        department: row.department,
        supplier: row.supplier,
        employee: row.employee
      })),
      errors,
      warnings
    }
  } catch (error) {
    return {
      success: false,
      total_rows: 0,
      preview_data: [],
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      warnings: []
    }
  }
}

/**
 * Import data from Google Sheets source and return parsed expenses
 */
export async function importFromSource(source: ExpenseSource): Promise<ParsedExpenseData[]> {
  const spreadsheetId = extractSpreadsheetId(source.sheet_url)
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL')
  }

  // Build range if specified
  let range: string | undefined
  if (source.range_start) {
    range = source.range_end 
      ? `${source.range_start}:${source.range_end}`
      : source.range_start
  }

  // Fetch data from Google Sheets
  const sheetData = await fetchSheetData(
    spreadsheetId,
    source.sheet_name || 'Sheet1',
    range
  )

  // Parse and return the data
  return parseSheetData(
    sheetData.values,
    source.column_mapping || {},
    source.category
  )
}

/**
 * Validate Google Sheets URL format
 */
export function validateSheetsUrl(url: string): boolean {
  const spreadsheetId = extractSpreadsheetId(url)
  return spreadsheetId !== null && spreadsheetId.length > 0
}

/**
 * Get sheet metadata (for future use)
 */
export async function getSheetMetadata(spreadsheetId: string) {
  if (!GOOGLE_SHEETS_API_KEY) {
    throw new Error('Google Sheets API key not configured')
  }

  const url = `${GOOGLE_SHEETS_BASE_URL}/${spreadsheetId}?key=${GOOGLE_SHEETS_API_KEY}&fields=sheets.properties`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.sheets?.map((sheet: any) => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title,
      index: sheet.properties.index
    })) || []
  } catch (error) {
    throw new Error('Failed to fetch sheet metadata')
  }
}