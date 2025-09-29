import { ParsedExpenseData } from './index'

/**
 * Parse salary data from Google Sheets
 * Expected columns: Date, Employee, Amount, Department, Description
 */
export function parseSalaryData(
  rawData: string[][],
  columnMapping: Record<string, string>
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
        category: 'salary'
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
          case 'employee':
            parsedRow.employee = cellValue
            break
          case 'department':
            parsedRow.department = cellValue
            break
        }
      })

      // Validate required fields for salary
      if (parsedRow.date && parsedRow.amount > 0 && parsedRow.employee) {
        // Add salary-specific metadata
        parsedRow.metadata = {
          payroll_type: 'regular',
          processed_at: new Date().toISOString()
        }
        
        results.push(parsedRow)
      }
    } catch (error) {
      console.warn(`Error parsing salary row ${rowIndex + 1}:`, error)
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