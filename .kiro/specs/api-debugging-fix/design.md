# Design Document

## Overview

This design outlines a systematic approach to debugging and fixing the 500 Internal Server Error issues affecting the `/aliases` and `/expenses` API endpoints. The solution combines Playwright-based automated testing with targeted server-side fixes to restore full functionality to these critical financial management endpoints.

## Architecture

### Testing Architecture
- **Playwright Test Framework**: Automated API testing with comprehensive error capture
- **Test Environment**: Local development server (localhost:8091) with backend on port 3001
- **Error Capture System**: Detailed logging and response analysis for debugging
- **Database State Verification**: Tests to verify table existence and data integrity

### API Layer Architecture
- **Express.js Server**: Enhanced error handling and logging middleware
- **PostgreSQL Database**: Improved connection handling and query error management
- **Response Formatting**: Standardized error responses with debugging information
- **Middleware Stack**: Request logging, error capture, and database state validation

## Components and Interfaces

### Playwright Test Suite Components

#### API Test Client
```typescript
interface APITestClient {
  testAliasesEndpoint(type?: 'department' | 'supplier'): Promise<TestResult>
  testExpensesEndpoint(): Promise<TestResult>
  testCRUDOperations(endpoint: string): Promise<TestResult>
  captureErrorDetails(response: Response): Promise<ErrorDetails>
}
```

#### Test Result Interface
```typescript
interface TestResult {
  success: boolean
  statusCode: number
  responseTime: number
  errorDetails?: ErrorDetails
  databaseState?: DatabaseState
}
```

#### Error Details Interface
```typescript
interface ErrorDetails {
  message: string
  stack?: string
  sqlError?: string
  requestContext: RequestContext
  timestamp: string
}
```

### Server-Side Components

#### Enhanced Error Handler
```javascript
interface ErrorHandler {
  logError(error: Error, context: RequestContext): void
  formatErrorResponse(error: Error): ErrorResponse
  handleDatabaseError(error: DatabaseError): ErrorResponse
}
```

#### Database Connection Manager
```javascript
interface DatabaseManager {
  ensureTableExists(tableName: string): Promise<boolean>
  executeQuery(query: string, params: any[]): Promise<QueryResult>
  handleConnectionError(error: Error): Promise<void>
}
```

## Data Models

### Aliases Table Schema
```sql
CREATE TABLE IF NOT EXISTS aliases (
  id SERIAL PRIMARY KEY,
  source_value VARCHAR(255) NOT NULL,
  normalized_value VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'supplier',
  is_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Expenses Table Schema
```sql
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  source VARCHAR(255),
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'MDL',
  department VARCHAR(255),
  supplier VARCHAR(255),
  category VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Test Data Models
```typescript
interface TestAlias {
  source_value: string
  normalized_value: string
  type: 'department' | 'supplier'
  is_group: boolean
}

interface TestExpense {
  source: string
  date: string
  amount: number
  currency: string
  department?: string
  supplier?: string
  category?: string
  description?: string
}
```

## Error Handling

### API Error Response Format
```typescript
interface APIErrorResponse {
  error: string
  details?: string
  timestamp: string
  requestId: string
  debugInfo?: {
    sqlError?: string
    stackTrace?: string
    databaseState?: string
  }
}
```

### Database Error Handling Strategy
1. **Connection Errors**: Implement retry logic with exponential backoff
2. **Query Errors**: Log specific SQL errors and return user-friendly messages
3. **Table Missing**: Automatically create tables with proper schema
4. **Data Validation**: Validate input data before database operations

### Playwright Error Capture
1. **Response Analysis**: Capture full response headers and body
2. **Network Timing**: Record request/response timing for performance analysis
3. **Console Logs**: Capture browser console errors and warnings
4. **Screenshot Capture**: Visual debugging for UI-related issues

## Testing Strategy

### Test Categories

#### Unit Tests for API Endpoints
- Individual endpoint functionality
- Parameter validation
- Error response formatting
- Database query execution

#### Integration Tests
- End-to-end API workflows
- Database connectivity
- Cross-endpoint data consistency
- Error propagation

#### Performance Tests
- Response time benchmarks
- Concurrent request handling
- Database connection pooling
- Memory usage monitoring

### Test Scenarios

#### Aliases Endpoint Tests
1. **GET /api/aliases** - Retrieve all aliases
2. **GET /api/aliases?type=department** - Filter by department type
3. **GET /api/aliases?type=supplier** - Filter by supplier type
4. **POST /api/aliases** - Create new alias
5. **PUT /api/aliases/:id** - Update existing alias
6. **DELETE /api/aliases/:id** - Delete alias

#### Expenses Endpoint Tests
1. **GET /api/expenses** - Retrieve all expenses
2. **POST /api/expenses** - Create new expense
3. **PUT /api/expenses/:id** - Update existing expense
4. **DELETE /api/expenses/:id** - Delete expense

#### Error Scenario Tests
1. **Database Connection Failure** - Test error handling when DB is unavailable
2. **Invalid Parameters** - Test validation error responses
3. **Missing Tables** - Test automatic table creation
4. **SQL Injection Attempts** - Test parameter sanitization

### Test Implementation Approach

#### Playwright Configuration
```typescript
// playwright.config.ts
export default {
  testDir: './tests/api',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:8091',
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
}
```

#### Test Data Management
- **Setup**: Create test data before each test suite
- **Cleanup**: Remove test data after test completion
- **Isolation**: Ensure tests don't interfere with each other
- **Fixtures**: Reusable test data and helper functions

## Implementation Plan

### Phase 1: Diagnostic Testing
1. Create Playwright test suite for current API endpoints
2. Capture detailed error information from failing endpoints
3. Analyze database connection and query execution
4. Document specific failure points and error patterns

### Phase 2: Server-Side Fixes
1. Implement enhanced error handling middleware
2. Fix database query issues in aliases endpoint
3. Add proper type filtering for aliases
4. Improve expenses endpoint error handling
5. Add comprehensive logging for debugging

### Phase 3: Test Coverage Expansion
1. Add comprehensive CRUD operation tests
2. Implement error scenario testing
3. Add performance and load testing
4. Create regression test suite

### Phase 4: Monitoring and Maintenance
1. Set up continuous API monitoring
2. Implement automated error alerting
3. Create debugging documentation
4. Establish maintenance procedures

## Security Considerations

### Input Validation
- Sanitize all user inputs to prevent SQL injection
- Validate data types and ranges for all parameters
- Implement rate limiting for API endpoints

### Error Information Disclosure
- Avoid exposing sensitive database information in error messages
- Log detailed errors server-side while returning generic messages to clients
- Implement proper authentication and authorization checks

### Database Security
- Use parameterized queries for all database operations
- Implement proper connection pooling and timeout handling
- Regular security updates and vulnerability scanning