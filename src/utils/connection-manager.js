/**
 * Database connection management with retry logic and health monitoring
 * Provides connection pooling, retry mechanisms, and graceful degradation
 */

/**
 * Connection retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Connection health monitoring
 */
let connectionHealth = {
  isHealthy: true,
  lastCheck: null,
  consecutiveFailures: 0,
  totalConnections: 0,
  activeConnections: 0,
  failedConnections: 0
};

/**
 * Calculates delay for exponential backoff with optional jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 * @returns {number} - Delay in milliseconds
 */
function calculateDelay(attempt, config = RETRY_CONFIG) {
  let delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );
  
  // Add jitter to prevent thundering herd
  if (config.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
}

/**
 * Sleeps for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a database operation with retry logic
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {Function} operation - Async function that takes a client and returns a result
 * @param {string} operationName - Name of the operation for logging
 * @param {Object} retryConfig - Retry configuration
 * @returns {Promise<any>} - Result of the operation
 */
export async function withRetry(pool, operation, operationName = 'database operation', retryConfig = RETRY_CONFIG) {
  let lastError;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    let client;
    
    try {
      // Track connection attempt
      connectionHealth.totalConnections++;
      
      console.log(`[RETRY] ${operationName} - Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}`);
      
      // Get connection from pool with timeout
      client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      connectionHealth.activeConnections++;
      
      // Execute the operation
      const result = await operation(client);
      
      // Reset failure count on success
      connectionHealth.consecutiveFailures = 0;
      connectionHealth.isHealthy = true;
      connectionHealth.lastCheck = new Date();
      
      console.log(`[RETRY] ${operationName} - Success on attempt ${attempt + 1}`);
      return result;
      
    } catch (error) {
      lastError = error;
      connectionHealth.failedConnections++;
      connectionHealth.consecutiveFailures++;
      
      // Update health status
      if (connectionHealth.consecutiveFailures >= 3) {
        connectionHealth.isHealthy = false;
      }
      
      console.error(`[RETRY] ${operationName} - Attempt ${attempt + 1} failed:`, {
        message: error.message,
        code: error.code,
        attempt: attempt + 1,
        maxRetries: retryConfig.maxRetries + 1
      });
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        console.log(`[RETRY] ${operationName} - Non-retryable error, aborting`);
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt < retryConfig.maxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        console.log(`[RETRY] ${operationName} - Waiting ${delay}ms before retry`);
        await sleep(delay);
      }
      
    } finally {
      if (client) {
        try {
          client.release();
          connectionHealth.activeConnections--;
        } catch (releaseError) {
          console.error(`[RETRY] Error releasing client:`, releaseError.message);
        }
      }
    }
  }
  
  // All retries exhausted
  console.error(`[RETRY] ${operationName} - All retries exhausted`);
  throw lastError;
}

/**
 * Determines if an error should not be retried
 * @param {Error} error - The error to check
 * @returns {boolean} - True if error should not be retried
 */
function isNonRetryableError(error) {
  // Don't retry on authentication/authorization errors
  if (error.code === '28000' || error.code === '28P01') return true;
  
  // Don't retry on syntax errors
  if (error.code === '42601' || error.code === '42P01') return true;
  
  // Don't retry on constraint violations (business logic errors)
  if (error.code?.startsWith('23')) return true;
  
  // Don't retry on data type errors
  if (error.code === '22P02' || error.code === '22001') return true;
  
  // Don't retry on connection timeout from our wrapper
  if (error.message === 'Connection timeout') return false; // Actually, do retry this
  
  return false;
}

/**
 * Enhanced connection wrapper with health monitoring
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {Function} operation - Async function that takes a client
 * @param {string} operationName - Name for logging
 * @returns {Promise<any>} - Result of operation
 */
export async function withHealthyConnection(pool, operation, operationName = 'database operation') {
  // Check if we should attempt connection based on health
  if (!connectionHealth.isHealthy && connectionHealth.consecutiveFailures >= 5) {
    const timeSinceLastCheck = connectionHealth.lastCheck 
      ? Date.now() - connectionHealth.lastCheck.getTime()
      : Infinity;
    
    // Only try again after a cooldown period
    if (timeSinceLastCheck < 30000) { // 30 seconds
      throw new Error('Database is currently unhealthy, please try again later');
    }
  }
  
  return withRetry(pool, operation, operationName);
}

/**
 * Performs a health check on the database connection
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<Object>} - Health check result
 */
export async function performHealthCheck(pool) {
  try {
    const startTime = Date.now();
    
    await withRetry(pool, async (client) => {
      // Simple query to test connection
      await client.query('SELECT 1 as health_check');
      
      // Test table access
      await client.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1', ['expenses']);
    }, 'health check', { maxRetries: 1, baseDelay: 500 });
    
    const responseTime = Date.now() - startTime;
    
    connectionHealth.isHealthy = true;
    connectionHealth.lastCheck = new Date();
    connectionHealth.consecutiveFailures = 0;
    
    return {
      healthy: true,
      responseTime,
      connectionStats: { ...connectionHealth },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    connectionHealth.isHealthy = false;
    connectionHealth.lastCheck = new Date();
    connectionHealth.consecutiveFailures++;
    
    return {
      healthy: false,
      error: error.message,
      connectionStats: { ...connectionHealth },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Gets current connection health status
 * @returns {Object} - Current health status
 */
export function getConnectionHealth() {
  return {
    ...connectionHealth,
    lastCheckAge: connectionHealth.lastCheck 
      ? Date.now() - connectionHealth.lastCheck.getTime()
      : null
  };
}

/**
 * Resets connection health statistics
 */
export function resetConnectionHealth() {
  connectionHealth = {
    isHealthy: true,
    lastCheck: null,
    consecutiveFailures: 0,
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0
  };
}

/**
 * Creates a fallback response when database is unavailable
 * @param {string} operation - The operation that failed
 * @param {Object} context - Additional context
 * @returns {Object} - Fallback response
 */
export function createFallbackResponse(operation, context = {}) {
  return {
    error: 'Service temporarily unavailable',
    message: 'Database is currently unavailable. Please try again later.',
    type: 'service_unavailable',
    operation,
    context,
    timestamp: new Date().toISOString(),
    retryAfter: 30 // seconds
  };
}

/**
 * Middleware to check database health before processing requests
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Function} - Express middleware
 */
export function healthCheckMiddleware(pool) {
  return async (req, res, next) => {
    // Skip health check for health endpoints
    if (req.path.includes('/health')) {
      return next();
    }
    
    const health = getConnectionHealth();
    
    // If database is unhealthy and we haven't checked recently, perform a quick check
    if (!health.isHealthy && (!health.lastCheck || health.lastCheckAge > 60000)) {
      try {
        await performHealthCheck(pool);
      } catch (error) {
        // Health check failed, but continue anyway - let the actual operation handle it
        console.warn('[HEALTH] Quick health check failed:', error.message);
      }
    }
    
    next();
  };
}

/**
 * Graceful degradation wrapper for API endpoints
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {Function} operation - The main operation
 * @param {Function} fallback - Fallback operation (optional)
 * @returns {Function} - Wrapped operation
 */
export function withGracefulDegradation(pool, operation, fallback = null) {
  return async (...args) => {
    try {
      return await withHealthyConnection(pool, operation, 'API operation');
    } catch (error) {
      console.error('[DEGRADATION] Primary operation failed:', error.message);
      
      // Try fallback if provided
      if (fallback) {
        try {
          console.log('[DEGRADATION] Attempting fallback operation');
          return await fallback(...args);
        } catch (fallbackError) {
          console.error('[DEGRADATION] Fallback operation also failed:', fallbackError.message);
        }
      }
      
      // If no fallback or fallback failed, throw original error
      throw error;
    }
  };
}