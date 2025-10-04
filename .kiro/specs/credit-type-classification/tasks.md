# Implementation Plan

- [x] 1. Set up database schema and TypeScript types





  - Create database migration to add credit_type column with CHECK constraint and default value
  - Define CreditType union type ('investment' | 'working_capital')
  - Update Credit interface to include creditType field
  - Create type guard function isValidCreditType
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Update backend API for credit creation with type support





  - Modify POST /api/credits endpoint to accept creditType in request body
  - Add validation logic to ensure creditType is valid ('investment' or 'working_capital')
  - Set default value to 'investment' if creditType not provided
  - Return 400 error with descriptive message for invalid creditType
  - Ensure created credit includes credit_type in response
  - _Requirements: 2.4, 2.5, 2.6, 6.1, 6.2, 6.3, 6.7_

- [x] 3. Update backend API for credit editing with type modification





  - Modify PUT /api/credits/:id endpoint to accept creditType in request body
  - Add business logic to check if payments exist for the credit
  - Prevent creditType changes when payments exist (return 400 error)
  - Allow creditType changes when no payments exist
  - Ensure updated credit includes credit_type in response
  - _Requirements: 3.5, 3.6, 6.4_

- [x] 4. Update backend API GET endpoints to return credit type





  - Modify GET /api/credits to include credit_type in response for each credit
  - Modify GET /api/credits/:id to include credit_type in response
  - Ensure backward compatibility for existing credits (should return 'investment')
  - _Requirements: 4.5, 6.5, 6.6, 8.1, 8.2, 8.3_

- [x] 5. Create backend endpoint for dashboard totals by credit type






  - Create GET /api/credits/totals-by-type endpoint
  - Implement aggregation query to sum credits where credit_type = 'investment'
  - Implement aggregation query to sum credits where credit_type = 'working_capital'
  - Return response with investment total, working_capital total, and overall total
  - Handle case where no credits exist for a type (return 0)
  - _Requirements: 5.2, 5.3, 5.6, 5.7_

- [x] 6. Create CreditTypeSelect component for forms





  - Create new component using shadcn/ui Select component
  - Add dropdown with two options: "Инвестиционный" and "Оборотные средства"
  - Map display labels to enum values ('investment', 'working_capital')
  - Set default value to 'investment'
  - Support disabled prop for read-only mode
  - _Requirements: 2.1, 2.2, 2.3, 3.4_

- [x] 7. Integrate credit type selection into CreditForm (create mode)





  - Add CreditTypeSelect component to Basic Information section of create form
  - Initialize form state with creditType field defaulting to 'investment'
  - Include creditType in form submission payload
  - Update form validation schema to include creditType
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 8. Add credit type edit restrictions to CreditForm (edit mode)





  - Display current credit type in edit form
  - Check if payments exist for the credit being edited
  - Make CreditTypeSelect disabled when payments exist
  - Display explanatory message when field is read-only
  - Allow credit type changes when no payments exist
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 9. Create CreditTypeDisplay component for credits list





  - Create badge/label component to display credit type
  - Map 'investment' to "Инвестиционный" with blue styling
  - Map 'working_capital' to "Оборотные средства" with green styling
  - Use consistent styling with existing UI components
  - _Requirements: 4.2, 4.3_

- [x] 10. Update Credits list page to show credit type





  - Add CreditTypeDisplay component to each credit row
  - Ensure credit type displays correctly for all credits
  - Maintain credit type visibility during sorting and filtering
  - Verify existing credits show 'investment' type
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.4_

- [x] 11. Create CreditTypeTotalCard component for dashboard




  - Create card component matching existing dashboard card styling
  - Accept props: type, total, label
  - Display formatted total amount with currency
  - Apply blue styling for investment type
  - Apply green styling for working capital type
  - _Requirements: 5.4, 5.5_

- [x] 12. Update Dashboard to display credit type breakdown





  - Fetch credit totals by type from new API endpoint
  - Add CreditTypeTotalCard for investment credits with label "ИНВЕСТИЦИОННЫЕ КРЕДИТЫ"
  - Add CreditTypeTotalCard for working capital credits with label "ОБОРОТНЫЕ СРЕДСТВА"
  - Display cards in General Credit Information section
  - Update overall total calculation to sum both types
  - Handle loading and error states
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 13. Verify backward compatibility and data migration





  - Run database migration on test database
  - Verify existing credits receive 'investment' as default type
  - Test that existing API calls work without creditType parameter
  - Verify old credits display correctly in UI with assigned type
  - Confirm no manual data migration is needed
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
