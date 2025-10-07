# Test Execution Guide

## Overview

This guide provides comprehensive procedures for executing Playwright tests for the API debugging and maintenance system. It covers test setup, execution, result interpretation, and troubleshooting.

## Test Environment Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database running
- API server running on localhost:8091
- Backend server running on localhost:3001

### Initial Setup
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Verify environment
npm run test:env-check
```

### Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname
# API_BASE_URL=http://localhost:8091
# BACKEND_URL=http://localhost:3001
```

## Test Categories and Execution

### 1. Diagnostic Tests

**Purpose:** Identify and capture detailed information about API failures

**Location:** `tests/api/diagnostic/`

**Execution:**
```bash
# Run all diagnostic tests
npx playwright test tests/api/diagnostic/ --reporter=html

# Run specific diagnostic tests
npx playwright test tests/api/diagnostic/aliases-diagnostic.spec.js
npx playwright test tests/api/diagnostic/expenses-diagnostic.spec.js

# Run with verbose output
npx playwright test tests/api/diagnostic/ --reporter=line --verbose
```

**Expected Output:**
- Detailed error capture for failing endpoints
- Database connection status
- Response timing information
- Stack traces for server errors

### 2. CRUD Operation Tests

**Purpose:** Verify Create, Read, Update, Delete operations work correctly

**Location:** `tests/api/crud/`

**Execution:**
```bash
# Run all CRUD tests
npx playwright test tests/api/crud/ --reporter=html

# Test aliases CRUD operations
npx playwright test tests/api/crud/aliases-crud.spec.js

# Test expenses CRUD operations
npx playwright test tests/api/crud/expenses-crud.spec.js
```

**Test Scenarios:**
- Create new records with valid data
- Read records with various filters
- Update existing records
- Delete records and verify removal

### 3. Error Scenario Tests

**Purpose:** Test error handling and edge cases

**Location:** `tests/api/error-scenarios/`

**Execution:**
```bash
# Run all error scenario tests
npx playwright test tests/api/error-scenarios/ --reporter=html

# Test database connection failures
npx playwright test tests/api/error-scenarios/db-connection-failure.spec.js

# Test invalid parameter handling
npx playwright test tests/api/error-scenarios/invalid-parameters.spec.js
```

**Test Scenarios:**
- Database connection failures
- Invalid request parameters
- Missing required fields
- SQL injection attempts
- Rate limiting scenarios

### 4. Performance Tests

**Purpose:** Measure API response times and performance metrics

**Location:** `tests/api/performance/`

**Execution:**
```bash
# Run performance tests
npx playwright test tests/api/performance/ --reporter=json

# Run response time tests
npx playwright test tests/api/performance/response-time.spec.js

# Run load tests
npx playwright test tests/api/performance/load-test.spec.js --workers=5
```

**Performance Targets:**
- Response time < 500ms for simple queries
- Response time < 2000ms for complex queries
- Concurrent request handling (10+ simultaneous requests)
- Memory usage stability during load

### 5. Integration Tests

**Purpose:** Test end-to-end workflows and data consistency

**Location:** `tests/api/integration/`

**Execution:**
```bash
# Run integration tests
npx playwright test tests/api/integration/ --reporter=html

# Test cross-endpoint workflows
npx playwright test tests/api/integration/workflow.spec.js
```

## Test Execution Options

### Reporter Options

#### HTML Reporter (Recommended for detailed analysis)
```bash
npx playwright test --reporter=html
# Opens browser with detailed test results
npx playwright show-report
```

#### Line Reporter (Good for CI/CD)
```bash
npx playwright test --reporter=line
# Provides concise output suitable for logs
```

#### JSON Reporter (For automated processing)
```bash
npx playwright test --reporter=json --output-dir=test-results/
# Generates machine-readable test results
```

#### Custom Reporter Configuration
```bash
# Multiple reporters
npx playwright test --reporter=html,json,line
```

### Execution Modes

#### Headed Mode (For debugging)
```bash
npx playwright test --headed
# Shows browser window during test execution
```

#### Debug Mode (Step-by-step debugging)
```bash
npx playwright test --debug
# Pauses execution for manual inspection
```

#### Parallel Execution
```bash
# Run tests in parallel (default)
npx playwright test --workers=4

# Run tests sequentially
npx playwright test --workers=1
```

#### Retry Configuration
```bash
# Retry failed tests
npx playwright test --retries=2

# No retries (fail fast)
npx playwright test --retries=0
```

### Test Filtering

#### By Test Name
```bash
# Run specific test
npx playwright test --grep "aliases endpoint returns data"

# Exclude specific tests
npx playwright test --grep-invert "slow test"
```

#### By File Pattern
```bash
# Run tests matching pattern
npx playwright test tests/api/diagnostic/

# Run specific file
npx playwright test tests/api/aliases-diagnostic.spec.js
```

#### By Project Configuration
```bash
# Run tests for specific browser
npx playwright test --project=chromium

# Run tests for all browsers
npx playwright test --project=chromium,firefox,webkit
```

## Test Result Interpretation

### Success Indicators

#### Passing Tests
```
✓ aliases endpoint returns data (1.2s)
✓ expenses endpoint handles CRUD operations (2.1s)
✓ error handling works correctly (0.8s)

3 passed (4.1s)
```

#### Performance Metrics
```json
{
  "test": "API response time",
  "duration": 450,
  "status": "passed",
  "metrics": {
    "responseTime": 245,
    "databaseQueryTime": 120,
    "totalRequestTime": 450
  }
}
```

### Failure Analysis

#### Common Failure Patterns

**Network/Connection Failures:**
```
✗ aliases endpoint test
  Error: connect ECONNREFUSED 127.0.0.1:8091
```
**Solution:** Verify API server is running

**HTTP Error Responses:**
```
✗ expenses endpoint test
  Expected: 200
  Received: 500
  Response: {"error": "Internal Server Error"}
```
**Solution:** Check server logs for detailed error information

**Timeout Failures:**
```
✗ performance test
  Error: Test timeout of 30000ms exceeded
```
**Solution:** Increase timeout or investigate performance issues

**Data Validation Failures:**
```
✗ data structure test
  Expected property 'data' to be array
  Received: undefined
```
**Solution:** Verify API response format

### Detailed Error Analysis

#### Reading HTML Reports
1. Open the HTML report: `npx playwright show-report`
2. Click on failed tests to see details
3. Review request/response data
4. Check screenshots (if available)
5. Examine console logs

#### Analyzing JSON Reports
```bash
# Extract failed tests
cat test-results/results.json | jq '.suites[].specs[] | select(.tests[].results[].status == "failed")'

# Get performance metrics
cat test-results/results.json | jq '.suites[].specs[].tests[].results[].attachments[]'

# Summary statistics
cat test-results/results.json | jq '.stats'
```

## Debugging Failed Tests

### Step-by-Step Debugging Process

#### 1. Identify the Failing Test
```bash
# Run only the failing test
npx playwright test --grep "specific failing test name"
```

#### 2. Enable Debug Mode
```bash
# Run with debugging enabled
npx playwright test --debug --grep "failing test"
```

#### 3. Add Console Logging
```javascript
test('debug failing test', async ({ request }) => {
  console.log('Starting test execution');
  
  const response = await request.get('/api/aliases');
  console.log('Response status:', response.status());
  console.log('Response headers:', await response.allHeaders());
  
  const body = await response.text();
  console.log('Response body:', body);
  
  // Add assertions
  expect(response.status()).toBe(200);
});
```

#### 4. Check Server Logs
```bash
# Monitor server logs during test execution
tail -f server.log | grep -E "(ERROR|WARN|INFO)"
```

#### 5. Database State Verification
```javascript
test('verify database state', async ({ request }) => {
  // Check if tables exist
  const dbCheck = await request.get('/api/debug/db-status');
  console.log('Database status:', await dbCheck.json());
  
  // Check data
  const dataCheck = await request.get('/api/debug/table-counts');
  console.log('Table counts:', await dataCheck.json());
});
```

### Common Debugging Scenarios

#### Database Connection Issues
```javascript
test('debug database connection', async ({ request }) => {
  // Test database connectivity
  const healthCheck = await request.get('/api/health');
  const health = await healthCheck.json();
  
  console.log('Database connected:', health.database.connected);
  console.log('Connection pool:', health.database.pool);
  
  if (!health.database.connected) {
    console.error('Database connection failed');
    // Additional debugging steps
  }
});
```

#### API Response Format Issues
```javascript
test('debug response format', async ({ request }) => {
  const response = await request.get('/api/aliases');
  const contentType = response.headers()['content-type'];
  
  console.log('Content-Type:', contentType);
  
  if (contentType.includes('application/json')) {
    const data = await response.json();
    console.log('JSON data structure:', Object.keys(data));
  } else {
    const text = await response.text();
    console.log('Non-JSON response:', text.substring(0, 200));
  }
});
```

#### Performance Issues
```javascript
test('debug performance', async ({ request }) => {
  const start = Date.now();
  
  const response = await request.get('/api/expenses');
  const duration = Date.now() - start;
  
  console.log('Request duration:', duration, 'ms');
  console.log('Response size:', (await response.text()).length, 'bytes');
  
  if (duration > 1000) {
    console.warn('Slow response detected');
    // Additional performance analysis
  }
});
```

## Test Data Management

### Test Data Setup
```javascript
// Setup test data before tests
test.beforeEach(async ({ request }) => {
  // Create test aliases
  await request.post('/api/aliases', {
    data: {
      source_value: 'Test Department',
      normalized_value: 'test-department',
      type: 'department'
    }
  });
  
  // Create test expenses
  await request.post('/api/expenses', {
    data: {
      date: '2024-01-01',
      amount: 100.50,
      currency: 'MDL',
      description: 'Test expense'
    }
  });
});
```

### Test Data Cleanup
```javascript
// Cleanup test data after tests
test.afterEach(async ({ request }) => {
  // Delete test data
  await request.delete('/api/test-data/cleanup');
});
```

### Data Fixtures
```javascript
// tests/fixtures/test-data.js
export const testAliases = [
  {
    source_value: 'Marketing Dept',
    normalized_value: 'marketing-dept',
    type: 'department'
  },
  {
    source_value: 'ABC Supplier',
    normalized_value: 'abc-supplier',
    type: 'supplier'
  }
];

export const testExpenses = [
  {
    date: '2024-01-01',
    amount: 150.00,
    currency: 'MDL',
    department: 'Marketing',
    description: 'Office supplies'
  }
];
```

## Continuous Integration Setup

### GitHub Actions Configuration
```yaml
# .github/workflows/api-tests.yml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start servers
        run: |
          npm run server &
          npm run dev &
          sleep 10
      
      - name: Run API tests
        run: npx playwright test tests/api/ --reporter=html
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Local CI Simulation
```bash
# Run tests as they would run in CI
npm run test:ci

# Or manually simulate CI environment
export CI=true
export NODE_ENV=test
npx playwright test --reporter=html,json
```

## Best Practices

### Test Writing Guidelines
1. **Use descriptive test names**
   ```javascript
   test('aliases endpoint returns filtered results when type parameter is provided', async ({ request }) => {
     // Test implementation
   });
   ```

2. **Include proper assertions**
   ```javascript
   expect(response.status()).toBe(200);
   expect(response.headers()['content-type']).toContain('application/json');
   expect(data).toHaveProperty('results');
   expect(data.results).toBeInstanceOf(Array);
   ```

3. **Handle async operations properly**
   ```javascript
   const response = await request.get('/api/aliases');
   const data = await response.json();
   ```

4. **Clean up test data**
   ```javascript
   test.afterEach(async ({ request }) => {
     await request.delete('/api/test-data/cleanup');
   });
   ```

### Performance Considerations
- Run performance tests separately from functional tests
- Use appropriate timeouts for different test types
- Monitor resource usage during test execution
- Clean up test data to prevent database bloat

### Error Handling
- Always check response status codes
- Validate response data structure
- Handle network timeouts gracefully
- Log sufficient debugging information

## Troubleshooting Common Issues

### Test Environment Issues
**Problem:** Tests fail with connection errors
**Solution:**
```bash
# Check if servers are running
netstat -tlnp | grep :8091
netstat -tlnp | grep :3001

# Start servers if needed
npm run server &
npm run dev &
```

**Problem:** Database connection failures
**Solution:**
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Verify database exists
psql -h localhost -U postgres -l
```

### Test Data Issues
**Problem:** Tests fail due to existing data
**Solution:**
```bash
# Clear test database
npm run db:reset:test

# Or run cleanup script
npm run test:cleanup
```

**Problem:** Inconsistent test results
**Solution:**
- Ensure proper test isolation
- Use unique test data for each test
- Implement proper cleanup procedures

### Performance Issues
**Problem:** Tests are slow
**Solution:**
- Increase test timeouts
- Optimize database queries
- Use connection pooling
- Run tests in parallel

## Reporting and Documentation

### Test Result Reports
- HTML reports for detailed analysis
- JSON reports for automated processing
- Performance metrics tracking
- Error trend analysis

### Documentation Updates
- Update test procedures after API changes
- Document new test scenarios
- Maintain troubleshooting guides
- Review and update quarterly

---

**Last Updated:** [Current Date]  
**Version:** 1.0  
**Next Review:** [Date + 3 months]