import { ParsedExpenseData } from './index'
import { columnLetterToIndex, parseDate, parseAmount, cleanText, generateRowHash } from './parserUtils'

/**
 * Parse rechizite (supplies/materials) data from Google Sheets
 * Expected columns: Date, Item, Amount, Quantity, Supplier, Department
 */
export function parseRechiziteData(
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
        category: 'rechizite'
      }

      let quantity = 1
      let unitPrice = 0

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
          case 'item':
            parsedRow.item = cellValue
            parsedRow.description = cellValue // Use item as description
            break
          case 'quantity':
            quantity = parseFloat(cellValue) || 1
            break
          case 'unit_price':
            unitPrice = parseAmount(cellValue)
            break
          case 'supplier':
            parsedRow.supplier = cellValue
            break
          case 'department':
            parsedRow.department = cellValue
            break
          case 'description':
            // Override item description if provided
            if (cellValue) {
              parsedRow.description = cellValue
            }
            break
        }
      })

      // Calculate amount if not provided but unit price and quantity are available
      if (parsedRow.amount === 0 && unitPrice > 0 && quantity > 0) {
        parsedRow.amount = unitPrice * quantity
      }

      // Validate required fields for rechizite
      if (parsedRow.date && parsedRow.amount > 0 && parsedRow.item) {
        // Add rechizite-specific metadata
        parsedRow.metadata = {
          item_type: 'supplies',
          quantity: quantity,
          unit_price: unitPrice || (parsedRow.amount / quantity),
          processed_at: new Date().toISOString(),
          inventory_category: categorizeItem(parsedRow.item),
          rowNumber: rowIndex + 1,
          originalRow: row,
          rowHash: generateRowHash(row)
        }
        
        results.push(parsedRow)
      }
    } catch (error) {
      console.warn(`Error parsing rechizite row ${rowIndex + 1}:`, error)
    }
  })

  return results
}

/**
 * Categorize items based on common supply types
 */
function categorizeItem(itemName: string): string {
  const item = itemName.toLowerCase()
  
  if (item.includes('бумага') || item.includes('paper')) return 'office_supplies'
  if (item.includes('ручка') || item.includes('карандаш') || item.includes('pen')) return 'writing_supplies'
  if (item.includes('компьютер') || item.includes('монитор') || item.includes('клавиатура')) return 'it_equipment'
  if (item.includes('мебель') || item.includes('стол') || item.includes('стул')) return 'furniture'
  if (item.includes('канцелярия')) return 'stationery'
  if (item.includes('техника')) return 'equipment'
  
  return 'general_supplies'
}