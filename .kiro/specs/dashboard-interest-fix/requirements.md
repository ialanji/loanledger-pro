# Requirements Document

## Introduction

The dashboard displays incorrect projected interest values (2,658,049 L instead of expected ~186,301 L). Analysis reveals the root cause: the dashboard calculation logic uses total scheduled interest without properly subtracting actual paid interest. Two issues were identified:

1. The `/api/payments/historical` endpoint was reading from wrong table and not filtering paid payments correctly
2. The `/api/credits` endpoint was not providing `status` field, preventing dashboard from loading active credits and their schedules
3. The Dashboard.tsx frontend code is still using `/api/payments` instead of `/api/payments/historical`

Backend fixes have been implemented but frontend still needs to be updated to use the correct historical payments endpoint.

## Requirements

### Requirement 1

**User Story:** As a financial manager, I want the dashboard to display accurate projected interest values based on correct historical payment data, so that I can make informed financial decisions.

#### Acceptance Criteria

1. WHEN calculating projected interest THEN the system SHALL use actual historical payments from the `payments` table, not scheduled payments from `credit_payment` table
2. WHEN displaying projected interest THEN the system SHALL show the correct remaining interest amount (~186,301 L) not the incorrect amount (2,658,049 L)
3. WHEN no historical payment data is available THEN the system SHALL fall back to schedule-based total interest calculation
4. WHEN calculating paid interest THEN the system SHALL only include payments with status 'paid' from the actual payments table

### Requirement 2

**User Story:** As a financial manager, I want the dashboard frontend to use the corrected historical payments endpoint, so that accurate interest calculations are displayed.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN it SHALL fetch historical payments from `/api/payments/historical` instead of `/api/payments`
2. WHEN calculating paid interest THEN the system SHALL use the historical payments data from the new endpoint
3. WHEN historical payments are available THEN the dashboard SHALL calculate projected interest as total scheduled interest minus actual paid interest
4. WHEN the calculation is performed THEN the system SHALL log the data sources and intermediate values for debugging

### Requirement 3

**User Story:** As a financial manager, I want the dashboard calculation logic to use the correct data sources, so that projected interest reflects actual remaining amounts to be paid.

#### Acceptance Criteria

1. WHEN calculating projected interest THEN the system SHALL use total interest from schedules minus actual paid interest from historical payments
2. WHEN historical payment data is available THEN the system SHALL prioritize it over scheduled payment data for paid interest calculations
3. WHEN displaying projected interest THEN the system SHALL show remaining interest to be paid (~186,301 L), not total scheduled interest (2,658,049 L)
4. WHEN the calculation method changes THEN the system SHALL log the data sources used for debugging and verification