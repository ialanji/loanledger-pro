// Data parsers for different expense categories
// Each parser handles specific data formats and validation rules

import { parseSalaryData } from './salaryParser'
import { parseGeneralExpenseData } from './generalExpenseParser'
import { parseRechiziteData } from './rechiziteParser'
import { parseTransportData } from './transportParser'
import { parseOrangeData } from './orangeParser'

export { parseSalaryData } from './salaryParser'
export { parseGeneralExpenseData } from './generalExpenseParser'
export { parseRechiziteData } from './rechiziteParser'
export { parseTransportData } from './transportParser'
export { parseOrangeData } from './orangeParser'

// Common parser interface
export interface ParsedExpenseData {
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
  metadata?: Record<string, unknown>
}

// Parser function type
export type ExpenseParser = (
  rawData: string[][],
  columnMapping: Record<string, string>
) => ParsedExpenseData[]

// Parser registry for dynamic selection
export const EXPENSE_PARSERS: Record<string, ExpenseParser> = {
  salary: parseSalaryData,
  general: parseGeneralExpenseData,
  rechizite: parseRechiziteData,
  transport: parseTransportData,
  orange: parseOrangeData
}

// Get parser by category
export function getParserByCategory(category: string): ExpenseParser | null {
  return EXPENSE_PARSERS[category] || null
}