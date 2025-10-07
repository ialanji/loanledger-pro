# API Testing Infrastructure with Playwright

This directory contains the Playwright-based API testing infrastructure for debugging and testing the `/api/aliases` and `/api/expenses` endpoints.

## Setup

The testing infrastructure is automatically configured with:

- **Database Connection**: Uses the same PostgreSQL configuration as the main application
- **Server Management**: Automatically starts/stops the server for testing
- **Test Data Management**: Provides fixtures and cleanup utilities
- **Error Capture**: Comprehensive error logging and debugging information

## Configuration

The API tests use a separate Playwright configuration file: `playwright.api.config.js`

Key configuration features:
- Sequential test execution to avoid database conflicts
- Retry logic for flaky tests
- Comprehensive reporting (HTML, JSON, console)
- Error capture with screenshots and traces

## Running Tests

```bash
# Run all API tests
npm run test:api

# Run specific test file
npx playwright test --config=playwright.api.config.js infrastructure.test.js

# Run tests with debug output
npx playwright test --config=playwright.api.config.js --debug

# Run tests in headed mode (with browser UI)
npx playwright test --config=playwright.api.config.js --headed
```

## Test Structure

### Global Setup/Teardown
- `global-setup.js`: Initializes database connection and starts server
- `global-teardown.js`: Cleans up resources and stops server

### Utilities
- `utils/api-utils.js`: API testing client and response validation
- `utils/database-utils.js`: Database operations and test data management
- `utils/test-helpers.js`: Test environment setup and helper functions

### Fixtures
- `fixtures/test-data.js`: Test data definitions for aliases and expenses

### Test Files
- `infrastructure.test.js`: Basic infrastructure and connectivity tests

## Test Data Management

The infrastructure provides automatic test data management:

1. **Setup**: Creates necessary database tables
2. **Seeding**: Inserts test data with 'Test' prefixes
3. **Cleanup**: Removes test data after tests complete
4. **Isolation**: Each test runs with clean data state

## Error Capture

The testing infrastructure captures comprehensive error information:

- HTTP response details (status, headers, body)
- Database connection state
- Request timing and performance metrics
- Stack traces and error context
- Screenshots and traces for visual debugging

## Environment Requirements

Required environment variables (from `.env` file):
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Debugging

### Verbose Logging
Tests include detailed console logging for debugging:
- Database operations
- API request/response details
- Error capture information
- Performance metrics

### Test Reports
- HTML reports: `test-results/api-reports/`
- JSON results: `test-results/api-results.json`
- Screenshots: Captured on test failures
- Traces: Available for failed tests

### Manual Debugging
```bash
# Run single test with full debug output
npx playwright test --config=playwright.api.config.js --debug infrastructure.test.js

# Generate and open HTML report
npx playwright show-report test-results/api-reports/
```

## Adding New Tests

1. Create test file in this directory
2. Import utilities from `./utils/`
3. Use `setupTestEnvironment()` and `cleanupTestEnvironment()` 
4. Create `APITestClient` instance for API calls
5. Use test data from `./fixtures/test-data.js`

Example test structure:
```javascript
import { test, expect } from '@playwright/test';
import { APITestClient } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment } from './utils/test-helpers.js';

test.describe('My API Tests', () => {
  test.beforeAll(async () => {
    await setupTestEnvironment();
  });

  test.afterAll(async () => {
    await cleanupTestEnvironment();
  });

  test('should test something', async ({ request }) => {
    const apiClient = new APITestClient(request);
    const result = await apiClient.testAliasesEndpoint();
    expect(result.success).toBe(true);
  });
});
```

## Troubleshooting

### Server Connection Issues
- Verify server is running on port 3001
- Check database connection in `.env` file
- Ensure no port conflicts

### Database Issues
- Verify PostgreSQL is accessible
- Check database credentials
- Ensure database exists and is accessible

### Test Failures
- Check HTML report for detailed error information
- Review console logs for database and API errors
- Verify test data cleanup between runs