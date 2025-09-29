import { ParsedExpenseData } from './index'
import { columnLetterToIndex, parseDate, parseAmount, cleanText, generateRowHash } from './parserUtils'

/**
 * Parse general expense data from Google Sheets
 * Expected columns: Date, Amount, Description, Department, Supplier, Category
 */
export function parseGeneralExpenseData(
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
        category: 'general'
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
          case 'category':
            // Override default category if specified in data
            if (cellValue) {
              parsedRow.category = cellValue.toLowerCase()
            }
            break
          case 'type':
            parsedRow.type = cellValue
            break
        }
      })

      // Validate required fields for general expenses
      if (parsedRow.date && parsedRow.amount > 0 && parsedRow.description) {
        // Add general expense metadata
        parsedRow.metadata = {
          expense_type: 'operational',
          processed_at: new Date().toISOString(),
          validation_status: 'auto_validated',
          rowNumber: rowIndex + 1,
          originalRow: row,
          rowHash: generateRowHash(row)
        }
        
        results.push(parsedRow)
      }
    } catch (error) {
      console.warn(`Error parsing general expense row ${rowIndex + 1}:`, error)
    }
  })

  return results
}