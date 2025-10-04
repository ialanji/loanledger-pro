# Design Document

## Overview

This design document outlines the implementation approach for adding credit type classification to the financial management system. The feature enables credits to be categorized as either "Investment" (Инвестиционный) or "Working Capital" (Оборотные средства), providing better financial reporting and portfolio analysis capabilities.

The implementation follows a full-stack approach, touching the database schema, backend API, TypeScript type system, and frontend UI components. The design prioritizes backward compatibility, ensuring existing credits continue to function seamlessly with a default classification.

## Architecture

### System Layers

The credit type classification feature spans four architectural layers:

1. **Database Layer**: PostgreSQL schema extension with constraint validation
2. **API Layer**: Express.js endpoints with validation and business logic
3. **Type Layer**: TypeScript type definitions for compile-time safety
4. **UI Layer**: React components with form controls and display elements

### Data Flow

```
User Input (UI) → Form Validation → API Request → Backend Validation → Database Storage
                                                                              ↓
Dashboard Display ← Data Aggregation ← API Response ← Database Query ← Credit Type Filter
```

### Design Decisions

**Decision 1: Enum vs String Storage**
- **Choice**: Store as VARCHAR(50) with CHECK constraint
- **Rationale**: Provides flexibility for future credit types while maintaining data integrity through database-level validation. More readable in raw queries than numeric enums.

**Decision 2: Default Value Strategy**
- **Choice**: Default to 'investment' type
- **Rationale**: Investment credits are typically the primary credit type for businesses. This ensures backward compatibility for existing credits and reduces friction in the creation flow.

**Decision 3: Edit Restrictions**
- **Choice**: Prevent credit type changes when payments exist
- **Rationale**: Changing credit type after payments are made could invalidate financial reports and audit trails. This business rule ensures data consistency and prevents accidental misclassification.

**Decision 4: Dashboard Breakdown Approach**
- **Choice**: Calculate separate totals on the backend, display side-by-side on frontend
- **Rationale**: Backend aggregation is more efficient than client-side filtering. Side-by-side display provides immediate visual comparison of credit portfolio composition.

## Components and Interfaces

### Database Schema

**Table: credits**

New column addition:
```sql
credit_type VARCHAR(50) NOT NULL DEFAULT 'investment'
  CHECK (credit_type IN ('investment', 'working_capital'))
```

**Migration Strategy**:
- Add column with default value to ensure existing records are valid
- Apply CHECK constraint for data integrity
- No data migration needed (default handles existing records)

### TypeScript Type Definitions

**Core Types** (`src/types/credit.ts`):

```typescript
export type CreditType = 'investment' | 'working_capital';

export interface Credit {
  id: number;
  creditType: CreditType;
  // ... existing fields
}

export interface CreditFormData {
  creditType: CreditType;
  // ... existing fields
}

export interface CreditTypeTotal {
  type: CreditType;
  total: number;
  label: string;
}
```

**Type Guards**:
```typescript
export function isValidCreditType(value: string): value is CreditType {
  return value === 'investment' || value === 'working_capital';
}
```

### API Endpoints

**Existing Endpoints - Modified**:

1. `POST /api/credits`
   - **Input**: Add `creditType` field (optional, defaults to 'investment')
   - **Validation**: Ensure creditType is valid enum value
   - **Output**: Return created credit with creditType

2. `PUT /api/credits/:id`
   - **Input**: Add `creditType` field (optional)
   - **Validation**: Check if payments exist; if yes, reject creditType changes
   - **Output**: Return updated credit with creditType

3. `GET /api/credits`
   - **Output**: Include `credit_type` in response for each credit

4. `GET /api/credits/:id`
   - **Output**: Include `credit_type` in response

**New Endpoint**:

5. `GET /api/credits/totals-by-type`
   - **Purpose**: Aggregate credit totals by type for dashboard
   - **Output**: 
   ```typescript
   {
     investment: number,
     working_capital: number,
     total: number
   }
   ```

### UI Components

**Component Hierarchy**:

```
CreditForm (Create/Edit)
├── BasicInformationSection
│   └── CreditTypeSelect (new)
│       ├── Label: "Credit Type"
│       └── Options: Investment | Working Capital
└── FormActions

CreditsList
└── CreditRow
    └── CreditTypeDisplay (new)

Dashboard
└── GeneralCreditInformation
    ├── CreditTypeTotalCard (Investment) (new)
    ├── CreditTypeTotalCard (Working Capital) (new)
    └── TotalCreditCard (existing - modified)
```

**New Components**:

1. **CreditTypeSelect**
   - Dropdown component using shadcn/ui Select
   - Props: `value`, `onChange`, `disabled`
   - Default value: 'investment'
   - Options with Russian labels

2. **CreditTypeDisplay**
   - Read-only badge/label component
   - Props: `creditType`
   - Color coding: Blue for investment, Green for working capital

3. **CreditTypeTotalCard**
   - Dashboard card showing total for specific credit type
   - Props: `type`, `total`, `label`
   - Styling matches existing dashboard cards

## Data Models

### Credit Entity

**Extended Credit Model**:

```typescript
interface Credit {
  id: number;
  creditType: CreditType;  // NEW
  creditNumber: string;
  bankName: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  baseRate: number;
  marginRate: number;
  // ... other existing fields
}
```

### Form Data Model

**Credit Form Data**:

```typescript
interface CreditFormData {
  creditType: CreditType;  // NEW - defaults to 'investment'
  creditNumber: string;
  bankName: string;
  amount: string;
  currency: string;
  startDate: string;
  endDate: string;
  baseRate: string;
  marginRate: string;
  // ... other existing fields
}
```

### Dashboard Aggregation Model

**Credit Type Totals**:

```typescript
interface CreditTypeTotals {
  investment: number;
  workingCapital: number;
  total: number;
}
```

## Error Handling

### Validation Errors

**Frontend Validation**:
- Credit type must be selected (enforced by default value)
- Form submission includes credit type in payload

**Backend Validation**:
- Validate creditType against allowed values
- Return 400 Bad Request with descriptive message for invalid types
- Example: `{ error: "Invalid credit type. Must be 'investment' or 'working_capital'" }`

**Database Validation**:
- CHECK constraint prevents invalid values at database level
- Constraint violation returns PostgreSQL error, caught and transformed to user-friendly message

### Business Rule Violations

**Edit Restriction**:
- When editing credit with existing payments, check payment count
- If payments exist and creditType is being changed:
  - Return 400 Bad Request
  - Message: "Cannot change credit type when payments exist"
  - Frontend displays error and makes field read-only

**Implementation**:
```typescript
// Backend check
const paymentCount = await getPaymentCountForCredit(creditId);
if (paymentCount > 0 && creditType !== existingCredit.creditType) {
  throw new ValidationError("Cannot change credit type when payments exist");
}
```

### Error Messages

**User-Facing Messages** (Russian):
- Invalid type: "Неверный тип кредита"
- Cannot change with payments: "Невозможно изменить тип кредита при наличии платежей"
- Database error: "Ошибка сохранения данных"

## Testing Strategy

### Unit Tests

**Backend Tests** (`tests/unit/api/credits.test.js`):
- Test credit creation with valid credit types
- Test credit creation with invalid credit type (should fail)
- Test credit creation without credit type (should default to 'investment')
- Test credit update with valid credit type (no payments)
- Test credit update with credit type change (with payments - should fail)
- Test GET endpoints return credit_type field
- Test totals-by-type aggregation endpoint

**Frontend Tests** (`src/components/__tests__/CreditForm.test.tsx`):
- Test CreditTypeSelect renders with correct options
- Test default value is 'investment'
- Test selection changes update form state
- Test disabled state when editing credit with payments
- Test form submission includes creditType

**Type Tests** (`src/types/__tests__/credit.test.ts`):
- Test type guard validates correct values
- Test type guard rejects invalid values

### Integration Tests

**Database Integration** (`tests/integration/credits.test.js`):
- Test migration applies successfully
- Test existing credits have default 'investment' type
- Test CHECK constraint prevents invalid values
- Test credit creation and retrieval with credit type

**API Integration** (`tests/integration/api/credits.test.js`):
- Test full credit lifecycle with credit type
- Test dashboard totals calculation with mixed credit types
- Test edit restriction enforcement

### UI Tests

**Component Tests**:
- Test CreditForm displays credit type selector
- Test CreditsList displays credit type for each credit
- Test Dashboard displays separate totals for each type
- Test visual styling (colors) for different types

### Test Data

**Seed Data**:
```javascript
const testCredits = [
  { creditType: 'investment', amount: 100000, ... },
  { creditType: 'investment', amount: 50000, ... },
  { creditType: 'working_capital', amount: 75000, ... },
];
```

**Expected Totals**:
- Investment: 150,000
- Working Capital: 75,000
- Total: 225,000

## Implementation Phases

### Phase 1: Database and Types
1. Create and run database migration
2. Define TypeScript types and type guards
3. Update Credit interface in type definitions

### Phase 2: Backend API
1. Update POST /api/credits to accept creditType
2. Update PUT /api/credits with edit restrictions
3. Update GET endpoints to return creditType
4. Create GET /api/credits/totals-by-type endpoint
5. Add validation logic

### Phase 3: Frontend Components
1. Create CreditTypeSelect component
2. Integrate into CreditForm (create mode)
3. Add edit restrictions to CreditForm (edit mode)
4. Create CreditTypeDisplay component
5. Update CreditsList to show credit type

### Phase 4: Dashboard Integration
1. Create CreditTypeTotalCard component
2. Update Dashboard to fetch totals by type
3. Display separate cards for each credit type
4. Update overall total calculation

### Phase 5: Testing and Validation
1. Write and run unit tests
2. Write and run integration tests
3. Manual UI testing
4. Verify backward compatibility with existing credits

## Backward Compatibility

### Existing Credits
- All existing credits automatically receive 'investment' type via DEFAULT constraint
- No manual data migration required
- Existing API calls continue to work (creditType is optional in requests)

### API Compatibility
- GET endpoints return additional field (non-breaking change)
- POST/PUT endpoints accept optional creditType field (non-breaking change)
- Clients not sending creditType receive default value

### UI Compatibility
- Existing forms display new field with sensible default
- Existing credits display their assigned type
- No user action required for existing data

## Security Considerations

### Input Validation
- Whitelist validation for creditType values
- SQL injection prevention via parameterized queries
- Type safety enforced at TypeScript level

### Authorization
- Credit type modification follows existing credit edit permissions
- No new permission levels required
- Audit trail captures credit type changes

### Data Integrity
- Database CHECK constraint as final validation layer
- Business rule enforcement (payment check) prevents data inconsistency
- Transaction support ensures atomic updates

## Performance Considerations

### Database Queries
- No additional indexes required (credit_type not used in WHERE clauses frequently)
- Aggregation query for dashboard totals is efficient (single table scan)
- Consider adding index if filtering by credit type becomes common

### API Response Size
- Minimal increase (single string field per credit)
- No pagination changes needed

### Frontend Rendering
- Dashboard totals calculated on backend (no client-side aggregation overhead)
- Component rendering impact negligible (single dropdown, few display elements)

## Localization

### Display Labels
- Russian labels for UI elements
- Credit type options:
  - 'investment' → "Инвестиционный"
  - 'working_capital' → "Оборотные средства"
- Dashboard labels:
  - Investment total: "ИНВЕСТИЦИОННЫЕ КРЕДИТЫ"
  - Working capital total: "ОБОРОТНЫЕ СРЕДСТВА"

### Database Values
- Store English enum values for consistency with codebase
- Transform to Russian labels in UI layer only
- Maintains separation of concerns

## Future Enhancements

### Potential Extensions
1. Additional credit types (e.g., 'bridge', 'revolving')
2. Credit type-specific interest rate rules
3. Filtering and sorting by credit type in credits list
4. Credit type-based reporting and analytics
5. Historical tracking of credit type changes (audit log)

### Scalability Considerations
- VARCHAR(50) provides room for longer type names
- Enum-based approach allows easy addition of new types
- Component architecture supports additional credit type variants
