import { ParsedExpenseData } from './index'
import { columnLetterToIndex, parseDate, parseAmount, cleanText, generateRowHash } from './parserUtils'

/**
 * Parse Orange telecom bill data from Google Sheets
 * Expected columns: Date, Phone_Number, Amount, Plan_Type, Usage_Minutes, Usage_Data, Employee
 */
export function parseOrangeData(
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
        category: 'orange'
      }

      let phoneNumber = ''
      let planType = ''
      let usageMinutes = 0
      let usageData = ''

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
          case 'phone_number':
            phoneNumber = cellValue
            parsedRow.description = `Orange Telecom - ${cellValue}`
            break
          case 'plan_type':
            planType = cellValue
            break
          case 'usage_minutes':
            usageMinutes = parseFloat(cellValue) || 0
            break
          case 'usage_data':
            usageData = cellValue
            break
          case 'employee':
            parsedRow.employee = cellValue
            break
          case 'description':
            // Override default description if provided
            if (cellValue) {
              parsedRow.description = cellValue
            }
            break
          case 'type':
            parsedRow.type = cellValue
            break
        }
      })

      // Build comprehensive description
      if (planType) {
        parsedRow.description = `${parsedRow.description} (${planType})`
      }
      if (usageMinutes > 0 || usageData) {
        const usage = []
        if (usageMinutes > 0) usage.push(`${usageMinutes} min`)
        if (usageData) usage.push(usageData)
        parsedRow.description = `${parsedRow.description} - Usage: ${usage.join(', ')}`
      }

      // Validate required fields for Orange bills
      if (parsedRow.date && parsedRow.amount > 0 && phoneNumber) {
        // Add Orange-specific metadata
        parsedRow.metadata = {
          telecom_provider: 'Orange',
          phone_number: phoneNumber,
          plan_type: planType,
          usage_minutes: usageMinutes,
          usage_data: usageData,
          bill_type: determineBillType(planType, usageMinutes, usageData),
          cost_per_minute: usageMinutes > 0 ? (parsedRow.amount / usageMinutes).toFixed(4) : null,
          processed_at: new Date().toISOString(),
          rowNumber: rowIndex + 1,
          originalRow: row,
          rowHash: generateRowHash({
            date: parsedRow.date,
            amount: parsedRow.amount,
            description: parsedRow.description,
            category: parsedRow.category
          })
        }
        
        results.push(parsedRow)
      }
    } catch (error) {
      console.warn(`Error parsing Orange row ${rowIndex + 1}:`, error)
    }
  })

  return results
}

/**
 * Determine bill type based on plan and usage information
 */
function determineBillType(planType: string, usageMinutes: number, usageData: string): string {
  const plan = planType.toLowerCase()
  
  if (plan.includes('unlimited') || plan.includes('безлимит')) return 'unlimited_plan'
  if (plan.includes('prepaid') || plan.includes('предоплата')) return 'prepaid'
  if (plan.includes('postpaid') || plan.includes('постоплата')) return 'postpaid'
  if (plan.includes('business') || plan.includes('бизнес')) return 'business_plan'
  if (plan.includes('data') || plan.includes('интернет')) return 'data_plan'
  if (usageMinutes > 0 && !usageData) return 'voice_only'
  if (!usageMinutes && usageData) return 'data_only'
  
  return 'standard_plan'
}