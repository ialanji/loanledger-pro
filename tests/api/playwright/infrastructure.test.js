import { test, expect } from '@playwright/test';
import { APITestClient } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, validateTestEnvironment } from './utils/test-helpers.js';

test.describe('API Testing Infrastructure', () => {
  let apiClient;

  test.beforeAll(async () => {
    // Validate environment
    validateTestEnvironment();
    
    // Setup test environment
    await setupTestEnvironment();
  });

  test.afterAll(async () => {
    // Cleanup test environment
    await cleanupTestEnvironment();
  });

  test.beforeEach(async ({ request }) => {
    apiClient = new APITestClient(request);
  });

  test('should verify server is running and accessible', async () => {
    const isReady = await apiClient.waitForServerReady(10);
    expect(isReady).toBe(true);
  });

  test('should verify database connection through API', async () => {
    // Test aliases endpoint (which creates table if not exists)
    const result = await apiClient.testAliasesEndpoint();
    
    console.log('Aliases endpoint test result:', {
      success: result.success,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      dataCount: result.data ? result.data.length : 'N/A'
    });

    if (!result.success) {
      console.error('Aliases endpoint error details:', result.errorDetails);
    }

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('should verify expenses endpoint accessibility', async () => {
    // Test expenses endpoint (which creates table if not exists)
    const result = await apiClient.testExpensesEndpoint();
    
    console.log('Expenses endpoint test result:', {
      success: result.success,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      dataCount: result.data ? result.data.length : 'N/A'
    });

    if (!result.success) {
      console.error('Expenses endpoint error details:', result.errorDetails);
    }

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('should capture detailed error information on failure', async ({ request }) => {
    // Test a non-existent endpoint to verify error capture
    const response = await request.get('http://localhost:3001/api/non-existent');
    
    expect(response.status()).toBe(404);
    
    const errorDetails = await apiClient.captureErrorDetails(response, { 
      test: 'non-existent endpoint',
      expectedBehavior: '404 error'
    });
    
    expect(errorDetails).toHaveProperty('message');
    expect(errorDetails).toHaveProperty('statusCode', 404);
    expect(errorDetails).toHaveProperty('timestamp');
    expect(errorDetails).toHaveProperty('requestContext');
    
    console.log('Error capture test successful:', {
      statusCode: errorDetails.statusCode,
      message: errorDetails.message
    });
  });

  test('should measure response times', async () => {
    const startTime = Date.now();
    const result = await apiClient.testAliasesEndpoint();
    const totalTime = Date.now() - startTime;
    
    expect(result.responseTime).toBeGreaterThan(0);
    expect(result.responseTime).toBeLessThan(10000); // Should respond within 10 seconds
    
    console.log('Response time test:', {
      apiResponseTime: result.responseTime,
      totalTestTime: totalTime
    });
  });
});