# Expense Data Parsers

This directory contains category-specific data parsers for processing expense data from Google Sheets. Each parser is designed to handle the unique data format and validation requirements for different expense categories.

## Parser Structure

### Available Parsers

1. **salaryParser.ts** - Processes salary expense data
   - Expected columns: Date, Employee, Amount, Department, Description
   - Validates employee information and payroll data
   - Adds payroll-specific metadata

2. **generalExpenseParser.ts** - Processes general business expenses
   - Expected columns: Date, Description, Amount, Category, Supplier
   - Handles various expense types and supplier information
   - Flexible validation for diverse expense categories

3. **rechiziteParser.ts** - Processes supplies and materials expenses
   - Expected columns: Date, Item, Amount, Quantity, Supplier
   - Categorizes items and tracks inventory-related expenses
   - Includes quantity and unit cost calculations

4. **transportParser.ts** - Processes transportation expenses
   - Expected columns: Date, Vehicle, Amount, Type, Description
   - Handles fuel, maintenance, and other transport costs
   - Tracks vehicle-specific expenses

5. **orangeParser.ts** - Processes Orange telecom expenses
   - Expected columns: Date, Amount, Bill Type, Account, Description
   - Handles telecom billing data and service charges
   - Processes recurring billing information

### Common Interface

All parsers implement the `ExpenseParser` type and return `ParsedExpenseData[]`:

```typescript
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
  metadata?: Record<string, unknown>
}
```

### Parser Registry

The `index.ts` file provides a centralized registry for all parsers:

```typescript
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
```

## Utility Functions

### parserUtils.ts

Provides shared utility functions used across all parsers:

- `columnLetterToIndex(letter: string)` - Converts Excel column letters to array indices
- `parseDate(dateStr: string)` - Handles various date formats (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD)
- `parseAmount(amountStr: string)` - Parses monetary amounts with currency symbols
- `validateExpenseData(data)` - Validates required expense data fields
- `cleanText(text: string)` - Cleans and normalizes text data
- `generateRowHash(data)` - Generates unique hash for duplicate detection

## Usage

### Integration with Import System

The parsers are integrated into the expense import system through:

1. **mockEdgeFunction.ts** - Uses category-specific parsers for local development
2. **expenseImport.ts** - Imports parser functions for production use

### Example Usage

```typescript
import { getParserByCategory } from '@/lib/parsers'

// Get parser for salary data
const parser = getParserByCategory('salary')
if (parser) {
  const parsedData = parser(rawSheetData, columnMapping)
  // Process parsed data...
}
```

### Column Mapping

Each parser expects a column mapping object that maps field names to Excel column letters:

```typescript
const columnMapping = {
  date: 'A',
  employee: 'B',
  amount: 'C',
  department: 'D',
  description: 'E'
}
```

## Error Handling

All parsers include comprehensive error handling:

- Skip empty or invalid rows
- Log parsing errors with row numbers
- Validate required fields before including in results
- Handle various data format edge cases

## Data Validation

Each parser includes category-specific validation:

- **Date validation** - Ensures valid date formats
- **Amount validation** - Ensures positive numeric values
- **Required field validation** - Checks category-specific required fields
- **Data type validation** - Ensures proper data types for all fields

## Metadata

Parsers can add category-specific metadata to parsed records:

- Processing timestamps
- Category-specific flags
- Data source information
- Validation status

This metadata is stored in the `metadata` field and can be used for auditing and debugging purposes.