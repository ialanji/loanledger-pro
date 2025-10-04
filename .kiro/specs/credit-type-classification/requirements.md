# Requirements Document

## Introduction

This feature adds credit type classification to the financial management system, allowing credits to be categorized as either "Investment" (Инвестиционный) or "Working Capital" (Оборотные средства). This classification enables better financial reporting and analysis by separating different types of credit obligations.

The system currently displays a single "Total Credit Amount" on the dashboard. With this feature, the dashboard will show separate totals for each credit type while maintaining the overall total, providing clearer visibility into the company's financial structure.

## Requirements

### Requirement 1: Database Schema Enhancement

**User Story:** As a system administrator, I want the database to support credit type classification, so that all credits can be properly categorized and tracked.

#### Acceptance Criteria

1. WHEN the database migration is executed THEN the `credits` table SHALL have a new column `credit_type` of type VARCHAR(50)
2. WHEN a new credit is created without specifying type THEN the system SHALL default to 'investment' type
3. WHEN credit_type is set THEN it SHALL only accept values 'investment' or 'working_capital'
4. WHEN querying credits THEN the credit_type field SHALL be returned in all API responses
5. IF credit_type contains invalid value THEN the database SHALL reject the operation with a constraint violation error

### Requirement 2: Credit Creation with Type Selection

**User Story:** As a financial manager, I want to specify the credit type when creating a new credit, so that it is properly classified from the start.

#### Acceptance Criteria

1. WHEN viewing the Create Credit form THEN the user SHALL see a "Credit Type" dropdown field in the Basic Information section
2. WHEN the Create Credit form loads THEN the Credit Type field SHALL default to "Investment"
3. WHEN selecting credit type THEN the user SHALL see two options: "Инвестиционный" (Investment) and "Оборотные средства" (Working Capital)
4. WHEN submitting the create form THEN the selected credit type SHALL be included in the API request
5. WHEN the credit is created successfully THEN the credit_type SHALL be stored in the database
6. IF credit type is not selected THEN the system SHALL use 'investment' as default value

### Requirement 3: Credit Editing with Type Modification

**User Story:** As a financial manager, I want to modify the credit type when editing a credit, so that I can correct classification errors or update the type based on changing circumstances.

#### Acceptance Criteria

1. WHEN viewing the Edit Credit form THEN the user SHALL see the current credit type displayed
2. WHEN no payments exist for the credit THEN the credit type field SHALL be editable
3. WHEN payments exist for the credit THEN the credit type field SHALL be read-only with an explanatory message
4. WHEN editing credit type THEN the user SHALL see the same dropdown options as in creation
5. WHEN saving changes THEN the updated credit type SHALL be persisted to the database
6. IF attempting to change type with existing payments THEN the system SHALL prevent the change and display a warning

### Requirement 4: Credit List Display with Type Information

**User Story:** As a financial manager, I want to see the credit type in the credits list, so that I can quickly identify the classification of each credit.

#### Acceptance Criteria

1. WHEN viewing the Credits page THEN each credit row SHALL display its credit type
2. WHEN credit type is 'investment' THEN it SHALL display as "Инвестиционный"
3. WHEN credit type is 'working_capital' THEN it SHALL display as "Оборотные средства"
4. WHEN sorting or filtering credits THEN the credit type information SHALL remain visible
5. WHEN the API returns credit data THEN it SHALL include the credit_type field

### Requirement 5: Dashboard Breakdown by Credit Type

**User Story:** As a financial manager, I want to see separate totals for investment and working capital credits on the dashboard, so that I can understand the composition of our credit portfolio.

#### Acceptance Criteria

1. WHEN viewing the Dashboard THEN the "General Credit Information" section SHALL display two separate credit type totals
2. WHEN calculating investment total THEN the system SHALL sum all credits where credit_type = 'investment'
3. WHEN calculating working capital total THEN the system SHALL sum all credits where credit_type = 'working_capital'
4. WHEN displaying investment total THEN it SHALL be labeled "ИНВЕСТИЦИОННЫЕ КРЕДИТЫ" with blue styling
5. WHEN displaying working capital total THEN it SHALL be labeled "ОБОРОТНЫЕ СРЕДСТВА" with green styling
6. WHEN no credits exist for a type THEN the system SHALL display 0 for that type
7. IF the overall total is needed THEN it SHALL be calculated as the sum of both types

### Requirement 6: API Support for Credit Type

**User Story:** As a developer, I want the API to properly handle credit type in all credit operations, so that the frontend can reliably work with this data.

#### Acceptance Criteria

1. WHEN creating a credit via POST /api/credits THEN the API SHALL accept creditType in the request body
2. WHEN creditType is provided THEN the API SHALL validate it against allowed values
3. WHEN creditType is invalid THEN the API SHALL return 400 error with descriptive message
4. WHEN updating a credit via PUT /api/credits/:id THEN the API SHALL accept creditType in the request body
5. WHEN retrieving credits via GET /api/credits THEN the response SHALL include credit_type for each credit
6. WHEN retrieving a single credit via GET /api/credits/:id THEN the response SHALL include credit_type
7. IF creditType is not provided in creation THEN the API SHALL use 'investment' as default

### Requirement 7: Type Safety and Validation

**User Story:** As a developer, I want proper TypeScript types for credit type, so that the code is type-safe and prevents errors.

#### Acceptance Criteria

1. WHEN defining Credit interface THEN it SHALL include creditType field of type CreditType
2. WHEN CreditType is defined THEN it SHALL be a union type of 'investment' | 'working_capital'
3. WHEN form data includes credit type THEN it SHALL use the CreditType type
4. WHEN API responses are typed THEN they SHALL include creditType field
5. IF invalid credit type is assigned THEN TypeScript SHALL show a compilation error

### Requirement 8: Backward Compatibility

**User Story:** As a system administrator, I want existing credits to work seamlessly after the update, so that no data is lost or corrupted.

#### Acceptance Criteria

1. WHEN the migration runs THEN existing credits SHALL be assigned 'investment' as default type
2. WHEN querying old credits THEN they SHALL return a valid credit_type value
3. WHEN the system starts after migration THEN all existing functionality SHALL continue to work
4. WHEN displaying old credits THEN they SHALL show their assigned type correctly
5. IF any credit lacks credit_type THEN the database default SHALL provide 'investment'
