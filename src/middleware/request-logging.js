/**
 * Comprehensive request/response logging middleware
 * Provides detailed logging of all API requests with timing and performance metrics
 */

import { RequestLogger, DatabaseLogger, PerformanceLogger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate unique request ID for tracking
 */
function generateRequestId() {
  return uuidv4().split('-')[0]; // Short UUID for readability
}

/**
 * Extract client information from request
 */
function extractClientInfo(req) {
  return {
    ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    origin: req.get('Origin'),
    forwarded: req.get('X-Forwarded-For'),
    realIp: req.get('X-Real-IP')
  };
}

/**
 * Determine if request should be logged based on path and configuration
 */
function shouldLogRequest(req) {
  const path = req.path;
  
  // Skip logging for certain paths if configured
  const skipPaths = process.env.SKIP_LOG_PATHS?.split(',') || [];
  if (skipPaths.some(skipPath => path.startsWith(skipPath.trim()))) {
    return false;
  }

  // Always log API requests
  if (path.startsWith('/api/')) {
    return true;
  }

  // Log other requests only if explicitly enabled
  return process.env.LOG_ALL_REQUESTS === 'true';
}

/**
 * Main request logging middleware
 */
export function requestLoggingMiddleware(req, res, next) {
  // Skip if logging is disabled for this request
  if (!shouldLogRequest(req)) {
    return next();
  }

  // Generate unique request ID
  const requestId = generateRequestId();
  req.requestId = requestId;

  // Create request-specific logger
  const reqLogger = new RequestLogger();
  reqLogger.setContext({ requestId });

  // Store start time for performance measurement
  const startTime = Date.now();
  req.startTime = startTime;

  // Extract client information
  const clientInfo = extractClientInfo(req);

  // Log incoming request
  reqLogger.logRequest(req);

  // Store original response methods to intercept them
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  let responseLogged = false;
  let responseData = null;

  // Intercept res.json to capture response data
  res.json = function(data) {
    responseData = data;
    if (!responseLogged) {
      logResponse();
    }
    return originalJson.call(this, data);
  };

  // Intercept res.send to capture response data
  res.send = function(data) {
    if (!responseData && data) {
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        responseData = data;
      }
    }
    if (!responseLogged) {
      logResponse();
    }
    return originalSend.call(this, data);
  };

  // Intercept res.end as fallback
  res.end = function(data) {
    if (!responseLogged) {
      logResponse();
    }
    return originalEnd.call(this, data);
  };

  // Function to log response
  function logResponse() {
    if (responseLogged) return;
    responseLogged = true;

    const duration = Date.now() - startTime;
    
    // Log response with performance metrics
    reqLogger.logResponse(req, res, responseData);

    // Log performance metrics for slow requests
    if (duration > 1000) {
      const perfLogger = new PerformanceLogger();
      perfLogger.setContext({ requestId });
      perfLogger.info('Slow request detected', {
        duration,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode
      });
    }

    // Log error details for failed requests
    if (res.statusCode >= 400) {
      reqLogger.warn('Request failed', {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        duration,
        clientInfo,
        responseData: responseData || 'No response data'
      });
    }
  }

  // Handle request timeout
  const timeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
  const timeoutId = setTimeout(() => {
    if (!responseLogged) {
      reqLogger.error('Request timeout', {
        duration: Date.now() - startTime,
        timeout,
        method: req.method,
        url: req.url
      });
    }
  }, timeout);

  // Clear timeout when response is sent
  res.on('finish', () => {
    clearTimeout(timeoutId);
  });

  next();
}

/**
 * Database query logging middleware
 * Wraps database operations to provide detailed query logging
 */
export function createDatabaseQueryLogger(pool) {
  const dbLogger = new DatabaseLogger();
  
  // Store original query method
  const originalQuery = pool.query.bind(pool);
  
  // Override query method to add logging
  pool.query = async function(text, params = [], callback) {
    const queryId = generateRequestId();
    const startTime = dbLogger.logQuery(text, params, { queryId });
    
    try {
      let result;
      
      if (typeof params === 'function') {
        // Handle query(text, callback) format
        callback = params;
        params = [];
        result = await originalQuery(text, callback);
      } else if (callback) {
        // Handle query(text, params, callback) format
        result = await originalQuery(text, params, callback);
      } else {
        // Handle promise-based query
        result = await originalQuery(text, params);
      }
      
      dbLogger.logQueryComplete(startTime, result.rowCount || 0, { queryId });
      return result;
      
    } catch (error) {
      dbLogger.logQueryError(startTime, error, text, params, { queryId });
      throw error;
    }
  };

  return pool;
}

/**
 * Connection pool monitoring middleware
 */
export function createConnectionPoolMonitor(pool) {
  const dbLogger = new DatabaseLogger();
  
  // Monitor connection events if pool supports it
  if (pool.on) {
    pool.on('connect', (client) => {
      dbLogger.logConnection('established', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      });
    });

    pool.on('remove', (client) => {
      dbLogger.logConnection('removed', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      });
    });

    pool.on('error', (err, client) => {
      dbLogger.error('Connection pool error', {
        error: {
          message: err.message,
          code: err.code,
          stack: err.stack
        },
        poolStats: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        }
      });
    });
  }

  // Periodic pool statistics logging
  if (process.env.LOG_POOL_STATS === 'true') {
    setInterval(() => {
      dbLogger.info('Connection pool statistics', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
        maxConnections: pool.options?.max || 'unknown'
      });
    }, parseInt(process.env.POOL_STATS_INTERVAL) || 60000); // Default 1 minute
  }

  return pool;
}

/**
 * Error logging middleware
 * Captures and logs unhandled errors with full context
 */
export function errorLoggingMiddleware(err, req, res, next) {
  const reqLogger = new RequestLogger();
  
  if (req.requestId) {
    reqLogger.setContext({ requestId: req.requestId });
  }

  const errorData = {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode || 500,
    name: err.name,
    type: err.constructor.name
  };

  const requestContext = {
    method: req.method,
    url: req.url,
    headers: reqLogger.sanitizeHeaders(req.headers),
    body: reqLogger.sanitizeBody(req.body),
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  reqLogger.error('Unhandled request error', errorData, {
    request: requestContext,
    duration: req.startTime ? Date.now() - req.startTime : undefined
  });

  next(err);
}

/**
 * Performance monitoring middleware
 * Tracks and logs performance metrics for requests
 */
export function performanceMonitoringMiddleware(req, res, next) {
  const perfLogger = new PerformanceLogger();
  
  if (req.requestId) {
    perfLogger.setContext({ requestId: req.requestId });
  }

  // Start performance timer
  const timerName = `${req.method} ${req.path}`;
  perfLogger.startTimer(timerName, {
    method: req.method,
    path: req.path,
    url: req.url
  });

  // Log memory usage for memory-intensive operations
  if (req.method === 'POST' || req.method === 'PUT') {
    perfLogger.logMemoryUsage({ operation: 'before_request' });
  }

  // Override response to capture timing
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = perfLogger.endTimer(timerName, {
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length')
    });

    // Log memory usage after memory-intensive operations
    if (req.method === 'POST' || req.method === 'PUT') {
      perfLogger.logMemoryUsage({ operation: 'after_request' });
    }

    // Log slow requests with additional context
    if (duration && duration > 2000) {
      perfLogger.warn('Very slow request detected', {
        duration,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        recommendation: 'Consider optimizing this endpoint'
      });
    }

    return originalEnd.apply(this, args);
  };

  next();
}

/**
 * Health check logging middleware
 * Logs health check requests separately with minimal overhead
 */
export function healthCheckLoggingMiddleware(req, res, next) {
  // Only apply to health check endpoints
  if (!req.path.includes('health') && !req.path.includes('ping')) {
    return next();
  }

  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Use simple console.log for health checks to reduce overhead
    console.log(`[HEALTH] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
}

export default {
  requestLoggingMiddleware,
  createDatabaseQueryLogger,
  createConnectionPoolMonitor,
  errorLoggingMiddleware,
  performanceMonitoringMiddleware,
  healthCheckLoggingMiddleware
};