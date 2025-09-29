/**
 * Utility functions for expense data parsing
 * Shared across all category-specific parsers
 */

/**
 * Convert column letter (A, B, C, etc.) to zero-based index
 */
export function columnLetterToIndex(letter: string): number {
  if (!letter || typeof letter !== 'string') return -1
  
  let result = 0
  const upperLetter = letter.toUpperCase()
  
  for (let i = 0; i < upperLetter.length; i++) {
    const charCode = upperLetter.charCodeAt(i)
    if (charCode < 65 || charCode > 90) return -1 // Invalid character
    result = result * 26 + (charCode - 64)
  }
  
  return result - 1
}

/**
 * Parse date from various formats commonly found in spreadsheets
 */
export function parseDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return ''

  const trimmed = dateStr.trim()
  if (!trimmed) return ''

  // Try different date formats
  const formats = [
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
  ]

  for (const format of formats) {
    const match = trimmed.match(format)
    if (match) {
      if (format === formats[2]) {
        // YYYY-MM-DD format (already correct)
        const year = match[1]
        const month = match[2].padStart(2, '0')
        const day = match[3].padStart(2, '0')
        return `${year}-${month}-${day}`
      } else {
        // DD.MM.YYYY, DD/MM/YYYY, or DD-MM-YYYY format
        const day = match[1].padStart(2, '0')
        const month = match[2].padStart(2, '0')
        const year = match[3]
        
        // Validate date components
        const dayNum = parseInt(day)
        const monthNum = parseInt(month)
        const yearNum = parseInt(year)
        
        if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
          continue // Invalid date, try next format
        }
        
        return `${year}-${month}-${day}`
      }
    }
  }

  // Try parsing as Excel serial date
  const serialDate = parseFloat(trimmed)
  if (!isNaN(serialDate) && serialDate > 25000 && serialDate < 100000) {
    try {
      // Excel epoch starts at 1900-01-01, but Excel incorrectly treats 1900 as a leap year
      const excelEpoch = new Date(1900, 0, 1)
      const date = new Date(excelEpoch.getTime() + (serialDate - 2) * 24 * 60 * 60 * 1000)
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    } catch (error) {
      // Continue to return empty string
    }
  }

  // Try parsing as ISO date string
  try {
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch (error) {
    // Continue to return empty string
  }

  return ''
}

/**
 * Parse amount from string, handling various formats and currencies
 */
export function parseAmount(amountStr: string): number {
  if (!amountStr || typeof amountStr !== 'string') return 0

  const trimmed = amountStr.trim()
  if (!trimmed) return 0

  // Remove currency symbols, spaces, and normalize decimal separators
  const cleaned = trimmed
    .replace(/[₽$€£¥₴₸₦₨₩¢]/g, '') // Remove currency symbols
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^\d.,-]/g, '') // Keep only digits, dots, commas, and minus
    .replace(/,(\d{3})/g, '$1') // Remove thousands separators (commas before 3 digits)
    .replace(/,/g, '.') // Convert remaining commas to dots (decimal separator)

  if (!cleaned) return 0

  // Handle negative amounts
  const isNegative = amountStr.includes('-') || amountStr.includes('(')
  
  const amount = parseFloat(cleaned)
  if (isNaN(amount)) return 0
  
  return isNegative ? -Math.abs(amount) : Math.abs(amount)
}

/**
 * Validate required fields for expense data
 */
export function validateExpenseData(data: {
  date: string
  amount: number
  description: string
}): boolean {
  return !!(
    data.date && 
    data.date.length >= 8 && // Minimum date format YYYY-MM-DD
    data.amount > 0 && 
    data.description && 
    data.description.trim().length > 0
  )
}

/**
 * Clean and normalize text fields
 */
export function cleanText(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
    .substring(0, 500) // Limit length to prevent database issues
}

/**
 * Generate a consistent hash for duplicate detection
 */
export function generateRowHash(data: {
  date: string
  amount: number
  description: string
  category: string
}): string {
  const normalized = {
    date: data.date,
    amount: Math.round(data.amount * 100) / 100, // Round to 2 decimal places
    description: cleanText(data.description).toLowerCase(),
    category: data.category.toLowerCase()
  }
  
  const hashString = `${normalized.date}-${normalized.amount}-${normalized.description}-${normalized.category}`
  
  // Simple hash function (for production, consider using crypto-js or similar)
  let hash = 0
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}