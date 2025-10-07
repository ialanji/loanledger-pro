# API Debugging Procedures and Maintenance Guide

## Overview

This guide provides comprehensive procedures for debugging API issues, executing tests, and maintaining the health of the aliases and expenses API endpoints. It covers common troubleshooting scenarios, test execution procedures, and ongoing maintenance tasks.

## Common API Issues and Troubleshooting

### 1. 500 Internal Server Errors

#### Symptoms
- API endpoints return HTTP 500 status codes
- Generic error messages without specific details
- Database connection failures
- Missing or malformed response data

#### Debugging Steps

1. **Check Server Logs**
   ```bash
   # View recent server logs
   tail -f server.log
   
   # Search for specific error patterns
   grep "ERROR" server.log | tail -20
   grep "500" server.log | tail -10
   ```

2. **Verify Database Connection**
   ```bash
   # Test database connectivity
   npm run test:db-connection
   
   # Check database status
   psql -h localhost -U your_user -d your_database -c "SELECT 1;"
   ```

3. **Run Diagnostic Tests**
   ```bash
   # Run API diagnostic tests
   npx playwright test tests/api/diagnostic --reporter=html
   
   # Run specific endpoint tests
   npx playwright test tests/api/aliases-diagnostic.spec.js
   npx playwright test tests/api/expenses-diagnostic.spec.js
   ```

#### Common Causes and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Database connection timeout | Connection pool exhausted | Restart server, check connection pool settings |
| Table doesn't exist | Missing database migration | Run table creation scripts |
| SQL syntax errors | Malformed queries | Check query parameters and syntax |
| Memory leaks | Unclosed connections | Review connection handling code |

### 2. Aliases Endpoint Issues

#### Type Filtering Problems

**Symptoms:**
- `/api/aliases?type=department` returns 500 error
- `/api/aliases?type=supplier` returns wrong data
- Type parameter ignored

**Debugging Steps:**
1. Check query parameter handling:
   ```javascript
   console.log('Type parameter:', req.query.type);
   console.log('Generated SQL:', sqlQuery);
   ```

2. Verify database schema:
   ```sql
   \d aliases
   SELECT DISTINCT type FROM aliases;
   ```

3. Test with curl:
   ```bash
   curl -v "http://localhost:8091/api/aliases?type=department"
   curl -v "http://localhost:8091/api/aliases?type=supplier"
   ```

#### Database Table Issues

**Symptoms:**
- "Table 'aliases' doesn't exist" errors
- Schema mismatch errors
- Data type conversion errors

**Solutions:**
1. Create aliases table:
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

2. Verify table structure:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'aliases';
   ```

### 3. Expenses Endpoint Issues

#### CRUD Operation Failures

**Symptoms:**
- POST requests fail with validation errors
- PUT requests don't update data
- DELETE requests return 404 errors
- GET requests return malformed data

**Debugging Steps:**
1. Check request payload:
   ```javascript
   console.log('Request body:', JSON.stringify(req.body, null, 2));
   console.log('Request params:', req.params);
   ```

2. Validate data types:
   ```javascript
   console.log('Amount type:', typeof req.body.amount);
   console.log('Date format:', req.body.date);
   ```

3. Test database operations:
   ```sql
   -- Test insert
   INSERT INTO expenses (date, amount, currency, description) 
   VALUES ('2024-01-01', 100.50, 'MDL', 'Test expense');
   
   -- Test select
   SELECT * FROM expenses WHERE id = 1;
   ```

#### Database Schema Issues

**Solutions:**
1. Create expenses table:
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

2. Add missing indexes:
   ```sql
   CREATE INDEX idx_expenses_date ON expenses(date);
   CREATE INDEX idx_expenses_department ON expenses(department);
   CREATE INDEX idx_expenses_supplier ON expenses(supplier);
   ```

## Test Execution Procedures

### Running Playwright Tests

#### Full Test Suite
```bash
# Run all API tests
npx playwright test tests/api/ --reporter=html

# Run tests with detailed output
npx playwright test tests/api/ --reporter=line --verbose

# Run tests in headed mode for debugging
npx playwright test tests/api/ --headed --debug
```

#### Specific Test Categories
```bash
# Diagnostic tests only
npx playwright test tests/api/diagnostic/

# CRUD operation tests
npx playwright test tests/api/crud/

# Error scenario tests
npx playwright test tests/api/error-scenarios/

# Performance tests
npx playwright test tests/api/performance/
```

#### Test Configuration Options
```bash
# Run tests against different environments
npx playwright test --config=playwright.dev.config.js
npx playwright test --config=playwright.staging.config.js

# Run tests with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox

# Run tests with custom timeout
npx playwright test --timeout=60000
```

### Test Result Interpretation

#### Success Indicators
- All tests pass with green status
- Response times under acceptable thresholds
- No database connection errors
- Proper data validation

#### Failure Analysis
1. **Test Failure Categories:**
   - **Network Errors**: Connection timeouts, DNS issues
   - **HTTP Errors**: 4xx/5xx status codes
   - **Data Validation**: Schema mismatches, type errors
   - **Performance**: Slow response times, timeouts

2. **Reading Test Reports:**
   ```bash
   # Open HTML report
   npx playwright show-report
   
   # View JSON report
   cat test-results/results.json | jq '.suites[0].specs[0]'
   ```

3. **Common Test Patterns:**
   ```javascript
   // Check for specific error patterns in test output
   expect(response.status()).toBe(200);
   expect(response.headers()['content-type']).toContain('application/json');
   expect(await response.json()).toHaveProperty('data');
   ```

### Debugging Failed Tests

#### Step-by-Step Debugging
1. **Identify the failing test:**
   ```bash
   npx playwright test --grep "aliases endpoint with type parameter"
   ```

2. **Run in debug mode:**
   ```bash
   npx playwright test --debug --grep "failing-test-name"
   ```

3. **Add debugging output:**
   ```javascript
   test('debug failing test', async ({ request }) => {
     const response = await request.get('/api/aliases?type=department');
     console.log('Status:', response.status());
     console.log('Headers:', await response.allHeaders());
     console.log('Body:', await response.text());
   });
   ```

4. **Check server logs during test execution:**
   ```bash
   # In one terminal
   tail -f server.log
   
   # In another terminal
   npx playwright test --grep "failing-test"
   ```

## Maintenance Checklist

### Daily Maintenance Tasks

#### System Health Checks
- [ ] Verify API endpoints are responding (200 status)
- [ ] Check database connection pool status
- [ ] Review error logs for new issues
- [ ] Monitor response times and performance metrics

#### Commands for Daily Checks
```bash
# Quick health check
curl -s http://localhost:8091/api/health | jq '.'

# Database connection test
npm run test:db-health

# Check recent errors
grep "ERROR\|WARN" server.log | tail -20

# Performance check
npx playwright test tests/api/performance/ --reporter=json
```

### Weekly Maintenance Tasks

#### Database Maintenance
- [ ] Analyze database performance
- [ ] Check for unused indexes
- [ ] Review query execution plans
- [ ] Clean up old log files

#### Test Suite Maintenance
- [ ] Run full regression test suite
- [ ] Update test data fixtures
- [ ] Review test coverage reports
- [ ] Update test documentation

#### Commands for Weekly Tasks
```bash
# Full test suite
npx playwright test tests/api/ --reporter=html

# Database analysis
psql -d your_database -c "ANALYZE;"
psql -d your_database -c "SELECT * FROM pg_stat_user_tables;"

# Log cleanup
find . -name "*.log" -mtime +7 -delete

# Test coverage
npm run test:coverage
```

### Monthly Maintenance Tasks

#### Security and Updates
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Check for SQL injection vulnerabilities
- [ ] Update API documentation

#### Performance Optimization
- [ ] Analyze slow queries
- [ ] Review connection pool settings
- [ ] Optimize database indexes
- [ ] Update performance benchmarks

#### Commands for Monthly Tasks
```bash
# Dependency updates
npm audit
npm update

# Security scan
npm audit --audit-level=moderate

# Performance analysis
npx playwright test tests/api/performance/ --reporter=json > performance-report.json

# Database optimization
psql -d your_database -c "REINDEX DATABASE your_database;"
```

## Emergency Response Procedures

### Critical API Failures

#### Immediate Response (0-15 minutes)
1. **Assess Impact:**
   ```bash
   # Check if services are running
   ps aux | grep node
   netstat -tlnp | grep :8091
   netstat -tlnp | grep :3001
   ```

2. **Quick Restart:**
   ```bash
   # Restart backend server
   pm2 restart server || npm run server

   # Restart frontend (if needed)
   pm2 restart frontend || npm run dev
   ```

3. **Verify Recovery:**
   ```bash
   curl -s http://localhost:8091/api/health
   curl -s http://localhost:8091/api/aliases
   curl -s http://localhost:8091/api/expenses
   ```

#### Short-term Response (15-60 minutes)
1. **Detailed Diagnosis:**
   ```bash
   # Run diagnostic tests
   npx playwright test tests/api/diagnostic/ --reporter=line

   # Check database connectivity
   npm run test:db-connection

   # Review recent logs
   tail -100 server.log | grep ERROR
   ```

2. **Database Recovery:**
   ```sql
   -- Check database status
   SELECT pg_is_in_recovery();
   
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;
   
   -- Kill long-running queries if needed
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'active' AND query_start < now() - interval '5 minutes';
   ```

#### Long-term Response (1+ hours)
1. **Root Cause Analysis:**
   - Review application logs
   - Analyze database performance
   - Check system resources
   - Review recent code changes

2. **Preventive Measures:**
   - Update monitoring alerts
   - Improve error handling
   - Add additional tests
   - Update documentation

## Monitoring and Alerting

### Key Metrics to Monitor
- API response times (< 500ms target)
- Error rates (< 1% target)
- Database connection pool usage
- Memory and CPU utilization
- Disk space usage

### Setting Up Alerts
```javascript
// Example monitoring script
const monitorAPI = async () => {
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:8091/api/health');
    const duration = Date.now() - start;
    
    if (response.status !== 200) {
      console.error(`API health check failed: ${response.status}`);
      // Send alert
    }
    
    if (duration > 1000) {
      console.warn(`API response slow: ${duration}ms`);
      // Send warning
    }
  } catch (error) {
    console.error('API monitoring failed:', error);
    // Send critical alert
  }
};

// Run every minute
setInterval(monitorAPI, 60000);
```

## Troubleshooting Quick Reference

### Common Error Codes and Solutions

| Error Code | Description | Quick Fix |
|------------|-------------|-----------|
| 500 | Internal Server Error | Check server logs, restart if needed |
| 503 | Service Unavailable | Check database connection |
| 404 | Not Found | Verify endpoint URL and routing |
| 400 | Bad Request | Validate request parameters |
| 429 | Too Many Requests | Check rate limiting |

### Emergency Contacts and Escalation

1. **Level 1**: Development Team
   - Check logs and restart services
   - Run diagnostic tests
   - Apply quick fixes

2. **Level 2**: System Administration
   - Database recovery procedures
   - Infrastructure issues
   - Performance optimization

3. **Level 3**: Management Escalation
   - Business impact assessment
   - External vendor coordination
   - Communication to stakeholders

## Documentation Updates

This document should be updated:
- After each major API change
- When new debugging procedures are discovered
- After significant incidents or outages
- During quarterly maintenance reviews

Last updated: [Current Date]
Version: 1.0