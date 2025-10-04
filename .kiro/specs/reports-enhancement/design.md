# Design Document

## Overview

Данный документ описывает архитектурное решение для доработки отчетов "Прогноз платежей" и "Портфельный анализ" в системе финансового управления. Основные изменения включают:

1. Активацию фильтров по датам и банкам в отчете "Прогноз платежей"
2. Замену выпадающего списка "Формат экспорта" на "Форма отчета" с опциями "Список" и "Таблица"
3. Добавление детализации по кредитам в отчете "Портфельный анализ"
4. Реализацию расчета остатка кредита на указанную дату
5. Корректный расчет средневзвешенной процентной ставки

## Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React UI      │────────▶│  Reports Service │────────▶│  Express API    │
│   (Reports.tsx) │◀────────│  (TypeScript)    │◀────────│  (server.js)    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                                                    │
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │   PostgreSQL    │
                                                          │   Database      │
                                                          └─────────────────┘
```

### Component Interaction Flow

1. **Forecast Report - List View**:
   - User selects filters (dateFrom, dateTo, bankId) and form type "Список"
   - Frontend sends GET request to `/api/reports/forecast?dateFrom=X&dateTo=Y&bankId=Z`
   - Backend filters credits and generates payment schedule
   - Returns flat list of payments grouped by bank/credit/month
   - Frontend displays in table format: Bank | Credit | Month | Principal | Interest | Total

2. **Forecast Report - Table View**:
   - Same filter selection and API call
   - Backend returns same data structure
   - Frontend transforms data into pivot table grouped by Year/Month with banks as columns
   - Displays aggregated sums with totals row

3. **Portfolio Report - With Credit Details**:
   - User selects filters and clicks "Показать кредиты" for a bank
   - Frontend already has credit details from initial API call
   - Expands nested table showing individual credits
   - Each credit shows: Contract Number, Principal, Remaining Balance, Rate, Paid Amount, Start Date

4. **Weighted Average Rate Calculation**:
   - Backend queries `credit_rates` table for each credit
   - Finds rate effective on specified date (or current date)
   - Calculates: `weighted_rate = SUM(remaining_balance * rate) / SUM(remaining_balance)`
   - Returns avgRate in response

## Components and Interfaces

### Frontend Components

#### 1. Reports Page Component (`src/pages/Reports.tsx`)

**State Management:**
```typescript
interface ReportsState {
  selectedReport: string;
  dateFrom: string;
  dateTo: string;
  selectedBank: string;
  reportForm: 'list' | 'table'; // NEW: replaces exportFormat for forecast
  banks: Bank[];
  reportData: ReportData | null;
  loading: boolean;
  error: string | null;
  expandedBanks: Record<string, boolean>; // NEW: for portfolio credit expansion
}
```

**New UI Elements:**

1. **Report Form Selector** (for Forecast Report):
```tsx
<Select value={reportForm} onValueChange={setReportForm}>
  <SelectTrigger>
    <SelectValue placeholder="Выберите форму отчета" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="list">Список</SelectItem>
    <SelectItem value="table">Таблица</SelectItem>
  </SelectContent>
</Select>
```

2. **Expandable Credit List** (for Portfolio Report):
```tsx
<Button 
  variant="ghost" 
  size="sm" 
  onClick={() => toggleBankCredits(bank.name)}
>
  {expandedBanks[bank.name] ? 'Скрыть кредиты' : 'Показать кредиты'}
</Button>

{expandedBanks[bank.name] && (
  <tr>
    <td colSpan={7}>
      <div className="ml-4 mt-2">
        <table className="finance-table">
          {/* Credit details table */}
        </table>
      </div>
    </td>
  </tr>
)}
```

#### 2. Forecast Report Rendering Logic

**List View** (existing, no changes):
```tsx
<table className="finance-table">
  <thead>
    <tr>
      <th>Банк</th>
      <th>Кредит</th>
      <th>Месяц</th>
      <th>Остаток долга</th>
      <th>Проценты</th>
      <th>Всего</th>
    </tr>
  </thead>
  <tbody>
    {forecastData.items.map((item, index) => (
      <tr key={index}>
        <td>{item.bank}</td>
        <td>{item.creditNumber}</td>
        <td>{item.month}</td>
        <td>{formatCurrency(item.principalAmount)}</td>
        <td>{formatCurrency(item.interestAmount)}</td>
        <td>{formatCurrency(item.totalAmount)}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**Table View** (new):
```tsx
// Data transformation
interface PivotData {
  year: number;
  month: number;
  banks: Record<string, { principal: number; interest: number }>;
  totals: { principal: number; interest: number };
}

const pivotData = transformToPivotTable(forecastData.items);

<table className="finance-table">
  <thead>
    <tr>
      <th rowSpan={2}>Год</th>
      <th rowSpan={2}>Месяц</th>
      {uniqueBanks.map(bank => (
        <th key={bank} colSpan={2}>{bank}</th>
      ))}
      <th colSpan={2}>Всего</th>
    </tr>
    <tr>
      {uniqueBanks.map(bank => (
        <React.Fragment key={bank}>
          <th>Остаток долга</th>
          <th>Проценты</th>
        </React.Fragment>
      ))}
      <th>Остаток долга</th>
      <th>Проценты</th>
    </tr>
  </thead>
  <tbody>
    {pivotData.map((row, index) => (
      <tr key={index}>
        <td>{row.year}</td>
        <td>{row.month}</td>
        {uniqueBanks.map(bank => (
          <React.Fragment key={bank}>
            <td>{formatCurrency(row.banks[bank]?.principal || 0)}</td>
            <td>{formatCurrency(row.banks[bank]?.interest || 0)}</td>
          </React.Fragment>
        ))}
        <td>{formatCurrency(row.totals.principal)}</td>
        <td>{formatCurrency(row.totals.interest)}</td>
      </tr>
    ))}
  </tbody>
  <tfoot>
    <tr>
      <td colSpan={2}>Итого:</td>
      {uniqueBanks.map(bank => (
        <React.Fragment key={bank}>
          <td>{formatCurrency(grandTotals.banks[bank].principal)}</td>
          <td>{formatCurrency(grandTotals.banks[bank].interest)}</td>
        </React.Fragment>
      ))}
      <td>{formatCurrency(grandTotals.total.principal)}</td>
      <td>{formatCurrency(grandTotals.total.interest)}</td>
    </tr>
  </tfoot>
</table>
```

### Backend API Endpoints

#### 1. GET `/api/reports/forecast`

**Query Parameters:**
- `dateFrom` (optional): ISO date string - filter credits by start_date >= dateFrom
- `dateTo` (optional): ISO date string - filter credits by start_date <= dateTo
- `bankId` (optional): UUID - filter credits by bank_id

**Response Structure:**
```typescript
{
  items: Array<{
    bank: string;           // Bank name
    creditNumber: string;   // Contract number
    month: string;          // YYYY-MM format
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
  }>;
}
```

**Implementation Notes:**
- Filter credits BEFORE generating payment schedule
- Use ScheduleEngine to generate payment schedule for each filtered credit
- Flatten schedule items into response array
- Sort by bank, credit, then month

#### 2. GET `/api/reports/portfolio`

**Query Parameters:**
- `dateFrom` (optional): ISO date string - filter credits by start_date >= dateFrom
- `dateTo` (optional): ISO date string - filter credits by start_date <= dateTo (also used for rate calculation)
- `bankId` (optional): UUID - filter credits by bank_id

**Response Structure:**
```typescript
{
  totalPrincipal: number;
  totalCredits: number;
  totalPaid: number;
  items: Array<{
    bank: string;
    creditCount: number;
    totalPrincipal: number;
    avgRate: number;          // Weighted average rate
    totalPaid: number;
    remainingBalance: number;
    credits: Array<{          // NEW: detailed credit list
      id: string;
      contractNumber: string;
      principal: number;
      startDate: string;
      paidAmount: number;
      remainingBalance: number;
      rate: number;           // Current rate on specified date
    }>;
  }>;
}
```

**Implementation Notes:**
- Query credits with JOIN to banks and payments tables
- For each credit, calculate remaining balance: `principal - SUM(payments.amount)`
- Query `credit_rates` table to get current rate for each credit
- Calculate weighted average rate per bank: `SUM(remaining_balance * rate) / SUM(remaining_balance)`
- Group credits by bank
- Include full credit details in response

### Data Models

#### Database Tables Used

1. **credits**
   - `id` (UUID, PK)
   - `bank_id` (UUID, FK to banks)
   - `contract_number` (VARCHAR)
   - `principal` (NUMERIC)
   - `start_date` (DATE)
   - `status` (VARCHAR)
   - Other fields...

2. **banks**
   - `id` (UUID, PK)
   - `name` (VARCHAR)

3. **payments**
   - `id` (UUID, PK)
   - `credit_id` (UUID, FK to credits)
   - `amount` (NUMERIC)
   - `payment_date` (DATE)

4. **credit_rates**
   - `id` (UUID, PK)
   - `credit_id` (UUID, FK to credits)
   - `rate` (NUMERIC) - stored as decimal (e.g., 0.08 for 8%)
   - `effective_date` (DATE)

#### TypeScript Interfaces

**Updated PortfolioReportData:**
```typescript
export interface PortfolioReportData {
  totalPrincipal: number;
  totalCredits: number;
  totalPaid: number;
  items: Array<{
    bank: string;
    creditCount: number;
    totalPrincipal: number;
    avgRate: number;
    totalPaid: number;
    remainingBalance: number;
    credits: CreditDetail[];  // NEW
  }>;
}

export interface CreditDetail {
  id: string;
  contractNumber: string;
  principal: number;
  startDate: string;
  paidAmount: number;
  remainingBalance: number;
  rate: number;
}
```

## Error Handling

### Frontend Error Handling

1. **API Request Failures:**
   - Display error message in report preview area
   - Provide "Попробовать снова" button
   - Log error to console for debugging

2. **Invalid Filter Combinations:**
   - Validate dateFrom <= dateTo before sending request
   - Show validation message if invalid

3. **Empty Results:**
   - Display friendly message: "Нет данных для отображения"
   - Suggest adjusting filters

### Backend Error Handling

1. **Database Connection Errors:**
   - Return 500 status with generic error message
   - Log detailed error to server console

2. **Invalid Query Parameters:**
   - Validate date formats (ISO 8601)
   - Validate UUID format for bankId
   - Return 400 status with specific error message

3. **Missing Credit Rates:**
   - If no rate found for credit, use 0% as default
   - Log warning to console

4. **Division by Zero:**
   - When calculating weighted average, check if totalWeight > 0
   - Return 0% if no remaining balance

## Testing Strategy

### Unit Tests

1. **Frontend Utility Functions:**
   - `transformToPivotTable()` - test data transformation logic
   - Test with various input scenarios (single bank, multiple banks, empty data)

2. **Backend Calculation Functions:**
   - Weighted average rate calculation
   - Remaining balance calculation
   - Date filtering logic

### Integration Tests

1. **API Endpoint Tests:**
   - Test `/api/reports/forecast` with various filter combinations
   - Test `/api/reports/portfolio` with various filter combinations
   - Verify response structure matches TypeScript interfaces

2. **Database Query Tests:**
   - Test credit filtering by date range
   - Test credit filtering by bank
   - Test rate lookup by effective date
   - Test payment aggregation

### Manual Testing Scenarios

1. **Forecast Report - List View:**
   - Generate report without filters
   - Generate report with date range filter
   - Generate report with bank filter
   - Generate report with all filters combined

2. **Forecast Report - Table View:**
   - Verify pivot table structure
   - Verify totals calculation
   - Verify data matches list view

3. **Portfolio Report - Credit Expansion:**
   - Click "Показать кредиты" for each bank
   - Verify credit details are correct
   - Verify remaining balance calculation
   - Verify rate display

4. **Weighted Average Rate:**
   - Create test scenario with known rates and balances
   - Verify calculated average matches expected value
   - Test with zero remaining balance
   - Test with missing rate data

### Performance Considerations

1. **Database Query Optimization:**
   - Use indexes on `credits.start_date`, `credits.bank_id`
   - Use index on `credit_rates.credit_id` and `credit_rates.effective_date`
   - Consider using materialized views for frequently accessed aggregations

2. **Frontend Rendering:**
   - Implement pagination for large result sets (future enhancement)
   - Use React.memo for expensive components
   - Debounce filter changes to avoid excessive API calls

3. **API Response Size:**
   - Current design includes all credit details in portfolio response
   - For large portfolios (>100 credits per bank), consider lazy loading credit details
   - Monitor response times and optimize if needed

## Implementation Phases

### Phase 1: Forecast Report Enhancements
1. Update frontend UI to replace "Формат экспорта" with "Форма отчета"
2. Implement pivot table transformation logic
3. Update backend API to accept and apply filters
4. Test both list and table views

### Phase 2: Portfolio Report Enhancements
1. Update backend API to include credit details in response
2. Implement weighted average rate calculation
3. Update frontend to display expandable credit lists
4. Test credit expansion and rate calculations

### Phase 3: Testing and Refinement
1. Perform comprehensive integration testing
2. Optimize database queries if needed
3. Add error handling and edge case coverage
4. Update documentation

## Security Considerations

1. **SQL Injection Prevention:**
   - Use parameterized queries for all database operations
   - Validate and sanitize all user inputs

2. **Access Control:**
   - Ensure reports API requires authentication (future enhancement)
   - Implement role-based access control for sensitive financial data

3. **Data Privacy:**
   - Consider masking sensitive credit information in logs
   - Implement audit trail for report generation

## Deployment Notes

1. **Database Migrations:**
   - No schema changes required
   - Verify indexes exist on required columns

2. **API Versioning:**
   - Changes are backward compatible
   - Existing API consumers will continue to work

3. **Frontend Deployment:**
   - Update React components
   - No breaking changes to existing functionality

4. **Rollback Plan:**
   - Keep previous version of server.js and Reports.tsx
   - Database queries are non-destructive
   - Can rollback frontend and backend independently
