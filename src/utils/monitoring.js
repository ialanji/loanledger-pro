/**
 * System monitoring and alerting utilities
 * Provides automated monitoring and alerting for critical system failures
 */

import { logger, perfLogger, dbLogger } from './logger.js';
import { performHealthCheck } from './connection-manager.js';

/**
 * System health monitor
 */
export class SystemHealthMonitor {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.options = {
      checkInterval: options.checkInterval || 60000, // 1 minute
      alertThresholds: {
        responseTime: options.responseTime || 5000, // 5 seconds
        memoryUsage: options.memoryUsage || 0.9, // 90% of heap
        errorRate: options.errorRate || 0.1, // 10% error rate
        connectionPoolUsage: options.connectionPoolUsage || 0.8 // 80% of max connections
      },
      ...options
    };
    
    this.metrics = {
      requests: {
        total: 0,
        errors: 0,
        responseTimes: []
      },
      database: {
        queries: 0,
        errors: 0,
        responseTimes: []
      },
      system: {
        lastHealthCheck: null,
        alerts: []
      }
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start system monitoring
   */
  start() {
    if (this.isMonitoring) {
      logger.warn('System monitoring is already running');
      return;
    }

    logger.info('Starting system health monitoring', {
      checkInterval: this.options.checkInterval,
      thresholds: this.options.alertThresholds
    });

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.options.checkInterval);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop system monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('Stopping system health monitoring');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const healthData = {
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // Database health check
      healthData.checks.database = await this.checkDatabaseHealth();
      
      // Memory usage check
      healthData.checks.memory = this.checkMemoryUsage();
      
      // Connection pool check
      healthData.checks.connectionPool = this.checkConnectionPool();
      
      // Error rate check
      healthData.checks.errorRate = this.checkErrorRate();
      
      // Response time check
      healthData.checks.responseTime = this.checkResponseTimes();

      // Overall health status
      healthData.healthy = Object.values(healthData.checks).every(check => check.healthy);
      healthData.duration = Date.now() - startTime;

      this.metrics.system.lastHealthCheck = healthData;

      // Generate alerts if needed
      this.processHealthCheckResults(healthData);

      logger.debug('Health check completed', healthData);

    } catch (error) {
      logger.error('Health check failed', {
        error: {
          message: error.message,
          stack: error.stack
        },
        duration: Date.now() - startTime
      });

      this.generateAlert('HEALTH_CHECK_FAILED', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const healthResult = await performHealthCheck(this.pool);
      const responseTime = healthResult.responseTime;
      
      return {
        healthy: healthResult.healthy && responseTime < this.options.alertThresholds.responseTime,
        responseTime,
        error: healthResult.error?.message,
        details: {
          connectionCount: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingRequests: this.pool.waitingCount
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        responseTime: null
      };
    }
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    return {
      healthy: heapUsedRatio < this.options.alertThresholds.memoryUsage,
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsedRatio: Math.round(heapUsedRatio * 100) / 100,
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      externalMB: Math.round(memUsage.external / 1024 / 1024)
    };
  }

  /**
   * Check connection pool status
   */
  checkConnectionPool() {
    const maxConnections = this.pool.options?.max || 20;
    const currentConnections = this.pool.totalCount || 0;
    const poolUsageRatio = currentConnections / maxConnections;
    
    return {
      healthy: poolUsageRatio < this.options.alertThresholds.connectionPoolUsage,
      totalConnections: currentConnections,
      maxConnections,
      idleConnections: this.pool.idleCount || 0,
      waitingRequests: this.pool.waitingCount || 0,
      poolUsageRatio: Math.round(poolUsageRatio * 100) / 100
    };
  }

  /**
   * Check error rate
   */
  checkErrorRate() {
    const totalRequests = this.metrics.requests.total;
    const errorRequests = this.metrics.requests.errors;
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
    
    return {
      healthy: errorRate < this.options.alertThresholds.errorRate,
      totalRequests,
      errorRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      successRate: Math.round((1 - errorRate) * 100) / 100
    };
  }

  /**
   * Check response times
   */
  checkResponseTimes() {
    const responseTimes = this.metrics.requests.responseTimes;
    
    if (responseTimes.length === 0) {
      return {
        healthy: true,
        averageResponseTime: 0,
        maxResponseTime: 0,
        sampleCount: 0
      };
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    return {
      healthy: avgResponseTime < this.options.alertThresholds.responseTime,
      averageResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      sampleCount: responseTimes.length,
      p95ResponseTime: this.calculatePercentile(responseTimes, 0.95)
    };
  }

  /**
   * Calculate percentile from array of values
   */
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  /**
   * Process health check results and generate alerts
   */
  processHealthCheckResults(healthData) {
    const unhealthyChecks = Object.entries(healthData.checks)
      .filter(([_, check]) => !check.healthy);

    if (unhealthyChecks.length > 0) {
      for (const [checkName, checkData] of unhealthyChecks) {
        this.generateAlert(`HEALTH_CHECK_FAILED_${checkName.toUpperCase()}`, {
          checkName,
          checkData,
          timestamp: healthData.timestamp
        });
      }
    }

    // Clear old response time samples to prevent memory growth
    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.slice(-500);
    }
  }

  /**
   * Generate system alert
   */
  generateAlert(alertType, alertData) {
    const alert = {
      type: alertType,
      timestamp: new Date().toISOString(),
      data: alertData,
      id: Math.random().toString(36).substr(2, 9)
    };

    this.metrics.system.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.metrics.system.alerts.length > 100) {
      this.metrics.system.alerts = this.metrics.system.alerts.slice(-50);
    }

    logger.error('System alert generated', alert);

    // Here you could integrate with external alerting systems
    // like email, Slack, PagerDuty, etc.
    this.sendAlert(alert);
  }

  /**
   * Send alert to external systems
   */
  async sendAlert(alert) {
    // This is where you would integrate with external alerting systems
    // For now, we'll just log it
    
    if (process.env.ALERT_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: `🚨 System Alert: ${alert.type}`,
            attachments: [{
              color: 'danger',
              fields: [{
                title: 'Alert Details',
                value: JSON.stringify(alert.data, null, 2),
                short: false
              }]
            }]
          })
        });

        if (response.ok) {
          logger.info('Alert sent successfully', { alertId: alert.id });
        } else {
          logger.error('Failed to send alert', { 
            alertId: alert.id, 
            status: response.status 
          });
        }
      } catch (error) {
        logger.error('Error sending alert', {
          alertId: alert.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime, isError = false) {
    this.metrics.requests.total++;
    this.metrics.requests.responseTimes.push(responseTime);
    
    if (isError) {
      this.metrics.requests.errors++;
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(responseTime, isError = false) {
    this.metrics.database.queries++;
    this.metrics.database.responseTimes.push(responseTime);
    
    if (isError) {
      this.metrics.database.errors++;
    }
  }

  /**
   * Get current system metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      system: {
        ...this.metrics.system,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        isMonitoring: this.isMonitoring
      }
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10) {
    return this.metrics.system.alerts
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        errors: 0,
        responseTimes: []
      },
      database: {
        queries: 0,
        errors: 0,
        responseTimes: []
      },
      system: {
        lastHealthCheck: null,
        alerts: []
      }
    };
  }
}

/**
 * Request monitoring middleware
 * Integrates with SystemHealthMonitor to track request metrics
 */
export function createMonitoringMiddleware(monitor) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Override response methods to capture metrics
    const originalEnd = res.end;
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      const isError = res.statusCode >= 400;
      
      monitor.recordRequest(responseTime, isError);
      
      return originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Database monitoring wrapper
 * Integrates with SystemHealthMonitor to track database metrics
 */
export function createDatabaseMonitoringWrapper(pool, monitor) {
  const originalQuery = pool.query.bind(pool);
  
  pool.query = async function(text, params = [], callback) {
    const startTime = Date.now();
    
    try {
      const result = await originalQuery(text, params, callback);
      const responseTime = Date.now() - startTime;
      
      monitor.recordDatabaseQuery(responseTime, false);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      monitor.recordDatabaseQuery(responseTime, true);
      throw error;
    }
  };

  return pool;
}

// Global monitor instance
let globalMonitor = null;

/**
 * Initialize global system monitoring
 */
export function initializeSystemMonitoring(pool, options = {}) {
  if (globalMonitor) {
    logger.warn('System monitoring already initialized');
    return globalMonitor;
  }

  globalMonitor = new SystemHealthMonitor(pool, options);
  
  // Start monitoring if enabled
  if (options.autoStart !== false) {
    globalMonitor.start();
  }

  logger.info('System monitoring initialized', {
    autoStart: options.autoStart !== false,
    checkInterval: options.checkInterval || 60000
  });

  return globalMonitor;
}

/**
 * Get global monitor instance
 */
export function getSystemMonitor() {
  return globalMonitor;
}

export default {
  SystemHealthMonitor,
  createMonitoringMiddleware,
  createDatabaseMonitoringWrapper,
  initializeSystemMonitoring,
  getSystemMonitor
};