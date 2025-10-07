# Monitoring and Debugging Infrastructure

## Overview

This document describes the comprehensive monitoring and debugging infrastructure implemented for the API debugging fix project. The system provides detailed logging, health monitoring, performance tracking, and automated alerting capabilities.

## Components

### 1. Structured Logging System (`src/utils/logger.js`)

#### Core Features
- **Multi-level logging**: ERROR, WARN, INFO, DEBUG, TRACE
- **Structured JSON output** in production, pretty-printed in development
- **Context-aware logging** with request IDs and session tracking
- **Automatic data sanitization** to remove sensitive information
- **Performance categorization** for timing metrics

#### Logger Classes
- **Logger**: Base logger with context support
- **RequestLogger**: Specialized for HTTP request/response logging
- **DatabaseLogger**: Database query and connection logging
- **PerformanceLogger**: Performance metrics and timing

#### Usage Examples
```javascript
import { logger, requestLogger, dbLogger, perfLogger } from './src/utils/logger.js';

// Basic logging
logger.info('Application started', { port: 3001 });

// Request logging (automatic via middleware)
const reqLogger = new RequestLogger();
reqLogger.logRequest(req);
reqLogger.logResponse(req, res, responseData);

// Database logging
const startTime = dbLogger.logQuery('SELECT * FROM users WHERE id = $1', [userId]);
dbLogger.logQueryComplete(startTime, result.rowCount);

// Performance logging
perfLogger.startTimer('expensive_operation');
// ... do work ...
perfLogger.endTimer('expensive_operation');
```

### 2. Request/Response Logging Middleware (`src/middleware/request-logging.js`)

#### Features
- **Automatic request/response logging** for all API endpoints
- **Unique request ID generation** for request tracking
- **Database query logging** with timing and error capture
- **Connection pool monitoring** with statistics
- **Error logging middleware** for unhandled errors
- **Performance monitoring** with slow request detection
- **Health check logging** with minimal overhead

#### Middleware Components
- `requestLoggingMiddleware`: Logs all HTTP requests and responses
- `createDatabaseQueryLogger`: Wraps database pool for query logging
- `createConnectionPoolMonitor`: Monitors connection pool events
- `errorLoggingMiddleware`: Captures unhandled errors with context
- `performanceMonitoringMiddleware`: Tracks request performance
- `healthCheckLoggingMiddleware`: Lightweight logging for health checks

### 3. API-Specific Logging (`src/utils/api-logger.js`)

#### Features
- **API operation logging** with standardized patterns
- **CRUD operation helpers** for common database operations
- **Data sanitization** for request/response bodies
- **Validation error logging** with detailed context

#### Usage Examples
```javascript
import { createAPILogger, CRUDLogger } from './src/utils/api-logger.js';

const apiLogger = createAPILogger('/api/users');

// Log CRUD operations
CRUDLogger.create(apiLogger, 'user', userData, result);
CRUDLogger.read(apiLogger, 'user', filters, count);
CRUDLogger.update(apiLogger, 'user', userId, updateData, result);
CRUDLogger.delete(apiLogger, 'user', userId, result);

// Log validation errors
apiLogger.logValidationError(errors, requestData);
```

### 4. System Health Monitoring (`src/utils/monitoring.js`)

#### Features
- **Automated health checks** with configurable intervals
- **Multi-dimensional monitoring**: database, memory, connections, error rates
- **Alert generation** with threshold-based triggers
- **Metrics collection** for requests, database queries, and system resources
- **External alerting integration** (webhook support)

#### Monitoring Dimensions
- **Database Health**: Connection status, query response times
- **Memory Usage**: Heap utilization, memory leaks detection
- **Connection Pool**: Pool utilization, waiting requests
- **Error Rates**: Request success/failure ratios
- **Response Times**: Average, P95, maximum response times

#### Configuration
```javascript
const systemMonitor = initializeSystemMonitoring(pool, {
  checkInterval: 60000, // 1 minute
  alertThresholds: {
    responseTime: 5000, // 5 seconds
    memoryUsage: 0.85, // 85% of heap
    errorRate: 0.1, // 10% error rate
    connectionPoolUsage: 0.8 // 80% of max connections
  }
});
```

### 5. Debug and Monitoring Endpoints (`src/routes/debug-routes.js`)

#### Available Endpoints

##### System Health
- `GET /api/debug/health` - Comprehensive system health check
- `GET /api/debug/database` - Database connection and query status
- `GET /api/debug/performance` - Performance metrics and memory usage
- `POST /api/debug/health-check` - Trigger manual health check

##### Monitoring and Alerts
- `GET /api/debug/monitoring` - Current system metrics and monitoring data
- `GET /api/debug/alerts` - Recent system alerts and notifications

##### Configuration and Testing
- `GET /api/debug/logging` - Current logging configuration
- `POST /api/debug/test-logging` - Generate test log entries
- `GET /api/debug/system` - System information and environment details

#### Response Examples

**Health Check Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-06T20:57:05.717Z",
  "uptime": 123.45,
  "memory": {
    "heapUsed": 45.2,
    "heapTotal": 67.8,
    "external": 12.3,
    "rss": 89.1
  },
  "database": {
    "healthy": true,
    "responseTime": 15
  },
  "connectionPool": {
    "totalConnections": 3,
    "idleConnections": 2,
    "waitingRequests": 0,
    "maxConnections": 20
  }
}
```

**Monitoring Metrics Response:**
```json
{
  "requests": {
    "total": 1247,
    "errors": 23,
    "responseTimes": [12, 45, 23, 67, ...]
  },
  "database": {
    "queries": 892,
    "errors": 5,
    "responseTimes": [8, 15, 12, 34, ...]
  },
  "system": {
    "uptime": 3600,
    "memoryUsage": {...},
    "isMonitoring": true,
    "lastHealthCheck": {...}
  },
  "recentAlerts": [...]
}
```

## Configuration

### Environment Variables

#### Logging Configuration
- `LOG_LEVEL`: Logging level (ERROR, WARN, INFO, DEBUG, TRACE)
- `LOG_RESPONSE_BODY`: Include response body in logs (true/false)
- `LOG_ALL_REQUESTS`: Log all requests, not just API requests (true/false)
- `SKIP_LOG_PATHS`: Comma-separated paths to skip logging
- `REQUEST_TIMEOUT`: Request timeout in milliseconds

#### Monitoring Configuration
- `LOG_POOL_STATS`: Enable periodic connection pool statistics (true/false)
- `POOL_STATS_INTERVAL`: Pool statistics logging interval in milliseconds
- `ALERT_WEBHOOK_URL`: Webhook URL for external alerting

### Default Settings
```javascript
{
  logLevel: 'INFO',
  requestTimeout: 30000,
  monitoringInterval: 60000,
  alertThresholds: {
    responseTime: 5000,
    memoryUsage: 0.85,
    errorRate: 0.1,
    connectionPoolUsage: 0.8
  }
}
```

## Integration

### Server Integration
The monitoring and debugging infrastructure is automatically integrated into the server startup:

```javascript
// Logging middleware
app.use(requestLoggingMiddleware);
app.use(performanceMonitoringMiddleware);
app.use(errorLoggingMiddleware);

// Database logging
createDatabaseQueryLogger(pool);
createConnectionPoolMonitor(pool);

// System monitoring
const systemMonitor = initializeSystemMonitoring(pool);
app.use(createMonitoringMiddleware(systemMonitor));

// Debug routes
setupDebugRoutes(app, pool);
```

### Testing Integration
Comprehensive test suite for the logging system:

```javascript
// Test file: tests/api/playwright/logging-system.test.js
test('should provide system health information', async () => {
  const response = await apiClient.request.get('/api/debug/health');
  expect(response.ok()).toBe(true);
  // ... verify health data structure
});
```

## Benefits

### For Development
- **Detailed request/response logging** for debugging API issues
- **Performance metrics** to identify slow operations
- **Database query logging** with timing information
- **Error context capture** for faster issue resolution

### For Production
- **Automated health monitoring** with alerting
- **Performance tracking** and trend analysis
- **Resource utilization monitoring** (memory, connections)
- **Error rate monitoring** and alerting

### For Operations
- **Comprehensive health checks** via API endpoints
- **System metrics** accessible via HTTP endpoints
- **Alert history** and monitoring dashboard data
- **Manual health check triggers** for troubleshooting

## Troubleshooting

### Common Issues

#### High Memory Usage
1. Check `/api/debug/performance` for memory metrics
2. Review recent alerts at `/api/debug/alerts`
3. Monitor heap usage trends over time

#### Slow Response Times
1. Check `/api/debug/monitoring` for response time metrics
2. Review database query performance in logs
3. Check connection pool utilization

#### Database Connection Issues
1. Use `/api/debug/database` for connection status
2. Review connection pool statistics
3. Check database health check results

#### High Error Rates
1. Monitor error rate metrics at `/api/debug/monitoring`
2. Review error logs for patterns
3. Check recent alerts for error spikes

### Log Analysis
The structured logging format makes it easy to analyze logs:

```bash
# Filter by log level
grep '"level":"ERROR"' application.log

# Filter by category
grep '"category":"DATABASE"' application.log

# Filter by request ID
grep '"requestId":"abc123"' application.log

# Extract performance metrics
grep '"category":"PERFORMANCE"' application.log | jq '.data.duration'
```

## Future Enhancements

### Planned Features
- **Metrics export** to Prometheus/Grafana
- **Log aggregation** integration (ELK stack)
- **Custom alert rules** configuration
- **Performance baseline** establishment
- **Automated scaling** triggers based on metrics

### Integration Opportunities
- **External monitoring** services (DataDog, New Relic)
- **Incident management** systems (PagerDuty, Opsgenie)
- **Chat notifications** (Slack, Microsoft Teams)
- **Dashboard visualization** (Grafana, custom dashboards)

This comprehensive monitoring and debugging infrastructure provides the foundation for maintaining a healthy, performant, and observable API system.