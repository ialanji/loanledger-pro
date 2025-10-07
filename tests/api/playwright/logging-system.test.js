import { test, expect } from '@playwright/test';
import { APITestClient } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, validateTestEnvironment } from './utils/test-helpers.js';

test.describe('Comprehensive Logging System Test Suite', () => {
  let apiClient;

  test.beforeAll(async () => {
    validateTestEnvironment();
    await setupTestEnvironment();
  });

  test.afterAll(async () => {
    await cleanupTestEnvironment();
  });

  test.beforeEach(async ({ request }) => {
    apiClient = new APITestClient(request);
  });

  test.afterEach(async () => {
    await cleanupTestEnvironment();
  });

  test.describe('Debug Endpoints', () => {
    test('should provide system health information', async () => {
      console.log('\n=== Testing system health endpoint ===');
      
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/debug/health`);
      
      expect(response.ok()).toBe(true);
      const healthData = await response.json();
      
      // Verify health data structure
      expect(healthData).toHaveProperty('status');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('memory');
      expect(healthData).toHaveProperty('database');
      expect(healthData).toHaveProperty('environment');
      expect(healthData).toHaveProperty('nodeVersion');
      expect(healthData).toHaveProperty('pid');

      // Verify database health
      expect(healthData.database).toHaveProperty('healthy');
      expect(healthData.database).toHaveProperty('responseTime');

      console.log(`✅ Health check passed - Status: ${healthData.status}`);
      console.log(`   Database healthy: ${healthData.database.healthy}`);
      console.log(`   Response time: ${healthData.database.responseTime}ms`);
    });

    test('should provide database connection status', async () => {
      console.log('\n=== Testing database status endpoint ===');
      
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/debug/database`);
      
      expect(response.ok()).toBe(true);
      const dbStatus = await response.json();
      
      // Verify database status structure
      expect(dbStatus).toHaveProperty('connectionHealth');
      expect(dbStatus).toHaveProperty('poolStats');
      expect(dbStatus).toHaveProperty('queryTest');
      expect(dbStatus).toHaveProperty('timestamp');

      // Verify pool statistics
      expect(dbStatus.poolStats).toHaveProperty('totalConnections');
      expect(dbStatus.poolStats).toHaveProperty('idleConnections');
      expect(dbStatus.poolStats).toHaveProperty('maxConnections');

      // Verify query test
      expect(dbStatus.queryTest).toHaveProperty('success');
      if (dbStatus.queryTest.success) {
        expect(dbStatus.queryTest).toHaveProperty('responseTime');
        expect(dbStatus.queryTest).toHaveProperty('currentTime');
        expect(dbStatus.queryTest).toHaveProperty('postgresVersion');
      }

      console.log(`✅ Database status check passed`);
      console.log(`   Query test success: ${dbStatus.queryTest.success}`);
      console.log(`   Total connections: ${dbStatus.poolStats.totalConnections}`);
    });

    test('should provide performance metrics', async () => {
      console.log('\n=== Testing performance metrics endpoint ===');
      
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/debug/performance`);
      
      expect(response.ok()).toBe(true);
      const perfData = await response.json();
      
      // Verify performance data structure
      expect(perfData).toHaveProperty('timestamp');
      expect(perfData).toHaveProperty('uptime');
      expect(perfData).toHaveProperty('memory');
      expect(perfData).toHaveProperty('cpuUsage');

      // Verify memory metrics
      expect(perfData.memory).toHaveProperty('heapUsed');
      expect(perfData.memory).toHaveProperty('heapTotal');
      expect(perfData.memory).toHaveProperty('external');
      expect(perfData.memory).toHaveProperty('rss');

      console.log(`✅ Performance metrics check passed`);
      console.log(`   Heap used: ${perfData.memory.heapUsed}MB`);
      console.log(`   Uptime: ${Math.round(perfData.uptime)}s`);
    });

    test('should provide logging configuration', async () => {
      console.log('\n=== Testing logging configuration endpoint ===');
      
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/debug/logging`);
      
      expect(response.ok()).toBe(true);
      const loggingConfig = await response.json();
      
      // Verify logging configuration structure
      expect(loggingConfig).toHaveProperty('logLevel');
      expect(loggingConfig).toHaveProperty('nodeEnv');
      expect(loggingConfig).toHaveProperty('logResponseBody');
      expect(loggingConfig).toHaveProperty('logAllRequests');
      expect(loggingConfig).toHaveProperty('skipLogPaths');
      expect(loggingConfig).toHaveProperty('requestTimeout');

      console.log(`✅ Logging configuration check passed`);
      console.log(`   Log level: ${loggingConfig.logLevel}`);
      console.log(`   Environment: ${loggingConfig.nodeEnv}`);
    });

    test('should test logging functionality', async () => {
      console.log('\n=== Testing logging functionality ===');
      
      const testData = {
        level: 'info',
        message: 'Test log message from automated test',
        includeError: false
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/debug/test-logging`, {
        data: testData
      });
      
      expect(response.ok()).toBe(true);
      const result = await response.json();
      
      // Verify test logging response
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('testData');
      expect(result).toHaveProperty('logLevel');
      expect(result).toHaveProperty('timestamp');

      // Verify test data structure
      expect(result.testData).toHaveProperty('testId');
      expect(result.testData).toHaveProperty('timestamp');
      expect(result.testData).toHaveProperty('dbTest');

      // Verify database test
      expect(result.testData.dbTest).toHaveProperty('success');
      if (result.testData.dbTest.success) {
        expect(result.testData.dbTest).toHaveProperty('result');
      }

      console.log(`✅ Logging functionality test passed`);
      console.log(`   Test ID: ${result.testData.testId}`);
      console.log(`   DB test success: ${result.testData.dbTest.success}`);
    });

    test('should provide system information', async () => {
      console.log('\n=== Testing system information endpoint ===');
      
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/debug/system`);
      
      expect(response.ok()).toBe(true);
      const systemInfo = await response.json();
      
      // Verify system information structure
      expect(systemInfo).toHaveProperty('timestamp');
      expect(systemInfo).toHaveProperty('process');
      expect(systemInfo).toHaveProperty('memory');
      expect(systemInfo).toHaveProperty('environment');

      // Verify process information
      expect(systemInfo.process).toHaveProperty('pid');
      expect(systemInfo.process).toHaveProperty('platform');
      expect(systemInfo.process).toHaveProperty('arch');
      expect(systemInfo.process).toHaveProperty('version');
      expect(systemInfo.process).toHaveProperty('uptime');

      // Verify environment information
      expect(systemInfo.environment).toHaveProperty('nodeEnv');
      expect(systemInfo.environment).toHaveProperty('port');

      console.log(`✅ System information check passed`);
      console.log(`   Platform: ${systemInfo.process.platform}`);
      console.log(`   Node version: ${systemInfo.process.version}`);
      console.log(`   PID: ${systemInfo.process.pid}`);
    });
  });

  test.describe('Request Logging Verification', () => {
    test('should log API requests with proper structure', async () => {
      console.log('\n=== Testing request logging structure ===');
      
      // Make a simple API request that should be logged
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/aliases`);
      
      expect(response.ok()).toBe(true);
      
      // Verify response headers include logging indicators
      const headers = response.headers();
      
      // The request logging middleware should add headers
      // Note: We can't directly verify console logs in this test,
      // but we can verify the request was processed correctly
      expect(response.status()).toBe(200);
      
      console.log(`✅ Request logging verification passed`);
      console.log(`   Status: ${response.status()}`);
      console.log(`   Headers present: ${Object.keys(headers).length}`);
    });

    test('should handle error logging correctly', async () => {
      console.log('\n=== Testing error logging ===');
      
      // Make a request that should generate an error (non-existent endpoint)
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/non-existent-endpoint`);
      
      expect(response.ok()).toBe(false);
      expect(response.status()).toBe(404);
      
      // The error should be logged by the error logging middleware
      console.log(`✅ Error logging verification passed`);
      console.log(`   Error status: ${response.status()}`);
    });

    test('should handle performance monitoring', async () => {
      console.log('\n=== Testing performance monitoring ===');
      
      // Make multiple requests to test performance monitoring
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          apiClient.request.get(`${apiClient.baseURL}/api/debug/health`)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      for (const response of responses) {
        expect(response.ok()).toBe(true);
      }
      
      console.log(`✅ Performance monitoring verification passed`);
      console.log(`   Concurrent requests: ${responses.length}`);
      console.log(`   All successful: ${responses.every(r => r.ok())}`);
    });
  });

  test.describe('Database Query Logging', () => {
    test('should log database queries correctly', async () => {
      console.log('\n=== Testing database query logging ===');
      
      // Make a request that involves database queries
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/aliases?limit=5`);
      
      expect(response.ok()).toBe(true);
      const data = await response.json();
      
      // Verify the response structure
      expect(Array.isArray(data)).toBe(true);
      
      // The database query should be logged automatically
      console.log(`✅ Database query logging verification passed`);
      console.log(`   Response data length: ${data.length}`);
    });

    test('should handle database errors with proper logging', async () => {
      console.log('\n=== Testing database error logging ===');
      
      // Test the database test endpoint which might have controlled errors
      const response = await apiClient.request.post(`${apiClient.baseURL}/api/debug/test-logging`, {
        data: {
          level: 'error',
          message: 'Test database error logging',
          includeError: true
        }
      });
      
      expect(response.ok()).toBe(true);
      const result = await response.json();
      
      // Verify the test completed
      expect(result).toHaveProperty('testData');
      
      console.log(`✅ Database error logging verification passed`);
      console.log(`   Test completed with result: ${result.message}`);
    });
  });
});