/**
 * API-specific logging utilities
 * Provides convenient logging functions for common API operations
 */

import { Logger, DatabaseLogger } from './logger.js';

/**
 * API operation logger
 */
export class APILogger extends Logger {
  constructor(endpoint) {
    super('API');
    this.endpoint = endpoint;
  }

  /**
   * Log API operation start
   */
  logOperationStart(operation, data = {}) {
    this.info(`${operation} started`, data, {
      endpoint: this.endpoint,
      operation
    });
  }

  /**
   * Log API operation success
   */
  logOperationSuccess(operation, result = {}, duration = null) {
    const logData = { ...result };
    if (duration !== null) {
      logData.duration = duration;
    }

    this.info(`${operation} completed successfully`, logData, {
      endpoint: this.endpoint,
      operation
    });
  }

  /**
   * Log API operation failure
   */
  logOperationError(operation, error, context = {}) {
    this.error(`${operation} failed`, {
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      ...context
    }, {
      endpoint: this.endpoint,
      operation
    });
  }

  /**
   * Log validation errors
   */
  logValidationError(errors, data = {}) {
    this.warn('Validation failed', {
      errors,
      providedData: this.sanitizeData(data)
    }, {
      endpoint: this.endpoint,
      operation: 'validation'
    });
  }

  /**
   * Log validation warnings
   */
  logValidationWarnings(warnings, data = {}) {
    this.info('Validation warnings', {
      warnings,
      providedData: this.sanitizeData(data)
    }, {
      endpoint: this.endpoint,
      operation: 'validation'
    });
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const sanitized = { ...data };

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
 * Database operation logger for API endpoints
 */
export class APIDBLogger extends DatabaseLogger {
  constructor(endpoint) {
    super();
    this.endpoint = endpoint;
    this.setContext({ endpoint });
  }

  /**
   * Log database query with API context
   */
  logAPIQuery(operation, query, params = [], additionalContext = {}) {
    const startTime = this.logQuery(query, params, {
      endpoint: this.endpoint,
      operation,
      ...additionalContext
    });
    return startTime;
  }

  /**
   * Log query completion with API context
   */
  logAPIQueryComplete(operation, startTime, rowCount = 0, additionalContext = {}) {
    this.logQueryComplete(startTime, rowCount, {
      endpoint: this.endpoint,
      operation,
      ...additionalContext
    });
  }

  /**
   * Log query error with API context
   */
  logAPIQueryError(operation, startTime, error, query, params = [], additionalContext = {}) {
    this.logQueryError(startTime, error, query, params, {
      endpoint: this.endpoint,
      operation,
      ...additionalContext
    });
  }
}

/**
 * Convenience functions for common API logging patterns
 */

/**
 * Create an API logger for a specific endpoint
 */
export function createAPILogger(endpoint) {
  return new APILogger(endpoint);
}

/**
 * Create a database logger for a specific API endpoint
 */
export function createAPIDBLogger(endpoint) {
  return new APIDBLogger(endpoint);
}

/**
 * Log CRUD operation patterns
 */
export const CRUDLogger = {
  /**
   * Log CREATE operation
   */
  create: (logger, resourceType, data, result) => {
    logger.logOperationSuccess('CREATE', {
      resourceType,
      createdId: result?.id,
      resourceData: logger.sanitizeData(data)
    });
  },

  /**
   * Log READ operation
   */
  read: (logger, resourceType, filters, count) => {
    logger.logOperationSuccess('READ', {
      resourceType,
      filters,
      resultCount: count
    });
  },

  /**
   * Log UPDATE operation
   */
  update: (logger, resourceType, id, data, result) => {
    logger.logOperationSuccess('UPDATE', {
      resourceType,
      resourceId: id,
      updateData: logger.sanitizeData(data),
      updated: !!result
    });
  },

  /**
   * Log DELETE operation
   */
  delete: (logger, resourceType, id, result) => {
    logger.logOperationSuccess('DELETE', {
      resourceType,
      resourceId: id,
      deleted: !!result
    });
  }
};

export default {
  APILogger,
  APIDBLogger,
  createAPILogger,
  createAPIDBLogger,
  CRUDLogger
};