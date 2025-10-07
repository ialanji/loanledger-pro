/**
 * Comprehensive logging utility for API debugging and monitoring
 * Provides structured logging with different levels and contexts
 */

import { performance } from 'perf_hooks';

// Log levels
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Current log level (can be configured via environment)
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Color codes for console output
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  TRACE: '\x1b[37m', // White
  RESET: '\x1b[0m'
};

/**
 * Format timestamp for logging
 */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log entry with consistent structure
 */
function formatLogEntry(level, category, message, data = {}, context = {}) {
  const timestamp = formatTimestamp();
  const logEntry = {
    timestamp,
    level,
    category,
    message,
    ...context,
    ...(Object.keys(data).length > 0 && { data })
  };

  return logEntry;
}

/**
 * Output log entry to console with formatting
 */
function outputLog(level, logEntry) {
  if (LOG_LEVELS[level] > CURRENT_LOG_LEVEL) {
    return; // Skip if log level is too verbose
  }

  const color = COLORS[level] || COLORS.INFO;
  const prefix = `${color}[${logEntry.timestamp}] [${level}] [${logEntry.category}]${COLORS.RESET}`;
  
  if (process.env.NODE_ENV === 'development') {
    // Pretty print in development
    console.log(`${prefix} ${logEntry.message}`);
    if (logEntry.data && Object.keys(logEntry.data).length > 0) {
      console.log(`${color}  Data:${COLORS.RESET}`, JSON.stringify(logEntry.data, null, 2));
    }
    if (Object.keys(logEntry).some(key => !['timestamp', 'level', 'category', 'message', 'data'].includes(key))) {
      const context = Object.fromEntries(
        Object.entries(logEntry).filter(([key]) => !['timestamp', 'level', 'category', 'message', 'data'].includes(key))
      );
      console.log(`${color}  Context:${COLORS.RESET}`, JSON.stringify(context, null, 2));
    }
  } else {
    // JSON output in production
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Core logger class
 */
export class Logger {
  constructor(category = 'APP') {
    this.category = category;
    this.context = {};
  }

  /**
   * Add persistent context to all log entries from this logger
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Clear context
   */
  clearContext() {
    this.context = {};
    return this;
  }

  /**
   * Log at ERROR level
   */
  error(message, data = {}, additionalContext = {}) {
    const logEntry = formatLogEntry('ERROR', this.category, message, data, { ...this.context, ...additionalContext });
    outputLog('ERROR', logEntry);
    return logEntry;
  }

  /**
   * Log at WARN level
   */
  warn(message, data = {}, additionalContext = {}) {
    const logEntry = formatLogEntry('WARN', this.category, message, data, { ...this.context, ...additionalContext });
    outputLog('WARN', logEntry);
    return logEntry;
  }

  /**
   * Log at INFO level
   */
  info(message, data = {}, additionalContext = {}) {
    const logEntry = formatLogEntry('INFO', this.category, message, data, { ...this.context, ...additionalContext });
    outputLog('INFO', logEntry);
    return logEntry;
  }

  /**
   * Log at DEBUG level
   */
  debug(message, data = {}, additionalContext = {}) {
    const logEntry = formatLogEntry('DEBUG', this.category, message, data, { ...this.context, ...additionalContext });
    outputLog('DEBUG', logEntry);
    return logEntry;
  }

  /**
   * Log at TRACE level
   */
  trace(message, data = {}, additionalContext = {}) {
    const logEntry = formatLogEntry('TRACE', this.category, message, data, { ...this.context, ...additionalContext });
    outputLog('TRACE', logEntry);
    return logEntry;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext) {
    const childLogger = new Logger(this.category);
    childLogger.context = { ...this.context, ...additionalContext };
    return childLogger;
  }
}

/**
 * Request/Response logging utilities
 */
export class RequestLogger extends Logger {
  constructor() {
    super('REQUEST');
    this.startTime = performance.now();
  }

  /**
   * Log incoming request
   */
  logRequest(req) {
    const requestData = {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: this.sanitizeHeaders(req.headers),
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      body: this.sanitizeBody(req.body)
    };

    this.info('Incoming request', requestData, {
      requestId: req.requestId,
      sessionId: req.sessionId
    });

    return requestData;
  }

  /**
   * Log outgoing response
   */
  logResponse(req, res, responseData = null) {
    const duration = performance.now() - this.startTime;
    
    const responseInfo = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      headers: this.sanitizeHeaders(res.getHeaders()),
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      responseSize: res.get('Content-Length') || (responseData ? JSON.stringify(responseData).length : 0)
    };

    // Include response body for errors or if explicitly requested
    if (res.statusCode >= 400 || process.env.LOG_RESPONSE_BODY === 'true') {
      responseInfo.body = this.sanitizeBody(responseData);
    }

    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    
    this[level.toLowerCase()]('Outgoing response', responseInfo, {
      requestId: req.requestId,
      sessionId: req.sessionId,
      method: req.method,
      url: req.url
    });

    return responseInfo;
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  sanitizeHeaders(headers) {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request/response body to remove sensitive information
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const sanitized = { ...body };

    const sanitizeObject = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => typeof item === 'object' ? sanitizeObject(item) : item);
      }
      
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            result[key] = sanitizeObject(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }
      
      return obj;
    };

    return sanitizeObject(sanitized);
  }
}

/**
 * Database operation logging utilities
 */
export class DatabaseLogger extends Logger {
  constructor() {
    super('DATABASE');
  }

  /**
   * Log database query execution
   */
  logQuery(query, params = [], context = {}) {
    const queryData = {
      query: query.replace(/\s+/g, ' ').trim(),
      params: this.sanitizeParams(params),
      paramCount: params.length
    };

    this.debug('Executing database query', queryData, context);
    return performance.now(); // Return start time for duration calculation
  }

  /**
   * Log query completion
   */
  logQueryComplete(startTime, rowCount = 0, context = {}) {
    const duration = performance.now() - startTime;
    
    this.info('Database query completed', {
      duration: Math.round(duration * 100) / 100,
      rowCount,
      performance: this.categorizePerformance(duration)
    }, context);
  }

  /**
   * Log query error
   */
  logQueryError(startTime, error, query, params = [], context = {}) {
    const duration = performance.now() - startTime;
    
    this.error('Database query failed', {
      duration: Math.round(duration * 100) / 100,
      error: {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      },
      query: query.replace(/\s+/g, ' ').trim(),
      params: this.sanitizeParams(params)
    }, context);
  }

  /**
   * Log connection events
   */
  logConnection(event, details = {}) {
    this.info(`Database connection ${event}`, details);
  }

  /**
   * Log transaction events
   */
  logTransaction(event, context = {}) {
    this.debug(`Transaction ${event}`, {}, context);
  }

  /**
   * Sanitize query parameters
   */
  sanitizeParams(params) {
    if (!Array.isArray(params)) {
      return params;
    }

    return params.map((param, index) => {
      // Don't log potentially sensitive data like passwords, tokens, etc.
      if (typeof param === 'string' && (
        param.length > 100 || // Very long strings might be sensitive
        /password|token|secret|key|auth/i.test(param)
      )) {
        return '[REDACTED]';
      }
      return param;
    });
  }

  /**
   * Categorize query performance
   */
  categorizePerformance(duration) {
    if (duration < 10) return 'excellent';
    if (duration < 50) return 'good';
    if (duration < 200) return 'acceptable';
    if (duration < 1000) return 'slow';
    return 'very_slow';
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceLogger extends Logger {
  constructor() {
    super('PERFORMANCE');
    this.metrics = new Map();
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName, context = {}) {
    const startTime = performance.now();
    this.metrics.set(operationName, { startTime, context });
    
    this.trace(`Started timing: ${operationName}`, {}, context);
    return startTime;
  }

  /**
   * End timing and log results
   */
  endTimer(operationName, additionalContext = {}) {
    const metric = this.metrics.get(operationName);
    if (!metric) {
      this.warn(`Timer not found: ${operationName}`);
      return null;
    }

    const duration = performance.now() - metric.startTime;
    this.metrics.delete(operationName);

    const performanceData = {
      operation: operationName,
      duration: Math.round(duration * 100) / 100,
      category: this.categorizePerformance(duration)
    };

    this.info(`Completed timing: ${operationName}`, performanceData, {
      ...metric.context,
      ...additionalContext
    });

    return duration;
  }

  /**
   * Log memory usage
   */
  logMemoryUsage(context = {}) {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const memoryData = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100 // MB
      };

      this.info('Memory usage snapshot', memoryData, context);
      return memoryData;
    }
    return null;
  }

  /**
   * Categorize performance timing
   */
  categorizePerformance(duration) {
    if (duration < 10) return 'excellent';
    if (duration < 50) return 'good';
    if (duration < 200) return 'acceptable';
    if (duration < 1000) return 'slow';
    return 'very_slow';
  }
}

// Default logger instances
export const logger = new Logger('APP');
export const requestLogger = new RequestLogger();
export const dbLogger = new DatabaseLogger();
export const perfLogger = new PerformanceLogger();

// Convenience functions for backward compatibility
export const logError = (message, data, context) => logger.error(message, data, context);
export const logWarn = (message, data, context) => logger.warn(message, data, context);
export const logInfo = (message, data, context) => logger.info(message, data, context);
export const logDebug = (message, data, context) => logger.debug(message, data, context);

export default logger;