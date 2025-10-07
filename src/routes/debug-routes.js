/**
 * Debug and monitoring routes
 * Provides endpoints for system health checks and debugging information
 */

import { logger, dbLogger, perfLogger } from '../utils/logger.js';
import { createAPILogger } from '../utils/api-logger.js';
import { asyncHandler } from '../utils/error-handling.js';
import { performHealthCheck, getConnectionHealth } from '../utils/connection-manager.js';
import { getSystemMonitor } from '../utils/monitoring.js';

/**
 * Setup debug and monitoring routes
 */
export function setupDebugRoutes(app, pool) {
  const debugLogger = createAPILogger('/api/debug');

  /**
   * System health check endpoint
   */
  app.get('/api/debug/health', asyncHandler(async (req, res) => {
    debugLogger.logOperationStart('health_check');
    
    const startTime = Date.now();
    const healthData = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid
    };

    // Check database health
    try {
      const dbHealth = await performHealthCheck(pool);
      healthData.database = {
        healthy: dbHealth.healthy,
        responseTime: dbHealth.responseTime,
        error: dbHealth.error?.message
      };
    } catch (error) {
      healthData.database = {
        healthy: false,
        error: error.message
      };
    }

    // Check connection pool status
    if (pool.totalCount !== undefined) {
      healthData.connectionPool = {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount,
        maxConnections: pool.options?.max || 'unknown'
      };
    }

    const duration = Date.now() - startTime;
    debugLogger.logOperationSuccess('health_check', healthData, duration);

    res.json({
      status: healthData.database?.healthy ? 'healthy' : 'unhealthy',
      ...healthData
    });
  }));

  /**
   * Database connection status endpoint
   */
  app.get('/api/debug/database', asyncHandler(async (req, res) => {
    debugLogger.logOperationStart('database_status');

    const connectionHealth = await getConnectionHealth(pool);
    const poolStats = {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
      maxConnections: pool.options?.max
    };

    // Test a simple query
    let queryTest = null;
    try {
      const startTime = Date.now();
      const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
      queryTest = {
        success: true,
        responseTime: Date.now() - startTime,
        currentTime: result.rows[0]?.current_time,
        postgresVersion: result.rows[0]?.postgres_version
      };
    } catch (error) {
      queryTest = {
        success: false,
        error: error.message
      };
    }

    const dbStatus = {
      connectionHealth,
      poolStats,
      queryTest,
      timestamp: new Date().toISOString()
    };

    debugLogger.logOperationSuccess('database_status', dbStatus);

    res.json(dbStatus);
  }));

  /**
   * Performance metrics endpoint
   */
  app.get('/api/debug/performance', asyncHandler(async (req, res) => {
    debugLogger.logOperationStart('performance_metrics');

    // Collect performance metrics
    const memoryUsage = perfLogger.logMemoryUsage({ operation: 'debug_endpoint' });
    
    const performanceData = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: memoryUsage,
      cpuUsage: process.cpuUsage(),
      resourceUsage: process.resourceUsage ? process.resourceUsage() : null,
      eventLoopDelay: process.hrtime ? process.hrtime() : null
    };

    // Add Node.js performance metrics if available
    if (typeof performance !== 'undefined' && performance.now) {
      performanceData.performanceNow = performance.now();
    }

    debugLogger.logOperationSuccess('performance_metrics', performanceData);

    res.json(performanceData);
  }));

  /**
   * Logging configuration endpoint
   */
  app.get('/api/debug/logging', asyncHandler(async (req, res) => {
    debugLogger.logOperationStart('logging_config');

    const loggingConfig = {
      logLevel: process.env.LOG_LEVEL || 'INFO',
      nodeEnv: process.env.NODE_ENV || 'development',
      logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
      logAllRequests: process.env.LOG_ALL_REQUESTS === 'true',
      skipLogPaths: process.env.SKIP_LOG_PATHS?.split(',') || [],
      logPoolStats: process.env.LOG_POOL_STATS === 'true',
      poolStatsInterval: process.env.POOL_STATS_INTERVAL || '60000',
      requestTimeout: process.env.REQUEST_TIMEOUT || '30000'
    };

    debugLogger.logOperationSuccess('logging_config', loggingConfig);

    res.json(loggingConfig);
  }));

  /**
   * Test logging endpoint - generates sample log entries
   */
  app.post('/api/debug/test-logging', asyncHandler(async (req, res) => {
    const testLogger = createAPILogger('/api/debug/test-logging');
    const { level = 'info', message = 'Test log entry', includeError = false } = req.body;

    testLogger.logOperationStart('test_logging', { level, message, includeError });

    // Generate test log entries
    const testData = {
      testId: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      requestBody: req.body
    };

    switch (level.toLowerCase()) {
      case 'error':
        if (includeError) {
          const testError = new Error('This is a test error');
          testLogger.logOperationError('test_logging', testError, testData);
        } else {
          testLogger.error(message, testData);
        }
        break;
      case 'warn':
        testLogger.warn(message, testData);
        break;
      case 'debug':
        testLogger.debug(message, testData);
        break;
      case 'trace':
        testLogger.trace(message, testData);
        break;
      default:
        testLogger.info(message, testData);
    }

    // Also test database logging
    const dbTestLogger = createAPILogger('/api/debug/test-db-logging');
    try {
      const startTime = dbLogger.logQuery('SELECT $1 as test_message', [message], { testId: testData.testId });
      const result = await pool.query('SELECT $1 as test_message', [message]);
      dbLogger.logQueryComplete(startTime, result.rowCount, { testId: testData.testId });
      
      testData.dbTest = {
        success: true,
        result: result.rows[0]
      };
    } catch (error) {
      dbLogger.logQueryError(Date.now(), error, 'SELECT $1 as test_message', [message], { testId: testData.testId });
      testData.dbTest = {
        success: false,
        error: error.message
      };
    }

    testLogger.logOperationSuccess('test_logging', testData);

    res.json({
      message: 'Test logging completed',
      testData,
      logLevel: level,
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * System information endpoint
   */
  app.get('/api/debug/system', asyncHandler(async (req, res) => {
    debugLogger.logOperationStart('system_info');

    const systemInfo = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        ppid: process.ppid,
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        versions: process.versions,
        uptime: process.uptime(),
        cwd: process.cwd(),
        execPath: process.execPath,
        argv: process.argv
      },
      memory: process.memoryUsage(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        logLevel: process.env.LOG_LEVEL
      }
    };

    // Add OS information if available
    if (typeof os !== 'undefined') {
      try {
        const os = await import('os');
        systemInfo.os = {
          hostname: os.hostname(),
          type: os.type(),
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          uptime: os.uptime(),
          loadavg: os.loadavg(),
          totalmem: os.totalmem(),
          freemem: os.freemem(),
          cpus: os.cpus().length
        };
      } catch (error) {
        systemInfo.os = { error: 'OS information not available' };
      }
    }

    debugLogger.logOperationSuccess('system_info', systemInfo);

    res.json(systemInfo);
  }));

  /**
   * System monitoring metrics endpoint
   */
  app.get('/api/debug/monitoring', asyncHandler(async (req, res) => {
    debugLogger.logOperationStart('monitoring_metrics');

    const monitor = getSystemMonitor();
    
    if (!monitor) {
      return res.status(503).json({
        error: 'System monitoring not initialized',
        message: 'Monitoring system is not available'
      });
    }

    const metrics = monitor.getMetrics();
    const recentAlerts = monitor.getRecentAlerts(20);

    const monitoringData = {
      ...metrics,
      recentAlerts,
      timestamp: new Date().toISOString()
    };

    debugLogger.logOperationSuccess('monitoring_metrics', monitoringData);

    res.json(monitoringData);
  }));

  /**
   * System alerts endpoint
   */
  app.get('/api/debug/alerts', asyncHandler(async (req, res) => {
    debugLogger.logOperationStart('system_alerts');

    const monitor = getSystemMonitor();
    
    if (!monitor) {
      return res.status(503).json({
        error: 'System monitoring not initialized',
        message: 'Monitoring system is not available'
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const alerts = monitor.getRecentAlerts(limit);

    debugLogger.logOperationSuccess('system_alerts', { alertCount: alerts.length });

    res.json({
      alerts,
      totalCount: alerts.length,
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Trigger manual health check endpoint
   */
  app.post('/api/debug/health-check', asyncHandler(async (req, res) => {
    debugLogger.logOperationStart('manual_health_check');

    const monitor = getSystemMonitor();
    
    if (!monitor) {
      return res.status(503).json({
        error: 'System monitoring not initialized',
        message: 'Monitoring system is not available'
      });
    }

    // Trigger manual health check
    await monitor.performHealthCheck();
    
    const lastHealthCheck = monitor.metrics.system.lastHealthCheck;

    debugLogger.logOperationSuccess('manual_health_check', lastHealthCheck);

    res.json({
      message: 'Manual health check completed',
      healthCheck: lastHealthCheck,
      timestamp: new Date().toISOString()
    });
  }));

  logger.info('Debug routes initialized', {
    routes: [
      '/api/debug/health',
      '/api/debug/database', 
      '/api/debug/performance',
      '/api/debug/logging',
      '/api/debug/test-logging',
      '/api/debug/system',
      '/api/debug/monitoring',
      '/api/debug/alerts',
      '/api/debug/health-check'
    ]
  });
}

export default setupDebugRoutes;