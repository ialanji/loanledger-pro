import { getPool } from './database-utils.js';

/**
 * Comprehensive error capture system for API debugging
 */
export class ErrorCaptureSystem {
  constructor() {
    this.errorLog = [];
    this.performanceMetrics = [];
    this.databaseState = null;
  }

  /**
   * Capture detailed error information with full context
   */
  async captureError(error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorDetails = {
      id: errorId,
      timestamp,
      context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      },
      system: await this.captureSystemState(),
      database: await this.captureDatabaseState(),
      performance: this.capturePerformanceMetrics(context),
      request: this.captureRequestDetails(context),
      environment: this.captureEnvironmentInfo()
    };

    this.errorLog.push(errorDetails);
    
    // Log to console for immediate debugging
    console.error(`\n🚨 [ERROR CAPTURED] ${errorId}`);
    console.error('Context:', context);
    console.error('Error:', error.message);
    console.error('Database State:', errorDetails.database);
    console.error('Performance:', errorDetails.performance);
    
    return errorDetails;
  }

  /**
   * Capture HTTP response error details
   */
  async captureResponseError(response, requestContext = {}) {
    const timestamp = new Date().toISOString();
    const errorId = `response_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let responseBody = '';
    let responseData = null;

    try {
      responseBody = await response.text();
      try {
        responseData = JSON.parse(responseBody);
      } catch {
        // Response is not JSON
      }
    } catch (error) {
      responseBody = `Failed to read response body: ${error.message}`;
    }

    const errorDetails = {
      id: errorId,
      timestamp,
      type: 'http_response_error',
      response: {
        status: response.status(),
        statusText: response.statusText(),
        headers: await response.headers(),
        body: responseBody,
        data: responseData,
        url: response.url()
      },
      request: {
        context: requestContext,
        timing: this.captureRequestTiming(requestContext)
      },
      system: await this.captureSystemState(),
      database: await this.captureDatabaseState(),
      environment: this.captureEnvironmentInfo()
    };

    this.errorLog.push(errorDetails);

    console.error(`\n🚨 [HTTP ERROR CAPTURED] ${errorId}`);
    console.error('Status:', response.status(), response.statusText());
    console.error('URL:', response.url());
    console.error('Response Body:', responseBody);
    console.error('Request Context:', requestContext);

    return errorDetails;
  }

  /**
   * Capture database connection and query state
   */
  async captureDatabaseState() {
    try {
      const pool = getPool();
      
      const state = {
        connected: false,
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        lastQuery: null,
        tables: {}
      };

      if (pool) {
        state.totalConnections = pool.totalCount;
        state.idleConnections = pool.idleCount;
        state.waitingClients = pool.waitingCount;

        // Test connection
        try {
          const client = await pool.connect();
          state.connected = true;
          
          // Check table existence and row counts
          try {
            const aliasesResult = await client.query('SELECT COUNT(*) as count FROM aliases');
            state.tables.aliases = {
              exists: true,
              rowCount: parseInt(aliasesResult.rows[0].count)
            };
          } catch (error) {
            state.tables.aliases = {
              exists: false,
              error: error.message
            };
          }

          try {
            const expensesResult = await client.query('SELECT COUNT(*) as count FROM expenses');
            state.tables.expenses = {
              exists: true,
              rowCount: parseInt(expensesResult.rows[0].count)
            };
          } catch (error) {
            state.tables.expenses = {
              exists: false,
              error: error.message
            };
          }

          client.release();
        } catch (error) {
          state.connected = false;
          state.connectionError = error.message;
        }
      }

      this.databaseState = state;
      return state;
    } catch (error) {
      const errorState = {
        connected: false,
        error: error.message,
        stack: error.stack
      };
      
      this.databaseState = errorState;
      return errorState;
    }
  }

  /**
   * Capture system performance and resource usage
   */
  async captureSystemState() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      };
    } catch (error) {
      return {
        error: error.message,
        available: false
      };
    }
  }

  /**
   * Capture performance metrics for the current operation
   */
  capturePerformanceMetrics(context = {}) {
    const metrics = {
      timestamp: new Date().toISOString(),
      context: context.operation || 'unknown',
      timing: {
        start: context.startTime,
        end: Date.now(),
        duration: context.startTime ? Date.now() - context.startTime : null
      },
      memory: process.memoryUsage(),
      recent: this.performanceMetrics.slice(-10) // Last 10 metrics
    };

    this.performanceMetrics.push(metrics);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }

    return metrics;
  }

  /**
   * Capture request details and timing
   */
  captureRequestDetails(context = {}) {
    return {
      method: context.method || 'unknown',
      url: context.url || 'unknown',
      endpoint: context.endpoint || 'unknown',
      operation: context.operation || 'unknown',
      parameters: context.parameters || {},
      payload: context.payload || null,
      headers: context.headers || {},
      userAgent: context.userAgent || 'unknown',
      timing: this.captureRequestTiming(context)
    };
  }

  /**
   * Capture request timing information
   */
  captureRequestTiming(context = {}) {
    const now = Date.now();
    return {
      requestStart: context.requestStart || now,
      requestEnd: now,
      duration: context.requestStart ? now - context.requestStart : 0,
      databaseTime: context.databaseTime || 0,
      processingTime: context.processingTime || 0
    };
  }

  /**
   * Capture environment and configuration info
   */
  captureEnvironmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      platform: process.platform,
      nodeVersion: process.version,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      database: {
        host: process.env.POSTGRES_HOST || 'unknown',
        port: process.env.POSTGRES_PORT || 'unknown',
        database: process.env.POSTGRES_DATABASE || 'unknown'
      }
    };
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: this.errorLog.length,
        recentErrors: this.errorLog.slice(-10),
        errorTypes: this.getErrorTypeSummary(),
        performanceIssues: this.identifyPerformanceIssues()
      },
      database: this.databaseState,
      system: this.captureSystemState(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Get summary of error types
   */
  getErrorTypeSummary() {
    const types = {};
    
    this.errorLog.forEach(error => {
      const type = error.type || error.error?.name || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });

    return types;
  }

  /**
   * Identify performance issues from metrics
   */
  identifyPerformanceIssues() {
    const issues = [];
    
    // Check for slow requests (>1000ms)
    const slowRequests = this.performanceMetrics.filter(m => 
      m.timing.duration && m.timing.duration > 1000
    );
    
    if (slowRequests.length > 0) {
      issues.push({
        type: 'slow_requests',
        count: slowRequests.length,
        averageDuration: slowRequests.reduce((sum, r) => sum + r.timing.duration, 0) / slowRequests.length
      });
    }

    // Check for memory issues
    const recentMetrics = this.performanceMetrics.slice(-5);
    if (recentMetrics.length > 0) {
      const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory.heapUsed, 0) / recentMetrics.length;
      if (avgMemory > 100 * 1024 * 1024) { // >100MB
        issues.push({
          type: 'high_memory_usage',
          averageMemory: `${Math.round(avgMemory / 1024 / 1024)}MB`
        });
      }
    }

    return issues;
  }

  /**
   * Generate recommendations based on captured errors
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Database connection issues
    if (this.databaseState && !this.databaseState.connected) {
      recommendations.push({
        type: 'database_connection',
        priority: 'high',
        message: 'Database connection failed. Check connection parameters and database availability.',
        action: 'Verify POSTGRES_* environment variables and database server status'
      });
    }

    // High error rate
    if (this.errorLog.length > 10) {
      recommendations.push({
        type: 'high_error_rate',
        priority: 'medium',
        message: `High number of errors detected (${this.errorLog.length}). Review error patterns.`,
        action: 'Analyze error types and implement proper error handling'
      });
    }

    // Performance issues
    const performanceIssues = this.identifyPerformanceIssues();
    if (performanceIssues.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Performance issues detected.',
        issues: performanceIssues,
        action: 'Optimize slow queries and reduce memory usage'
      });
    }

    return recommendations;
  }

  /**
   * Clear error log and metrics (for testing)
   */
  clear() {
    this.errorLog = [];
    this.performanceMetrics = [];
    this.databaseState = null;
  }

  /**
   * Export error data for external analysis
   */
  exportErrorData() {
    return {
      errors: this.errorLog,
      performance: this.performanceMetrics,
      database: this.databaseState,
      report: this.generateErrorReport()
    };
  }
}

// Global instance for use across tests
export const globalErrorCapture = new ErrorCaptureSystem();