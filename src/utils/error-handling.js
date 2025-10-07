/**
 * Enhanced error handling utilities for expenses API
 * Provides standardized error responses and transaction management
 */

/**
 * Standard error response format
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = `api-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Database transaction wrapper with proper error handling
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {Function} operation - Async function to execute within transaction
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<any>} - Result of the operation
 */
export async function withTransaction(pool, operation, operationName = 'database operation') {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log(`[TRANSACTION] Started: ${operationName}`);
    
    const result = await operation(client);
    
    await client.query('COMMIT');
    console.log(`[TRANSACTION] Committed: ${operationName}`);
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[TRANSACTION] Rolled back: ${operationName}`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Handles database errors and converts them to appropriate API responses
 * @param {Error} error - The database error
 * @param {string} operation - The operation that failed
 * @param {Object} context - Additional context for debugging
 * @returns {APIError} - Standardized API error
 */
export function handleDatabaseError(error, operation, context = {}) {
  console.error(`[DB ERROR] ${operation} failed:`, {
    message: error.message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    context,
    timestamp: new Date().toISOString()
  });
  
  // Handle specific PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return new APIError(
        'Duplicate entry detected',
        409,
        { 
          type: 'duplicate_entry',
          constraint: error.constraint,
          detail: error.detail
        }
      );
      
    case '23503': // foreign_key_violation
      return new APIError(
        'Referenced record does not exist',
        400,
        { 
          type: 'foreign_key_violation',
          constraint: error.constraint,
          detail: error.detail
        }
      );
      
    case '23514': // check_violation
      return new APIError(
        'Data validation failed',
        400,
        { 
          type: 'check_violation',
          constraint: error.constraint,
          detail: error.detail
        }
      );
      
    case '23502': // not_null_violation
      return new APIError(
        'Required field is missing',
        400,
        { 
          type: 'not_null_violation',
          column: error.column,
          detail: error.detail
        }
      );
      
    case '22001': // string_data_right_truncation
      return new APIError(
        'Data too long for field',
        400,
        { 
          type: 'data_too_long',
          detail: error.detail
        }
      );
      
    case '08000': // connection_exception
    case '08003': // connection_does_not_exist
    case '08006': // connection_failure
      return new APIError(
        'Database connection failed',
        503,
        { 
          type: 'connection_error',
          code: error.code,
          detail: 'Database temporarily unavailable'
        }
      );
      
    case '57P01': // admin_shutdown
    case '57P02': // crash_shutdown
    case '57P03': // cannot_connect_now
      return new APIError(
        'Database service unavailable',
        503,
        { 
          type: 'service_unavailable',
          code: error.code,
          detail: 'Database is temporarily unavailable'
        }
      );
      
    default:
      // Generic database error
      return new APIError(
        'Database operation failed',
        500,
        { 
          type: 'database_error',
          code: error.code,
          operation,
          detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal database error'
        }
      );
  }
}

/**
 * Validates that a resource exists before performing operations
 * @param {Object} client - Database client
 * @param {string} table - Table name
 * @param {number} id - Resource ID
 * @param {string} resourceName - Human-readable resource name
 * @returns {Promise<Object>} - The found resource
 * @throws {APIError} - If resource not found
 */
export async function ensureResourceExists(client, table, id, resourceName = 'resource') {
  const result = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  
  if (result.rows.length === 0) {
    throw new APIError(
      `${resourceName} not found`,
      404,
      { 
        type: 'resource_not_found',
        resourceType: resourceName,
        resourceId: id
      }
    );
  }
  
  return result.rows[0];
}

/**
 * Sends standardized error response
 * @param {Response} res - Express response object
 * @param {Error} error - The error to handle
 * @param {string} operation - The operation that failed
 * @param {Object} context - Additional context
 */
export function sendErrorResponse(res, error, operation, context = {}) {
  let apiError;
  
  if (error instanceof APIError) {
    apiError = error;
  } else {
    // Convert generic errors to API errors
    apiError = handleDatabaseError(error, operation, context);
  }
  
  const response = {
    error: apiError.message,
    type: apiError.details?.type || 'unknown_error',
    timestamp: apiError.timestamp,
    requestId: apiError.requestId
  };
  
  // Add details in development mode or for client errors (4xx)
  if (process.env.NODE_ENV === 'development' || (apiError.statusCode >= 400 && apiError.statusCode < 500)) {
    response.details = apiError.details;
  }
  
  // Add context for debugging
  if (Object.keys(context).length > 0) {
    response.context = context;
  }
  
  res.status(apiError.statusCode).json(response);
}

/**
 * Express middleware for handling async route errors
 * @param {Function} fn - Async route handler
 * @returns {Function} - Express middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 * @param {Error} err - The error
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export function globalErrorHandler(err, req, res, next) {
  console.error('[GLOBAL ERROR]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  
  sendErrorResponse(res, err, `${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent')
  });
}