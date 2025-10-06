# Implementation Plan

- [x] 1. Update TypeScript interfaces for enhanced report data structures



  - Add `CreditDetail` interface to `reportsService.ts`
  - Update `PortfolioReportData` interface to include `credits` array in items
  - Add `reportForm` type definition for forecast report display modes
  - _Requirements: 3.3, 3.6, 5.6_

- [x] 2. Implement backend API enhancements for forecast report






  - [x] 2.1 Update `/api/reports/forecast` endpoint to accept filter parameters


    - Extract `dateFrom`, `dateTo`, and `bankId` from query string
    - Add WHERE conditions to filter credits by `start_date >= dateFrom`
    - Add WHERE conditions to filter credits by `start_date <= dateTo`
    - Add WHERE conditions to filter credits by `bank_id = bankId` when provided
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.2 Apply filters before generating payment schedules


    - Modify credit selection query to include filter conditions
    - Ensure ScheduleEngine receives only filtered credits
    - _Requirements: 6.5_

  - [x] 2.3 Add error handling for invalid filter parameters



    - Validate date format (ISO 8601)
    - Validate bankId format (UUID)
    - Return 400 status with error message for invalid inputs
    - _Requirements: 6.7_

- [x] 3. Implement backend API enhancements for portfolio report




  - [x] 3.1 Update database query to include credit details


    - Modify SQL query to SELECT all required credit fields
    - Add JOIN with banks table for bank names
    - Add LEFT JOIN with payments table for payment aggregation
    - Group results by bank_id and credit_id
    - _Requirements: 7.1, 7.4_

  - [x] 3.2 Implement current rate lookup for each credit


    - Create subquery to fetch rate from `credit_rates` table
    - Filter by `credit_id` and `effective_date <= dateTo` (or current date)
    - Order by `effective_date DESC` and take first result
    - Handle case when no rate is found (default to 0%)
    - _Requirements: 4.3, 4.4, 5.3, 5.4, 5.5, 7.5_

  - [x] 3.3 Calculate remaining balance for each credit

    - Compute `principal - COALESCE(SUM(payments.amount), 0)` for each credit
    - Store in `remaining_balance` field
    - _Requirements: 4.4, 5.2_

  - [x] 3.4 Implement weighted average rate calculation


    - For each credit, calculate `weighted_contribution = remaining_balance * current_rate`
    - Sum all weighted contributions per bank: `weightedRateSum`
    - Sum all remaining balances per bank: `totalWeight`
    - Calculate average: `avgRate = weightedRateSum / totalWeight`
    - Handle division by zero (return 0% if totalWeight is 0)
    - _Requirements: 5.1, 5.2, 5.7_

  - [x] 3.5 Structure response with credit details array

    - Group credits by bank into `credits` array
    - Include fields: id, contractNumber, principal, startDate, paidAmount, remainingBalance, rate
    - Calculate bank-level aggregates: creditCount, totalPrincipal, totalPaid, remainingBalance
    - _Requirements: 3.3, 7.2, 7.6_

  - [x] 3.6 Calculate overall totals across all banks

    - Sum totalPrincipal across all banks
    - Sum totalCredits (count) across all banks
    - Sum totalPaid across all banks
    - _Requirements: 7.7_

  - [x] 3.7 Add error handling for database queries


    - Wrap queries in try-catch blocks
    - Return 500 status with error message on failure
    - Log detailed errors to console
    - _Requirements: 7.8_

- [x] 4. Update frontend Reports component UI


  - [x] 4.1 Replace "Формат экспорта" selector with "Форма отчета" selector


    - Remove `exportFormat` state variable
    - Add `reportForm` state variable with type `'list' | 'table'`
    - Update Select component label to "Форма отчета"
    - Add SelectItem options: "Список" (value: 'list') and "Таблица" (value: 'table')
    - Only show this selector when `selectedReport === 'forecast'`
    - _Requirements: 2.1, 2.2_

  - [x] 4.2 Add state for expandable bank credits in portfolio report


    - Add `expandedBanks` state: `Record<string, boolean>`
    - Create `toggleBankCredits` function to toggle expansion state
    - _Requirements: 3.1, 3.4_

  - [x] 4.3 Update filter application to pass parameters to API


    - Ensure `dateFrom`, `dateTo`, and `selectedBank` are passed in `handleGenerateReport`
    - Verify filters are included in ReportFilters object
    - _Requirements: 1.5_

- [x] 5. Implement forecast report list view rendering


  - [x] 5.1 Keep existing table structure for list view


    - Render table with columns: Банк, Кредит, Месяц, Остаток долга, Проценты, Всего
    - Map over `forecastData.items` to display rows
    - Add totals footer row
    - _Requirements: 2.3_

- [x] 6. Implement forecast report table view rendering



  - [x] 6.1 Create pivot table transformation utility function


    - Write `transformToPivotTable` function to group data by year/month
    - Aggregate principal and interest amounts by bank for each month
    - Calculate row totals (sum across all banks)
    - Return structured data: `{ year, month, banks: { [bankName]: { principal, interest } }, totals }`
    - _Requirements: 2.4, 2.5_

  - [x] 6.2 Extract unique bank names from forecast data


    - Create array of unique bank names for table headers
    - Sort banks alphabetically for consistent display
    - _Requirements: 2.5_

  - [x] 6.3 Render pivot table with nested headers


    - Create table with two-row header: first row for bank names, second row for "Остаток долга" and "Проценты"
    - Use `rowSpan={2}` for "Год" and "Месяц" columns
    - Use `colSpan={2}` for each bank name header
    - _Requirements: 2.4, 2.5_

  - [x] 6.4 Render pivot table body with aggregated data

    - Map over transformed pivot data
    - For each row, display year, month, then principal/interest for each bank
    - Display row totals in last columns
    - Format currency values using `formatCurrency`
    - _Requirements: 2.5_

  - [x] 6.5 Calculate and render grand totals footer

    - Sum all principal amounts across all months for each bank
    - Sum all interest amounts across all months for each bank
    - Calculate overall totals (sum across all banks)
    - Render footer row with "Итого:" label and all totals
    - _Requirements: 2.6_

  - [x] 6.6 Add conditional rendering based on reportForm state

    - Use `reportForm === 'list'` to show list view
    - Use `reportForm === 'table'` to show table view
    - _Requirements: 2.3, 2.4_

- [x] 7. Implement portfolio report credit details expansion


  - [x] 7.1 Add "Показать кредиты" button to each bank row


    - Add button column to portfolio table
    - Button text toggles between "Показать кредиты" and "Скрыть кредиты"
    - onClick handler calls `toggleBankCredits(bank.name)`
    - _Requirements: 3.1, 3.4_

  - [x] 7.2 Render expandable credit details table

    - Check if `expandedBanks[bank.name]` is true
    - Render nested row with `colSpan={7}` to span all columns
    - Create inner table with columns: Номер договора, Основная сумма, Остаток, Ставка, Выплачено, Дата начала
    - Map over `bank.credits` array to display credit rows
    - _Requirements: 3.2, 3.3, 3.5_

  - [x] 7.3 Format credit detail fields correctly

    - Use `formatCurrency` for principal, remainingBalance, and paidAmount
    - Display rate as percentage with 2 decimal places: `${credit.rate}%`
    - Use `formatDate` for startDate
    - _Requirements: 3.5_

  - [x] 7.4 Sort credits by contract number within each bank

    - Ensure backend returns credits sorted by contract_number
    - Or sort in frontend before rendering
    - _Requirements: 3.6_

- [x] 8. Update reportsService to handle new data structures


  - [x] 8.1 Update `PortfolioReportData` interface


    - Add `credits: CreditDetail[]` to items array type
    - _Requirements: 3.3, 7.2_

  - [x] 8.2 Ensure API calls pass all filter parameters


    - Verify `dateFrom`, `dateTo`, and `bankId` are included in query params
    - _Requirements: 1.5, 4.1_

- [x] 9. Add validation and error handling in frontend



  - [x] 9.1 Validate date range before API call



    - Check if `dateFrom <= dateTo` when both are provided
    - Display validation error message if invalid
    - Prevent API call if validation fails
    - _Requirements: 2.3_

  - [x] 9.2 Handle empty results gracefully


    - Display "Нет данных для отображения" message when items array is empty
    - Suggest adjusting filters
    - _Requirements: 2.3_

  - [x] 9.3 Display API error messages


    - Show error message in report preview area
    - Provide "Попробовать снова" button
    - Log error to console for debugging
    - _Requirements: 6.7, 7.8_

- [x] 10. Test forecast report with filters


  - [x] 10.1 Test list view with various filter combinations



    - Test without filters (all data)
    - Test with dateFrom only
    - Test with dateTo only
    - Test with date range
    - Test with bank filter
    - Test with all filters combined
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 10.2 Test table view rendering



    - Verify pivot table structure is correct
    - Verify data matches list view
    - Verify totals calculation is accurate
    - Test with single bank and multiple banks
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 11. Test portfolio report enhancements



  - [x] 11.1 Test credit details expansion



    - Click "Показать кредиты" for each bank
    - Verify credit details are displayed correctly
    - Verify toggle between show/hide works
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 11.2 Verify remaining balance calculation


    - Compare remaining balance with manual calculation
    - Test with credits that have no payments
    - Test with credits that are fully paid
    - _Requirements: 4.3, 4.4_

  - [x] 11.3 Verify weighted average rate calculation


    - Create test scenario with known rates and balances
    - Calculate expected weighted average manually
    - Compare with displayed avgRate
    - Test with zero remaining balance
    - Test with missing rate data
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 11.4 Test with date filters


    - Verify rate is calculated based on dateTo parameter
    - Test with different date ranges
    - Verify remaining balance reflects payments up to dateTo
    - _Requirements: 4.1, 4.2, 5.3_
