# Design Document

## Overview

This design addresses the dashboard interest calculation issue by creating a new API endpoint for historical payments and updating the calculation logic to use actual payment data instead of scheduled payment data. The root cause is that `/api/payments` returns data from `credit_payment` table (scheduled payments) rather than `payments` table (actual payments), leading to incorrect projected interest calculations.

## Architecture

The fix requires both backend and frontend changes:
1. **Backend**: Create new `/api/payments/historical` endpoint that queries the `payments` table
2. **Frontend**: Update dashboard to use historical payments for accurate paid interest calculations
3. **Calculation Logic**: Modify `calculateDashboardStats` to use correct data sources

### Current Flow (Problematic)
1. Dashboard fetches credits, scheduled payments from `credit_payment`, and schedule data
2. `calculateDashboardStats` calculates paid interest from scheduled payments (incorrect)
3. Dashboard displays incorrect projected interest (2,658,049 L instead of 2,202,688 L)

### New Flow (Corrected)
1. Dashboard fetches credits, historical payments from `payments` table, and schedule data
2. `calculateDashboardStats` calculates paid interest from actual historical payments (correct)
3. Dashboard displays accurate projected interest (2,202,688 L)

## Components and Interfaces

### New Backend Component

#### `/api/payments/historical` Endpoint
- **Purpose**: Return actual historical payments from `payments` table
- **Query**: `SELECT * FROM payments WHERE status = 'paid' ORDER BY payment_date DESC`
- **Response**: Array of payment objects with actual payment amounts and dates

### Modified Frontend Components

#### Dashboard.tsx
- **Function**: `fetchDashboardData`
- **Change**: Fetch from `/api/payments/historical` instead of `/api/payments`
- **Function**: `calculateDashboardStats`
- **Change**: Use historical payments for accurate paid interest calculation

#### DashboardStats Interface
- **Field**: `projectedInterest` - represents remaining interest to be paid (total - actual paid)
- **Type**: `number`
- **Description**: Accurate remaining interest based on actual payment history

### Data Flow

```mermaid
graph TD
    A[Dashboard Component] --> B[Fetch Credits]
    A --> C[Fetch Historical Payments] 
    A --> D[Fetch Schedule Data]
    B --> E[calculateDashboardStats]
    C --> E
    D --> E
    E --> F[Calculate Total Interest from Schedules]
    E --> G[Calculate Paid Interest from Historical Payments]
    F --> H[Calculate Projected Interest = Total - Paid]
    G --> H
    H --> I[Display Accurate Projected Interest]
    
    C --> J[/api/payments/historical]
    J --> K[payments table]
    K --> L[Actual payment records]
```

## Data Models

### Historical Payments API Response
```typescript
interface HistoricalPayment {
  id: string;
  credit_id: string;
  payment_amount: number;
  interest_amount: number;
  principal_amount: number;
  payment_date: string;
  status: 'paid';
}
```

### Updated Calculation Logic

#### Total Interest (from schedules)
```typescript
const totalInterestFromAllSchedules = allScheduleData.reduce((sum, scheduleItem) => {
  const totalInterest = parseNumeric(scheduleItem.schedule?.totals?.totalInterest || 0);
  return sum + totalInterest;
}, 0);
```

#### Paid Interest (from historical payments)
```typescript
const paidInterest = historicalPayments
  .filter(p => p.status === 'paid')
  .reduce((sum, payment) => {
    return sum + parseNumeric(payment.interest_amount);
  }, 0);
```

#### Projected Interest (corrected calculation)
```typescript
const projectedInterest = Math.max(0, totalInterestFromAllSchedules - paidInterest);
```

## Error Handling

### Fallback Strategy
1. **Primary**: Use schedule data totals if available
2. **Secondary**: Sum all payment interest amounts if schedule unavailable
3. **Tertiary**: Return 0 if no data available

### Validation
- Ensure numeric parsing handles string/null values
- Validate that calculated amounts are non-negative
- Log calculation method used for debugging

### Error Scenarios
- **Missing schedule data**: Fall back to payment-based calculation
- **Invalid numeric values**: Parse safely with fallback to 0
- **Empty data sets**: Return 0 with appropriate logging

## Testing Strategy

### Unit Tests
- Test `calculateDashboardStats` with various data scenarios
- Test numeric parsing with different input types
- Test fallback logic when schedule data is unavailable

### Integration Tests
- Verify dashboard displays correct total interest amount
- Test with real credit and payment data
- Verify calculation consistency across page refreshes

### Manual Testing
- Compare calculated values with expected business values
- Verify UI displays formatted amounts correctly
- Test with different credit portfolio configurations

## Implementation Notes

### Code Changes Required
1. **Backend**: Create `/api/payments/historical` endpoint in `server.js`
2. **Frontend**: Update `fetchDashboardData` in `Dashboard.tsx` to use new endpoint
3. **Calculation**: Modify `calculateDashboardStats` to use historical payments for paid interest
4. **Validation**: Add logging to verify correct data sources and calculation results

### Backward Compatibility
- New API endpoint doesn't affect existing `/api/payments` functionality
- Existing scheduled payment functionality remains intact
- Dashboard calculation becomes more accurate without breaking existing interfaces

### Performance Considerations
- Calculation complexity remains the same
- No additional API calls required
- Existing caching mechanisms remain effective