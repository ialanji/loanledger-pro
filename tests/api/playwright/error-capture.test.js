import { test, expect } from '@playwright/test';
import { ErrorCaptureSystem, globalErrorCapture } from './utils/error-capture.js';
import { APITestClient } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, validateTestEnvironment } from './utils/test-helpers.js';

test.describe('Error Capture System Tests', () => {
  let apiClient;
  let errorCapture;

  test.beforeAll(async () => {
    validateTestEnvironment();
    await setupTestEnvironment();
  });

  test.afterAll(async () => {
    await cleanupTestEnvironment();
  });

  test.beforeEach(async ({ request }) => {
    apiClient = new APITestClient(request);
    errorCapture = new ErrorCaptureSystem();
    globalErrorCapture.clear(); // Clear global state
  });

  test('should capture JavaScript error details', async () => {
    console.log('\n=== Testing JavaScript error capture ===');

    const testError = new Error('Test error for capture system');
    testError.cause = 'Simulated error for testing';

    const context = {
      operation: 'test_error_capture',
      endpoint: '/api/test',
      method: 'GET',
      startTime: Date.now() - 100
    };

    const capturedError = await errorCapture.captureError(testError, context);

    // Verify error capture structure
    expect(capturedError).toHaveProperty('id');
    expect(capturedError).toHaveProperty('timestamp');
    expect(capturedError).toHaveProperty('context');
    expect(capturedError).toHaveProperty('error');
    expect(capturedError).toHaveProperty('system');
    expect(capturedError).toHaveProperty('database');
    expect(capturedError).toHaveProperty('performance');
    expect(capturedError).toHaveProperty('request');
    expect(capturedError).toHaveProperty('environment');

    // Verify error details
    expect(capturedError.error.message).toBe('Test error for capture system');
    expect(capturedError.error.name).toBe('Error');
    expect(capturedError.error.stack).toContain('Test error for capture system');

    // Verify context preservation
    expect(capturedError.context.operation).toBe('test_error_capture');
    expect(capturedError.context.endpoint).toBe('/api/test');

    // Verify system information
    expect(capturedError.system).toHaveProperty('memory');
    expect(capturedError.system).toHaveProperty('cpu');
    expect(capturedError.system).toHaveProperty('uptime');

    // Verify database state capture
    expect(capturedError.database).toHaveProperty('connected');

    console.log('✅ JavaScript error captured successfully:', {
      id: capturedError.id,
      message: capturedError.error.message,
      hasSystemInfo: !!capturedError.system.memory,
      hasDatabaseInfo: capturedError.database.connected !== undefined
    });
  });

  test('should capture HTTP response error details', async ({ request }) => {
    console.log('\n=== Testing HTTP response error capture ===');

    // Make a request to a non-existent endpoint
    const response = await request.get(`${apiClient.baseURL}/api/non-existent-endpoint`);

    const requestContext = {
      operation: 'test_http_error',
      method: 'GET',
      endpoint: '/api/non-existent-endpoint',
      requestStart: Date.now() - 50
    };

    const capturedError = await errorCapture.captureResponseError(response, requestContext);

    // Verify HTTP error capture structure
    expect(capturedError).toHaveProperty('id');
    expect(capturedError).toHaveProperty('timestamp');
    expect(capturedError).toHaveProperty('type', 'http_response_error');
    expect(capturedError).toHaveProperty('response');
    expect(capturedError).toHaveProperty('request');
    expect(capturedError).toHaveProperty('system');
    expect(capturedError).toHaveProperty('database');

    // Verify response details
    expect(capturedError.response.status).toBe(404);
    expect(capturedError.response.statusText).toBe('Not Found');
    expect(capturedError.response.url).toContain('/api/non-existent-endpoint');

    // Verify request context
    expect(capturedError.request.context.operation).toBe('test_http_error');
    expect(capturedError.request.context.method).toBe('GET');

    console.log('✅ HTTP response error captured successfully:', {
      id: capturedError.id,
      status: capturedError.response.status,
      statusText: capturedError.response.statusText,
      url: capturedError.response.url
    });
  });

  test('should capture database state information', async () => {
    console.log('\n=== Testing database state capture ===');

    const databaseState = await errorCapture.captureDatabaseState();

    // Verify database state structure
    expect(databaseState).toHaveProperty('connected');
    expect(databaseState).toHaveProperty('totalConnections');
    expect(databaseState).toHaveProperty('idleConnections');
    expect(databaseState).toHaveProperty('waitingClients');
    expect(databaseState).toHaveProperty('tables');

    // Verify table information
    expect(databaseState.tables).toHaveProperty('aliases');
    expect(databaseState.tables).toHaveProperty('expenses');

    if (databaseState.connected) {
      expect(databaseState.tables.aliases).toHaveProperty('exists');
      expect(databaseState.tables.expenses).toHaveProperty('exists');
      
      if (databaseState.tables.aliases.exists) {
        expect(databaseState.tables.aliases).toHaveProperty('rowCount');
        expect(typeof databaseState.tables.aliases.rowCount).toBe('number');
      }
      
      if (databaseState.tables.expenses.exists) {
        expect(databaseState.tables.expenses).toHaveProperty('rowCount');
        expect(typeof databaseState.tables.expenses.rowCount).toBe('number');
      }
    }

    console.log('✅ Database state captured successfully:', {
      connected: databaseState.connected,
      totalConnections: databaseState.totalConnections,
      aliasesExists: databaseState.tables.aliases?.exists,
      expensesExists: databaseState.tables.expenses?.exists,
      aliasesCount: databaseState.tables.aliases?.rowCount,
      expensesCount: databaseState.tables.expenses?.rowCount
    });
  });

  test('should capture system performance metrics', async () => {
    console.log('\n=== Testing system performance capture ===');

    const context = {
      operation: 'performance_test',
      startTime: Date.now() - 200
    };

    const performanceMetrics = errorCapture.capturePerformanceMetrics(context);

    // Verify performance metrics structure
    expect(performanceMetrics).toHaveProperty('timestamp');
    expect(performanceMetrics).toHaveProperty('context', 'performance_test');
    expect(performanceMetrics).toHaveProperty('timing');
    expect(performanceMetrics).toHaveProperty('memory');

    // Verify timing information
    expect(performanceMetrics.timing).toHaveProperty('start');
    expect(performanceMetrics.timing).toHaveProperty('end');
    expect(performanceMetrics.timing).toHaveProperty('duration');
    expect(performanceMetrics.timing.duration).toBeGreaterThan(0);

    // Verify memory information
    expect(performanceMetrics.memory).toHaveProperty('rss');
    expect(performanceMetrics.memory).toHaveProperty('heapTotal');
    expect(performanceMetrics.memory).toHaveProperty('heapUsed');

    console.log('✅ Performance metrics captured successfully:', {
      context: performanceMetrics.context,
      duration: performanceMetrics.timing.duration,
      memoryUsed: `${Math.round(performanceMetrics.memory.heapUsed / 1024 / 1024)}MB`
    });
  });

  test('should generate comprehensive error report', async () => {
    console.log('\n=== Testing error report generation ===');

    // Generate some test errors
    const testError1 = new Error('First test error');
    const testError2 = new Error('Second test error');

    await errorCapture.captureError(testError1, { operation: 'test1' });
    await errorCapture.captureError(testError2, { operation: 'test2' });

    // Generate performance metrics
    errorCapture.capturePerformanceMetrics({ operation: 'perf1', startTime: Date.now() - 100 });
    errorCapture.capturePerformanceMetrics({ operation: 'perf2', startTime: Date.now() - 200 });

    const report = errorCapture.generateErrorReport();

    // Verify report structure
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('database');
    expect(report).toHaveProperty('system');
    expect(report).toHaveProperty('recommendations');

    // Verify summary
    expect(report.summary).toHaveProperty('totalErrors', 2);
    expect(report.summary).toHaveProperty('recentErrors');
    expect(report.summary).toHaveProperty('errorTypes');
    expect(report.summary).toHaveProperty('performanceIssues');

    // Verify error types
    expect(report.summary.errorTypes).toHaveProperty('Error', 2);

    // Verify recent errors
    expect(Array.isArray(report.summary.recentErrors)).toBe(true);
    expect(report.summary.recentErrors.length).toBe(2);

    console.log('✅ Error report generated successfully:', {
      totalErrors: report.summary.totalErrors,
      errorTypes: Object.keys(report.summary.errorTypes),
      hasRecommendations: report.recommendations.length > 0,
      performanceIssues: report.summary.performanceIssues.length
    });
  });

  test('should provide actionable recommendations', async () => {
    console.log('\n=== Testing recommendation generation ===');

    // Simulate multiple errors to trigger recommendations
    for (let i = 0; i < 12; i++) {
      await errorCapture.captureError(new Error(`Test error ${i}`), { operation: `test${i}` });
    }

    const recommendations = errorCapture.generateRecommendations();

    expect(Array.isArray(recommendations)).toBe(true);

    // Should have high error rate recommendation
    const highErrorRateRec = recommendations.find(r => r.type === 'high_error_rate');
    expect(highErrorRateRec).toBeDefined();
    expect(highErrorRateRec.priority).toBe('medium');
    expect(highErrorRateRec.message).toContain('High number of errors');

    console.log('✅ Recommendations generated successfully:', {
      totalRecommendations: recommendations.length,
      types: recommendations.map(r => r.type),
      priorities: recommendations.map(r => r.priority)
    });
  });

  test('should export error data for analysis', async () => {
    console.log('\n=== Testing error data export ===');

    // Generate some test data
    await errorCapture.captureError(new Error('Export test error'), { operation: 'export_test' });
    errorCapture.capturePerformanceMetrics({ operation: 'export_perf' });

    const exportedData = errorCapture.exportErrorData();

    // Verify export structure
    expect(exportedData).toHaveProperty('errors');
    expect(exportedData).toHaveProperty('performance');
    expect(exportedData).toHaveProperty('database');
    expect(exportedData).toHaveProperty('report');

    // Verify data integrity
    expect(Array.isArray(exportedData.errors)).toBe(true);
    expect(Array.isArray(exportedData.performance)).toBe(true);
    expect(exportedData.errors.length).toBeGreaterThan(0);
    expect(exportedData.performance.length).toBeGreaterThan(0);

    // Verify report is included
    expect(exportedData.report).toHaveProperty('summary');
    expect(exportedData.report).toHaveProperty('recommendations');

    console.log('✅ Error data exported successfully:', {
      errorsCount: exportedData.errors.length,
      performanceCount: exportedData.performance.length,
      hasReport: !!exportedData.report.summary,
      reportSize: JSON.stringify(exportedData).length
    });
  });

  test('should integrate with API testing workflow', async ({ request }) => {
    console.log('\n=== Testing integration with API workflow ===');

    // Test successful API call with performance tracking
    const startTime = Date.now();
    
    try {
      const response = await request.get(`${apiClient.baseURL}/api/aliases`);
      
      const context = {
        operation: 'api_integration_test',
        method: 'GET',
        endpoint: '/api/aliases',
        requestStart: startTime,
        url: response.url()
      };

      if (response.ok()) {
        // Capture performance metrics for successful request
        const metrics = errorCapture.capturePerformanceMetrics(context);
        
        expect(metrics.timing.duration).toBeGreaterThan(0);
        expect(metrics.context).toBe('api_integration_test');
        
        console.log('✅ Successful API call tracked:', {
          duration: metrics.timing.duration,
          status: response.status()
        });
      } else {
        // Capture error for failed request
        const capturedError = await errorCapture.captureResponseError(response, context);
        
        expect(capturedError.type).toBe('http_response_error');
        expect(capturedError.response.status).toBe(response.status());
        
        console.log('📊 Failed API call captured:', {
          status: capturedError.response.status,
          errorId: capturedError.id
        });
      }
    } catch (error) {
      // Capture JavaScript error
      const capturedError = await errorCapture.captureError(error, {
        operation: 'api_integration_test',
        endpoint: '/api/aliases'
      });
      
      expect(capturedError.error.message).toBe(error.message);
      
      console.log('📊 JavaScript error captured:', {
        message: capturedError.error.message,
        errorId: capturedError.id
      });
    }

    // Verify error capture system has data
    const exportedData = errorCapture.exportErrorData();
    expect(exportedData.performance.length).toBeGreaterThan(0);
    
    console.log('✅ API workflow integration successful');
  });
});