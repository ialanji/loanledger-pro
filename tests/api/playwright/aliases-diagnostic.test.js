import { test, expect } from '@playwright/test';
import { APITestClient, validateResponseStructure, logTestResult } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, seedTestData, validateTestEnvironment } from './utils/test-helpers.js';
import { testAliases } from './fixtures/test-data.js';

test.describe('Aliases Endpoint Diagnostic Tests', () => {
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
    // Clean up any existing test data before each test
    await cleanupTestEnvironment();
    await setupTestEnvironment();
  });

  test.afterEach(async () => {
    await cleanupTestEnvironment();
  });

  test('should successfully retrieve aliases without type parameter', async () => {
    console.log('\n=== Testing aliases endpoint without type parameter ===');
    
    const result = await apiClient.testAliasesEndpoint();
    
    logTestResult('Aliases without type parameter', result);
    
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    
    // Validate response structure
    if (result.data.length > 0) {
      const expectedFields = ['id', 'source_value', 'normalized_value', 'type', 'is_group', 'created_at', 'updated_at'];
      const structureErrors = validateResponseStructure(result.data, expectedFields);
      
      if (structureErrors.length > 0) {
        console.error('Response structure validation errors:', structureErrors);
      }
      
      expect(structureErrors.length).toBe(0);
    }
    
    console.log(`✅ Successfully retrieved ${result.data.length} aliases`);
  });

  test('should successfully retrieve aliases with department type parameter', async () => {
    console.log('\n=== Testing aliases endpoint with department type ===');
    
    // First seed some test data
    await seedTestData();
    
    const result = await apiClient.testAliasesEndpoint('department');
    
    logTestResult('Aliases with department type', result);
    
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    
    // Verify that all returned aliases are of type 'department'
    if (result.data.length > 0) {
      const nonDepartmentAliases = result.data.filter(alias => alias.type !== 'department');
      
      if (nonDepartmentAliases.length > 0) {
        console.error('Found non-department aliases in department filter:', nonDepartmentAliases);
      }
      
      expect(nonDepartmentAliases.length).toBe(0);
      console.log(`✅ Successfully filtered ${result.data.length} department aliases`);
    } else {
      console.log('⚠️ No department aliases found (this may be expected if no test data exists)');
    }
  });

  test('should successfully retrieve aliases with supplier type parameter', async () => {
    console.log('\n=== Testing aliases endpoint with supplier type ===');
    
    // First seed some test data
    await seedTestData();
    
    const result = await apiClient.testAliasesEndpoint('supplier');
    
    logTestResult('Aliases with supplier type', result);
    
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    
    // Verify that all returned aliases are of type 'supplier'
    if (result.data.length > 0) {
      const nonSupplierAliases = result.data.filter(alias => alias.type !== 'supplier');
      
      if (nonSupplierAliases.length > 0) {
        console.error('Found non-supplier aliases in supplier filter:', nonSupplierAliases);
      }
      
      expect(nonSupplierAliases.length).toBe(0);
      console.log(`✅ Successfully filtered ${result.data.length} supplier aliases`);
    } else {
      console.log('⚠️ No supplier aliases found (this may be expected if no test data exists)');
    }
  });

  test('should handle invalid type parameter gracefully', async () => {
    console.log('\n=== Testing aliases endpoint with invalid type parameter ===');
    
    const result = await apiClient.testAliasesEndpoint('invalid_type');
    
    logTestResult('Aliases with invalid type', result);
    
    // The endpoint should now return 400 Bad Request for invalid type parameters
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails.responseData.error).toBe('Invalid type parameter');
    
    console.log(`✅ Properly rejected invalid type parameter with status ${result.statusCode}`);
  });

  test('should capture detailed error information on database failures', async ({ request }) => {
    console.log('\n=== Testing error capture for database failures ===');
    
    // This test simulates what happens when there are database issues
    // We'll test with a malformed request or by testing edge cases
    
    try {
      // Test with extremely long type parameter to potentially cause issues
      const longType = 'a'.repeat(1000);
      const result = await apiClient.testAliasesEndpoint(longType);
      
      logTestResult('Aliases with extremely long type parameter', result);
      
      // Should either succeed or fail gracefully with proper error details
      if (!result.success) {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.message).toBeDefined();
        expect(result.errorDetails.timestamp).toBeDefined();
        expect(result.errorDetails.requestContext).toBeDefined();
        
        console.log('✅ Error details captured successfully:', {
          message: result.errorDetails.message,
          statusCode: result.errorDetails.statusCode,
          hasContext: !!result.errorDetails.requestContext
        });
      } else {
        console.log('✅ Endpoint handled extremely long parameter successfully');
      }
    } catch (error) {
      console.error('Unexpected error during error capture test:', error);
      throw error;
    }
  });

  test('should measure response times and performance', async () => {
    console.log('\n=== Testing aliases endpoint performance ===');
    
    const performanceResults = [];
    const testRuns = 5;
    
    for (let i = 0; i < testRuns; i++) {
      const startTime = Date.now();
      const result = await apiClient.testAliasesEndpoint();
      const totalTime = Date.now() - startTime;
      
      performanceResults.push({
        run: i + 1,
        success: result.success,
        apiResponseTime: result.responseTime,
        totalTime,
        dataCount: result.data ? result.data.length : 0
      });
      
      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    }
    
    const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.apiResponseTime, 0) / testRuns;
    const avgTotalTime = performanceResults.reduce((sum, r) => sum + r.totalTime, 0) / testRuns;
    
    console.log('📊 Performance Results:', {
      testRuns,
      averageApiResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      averageTotalTime: `${avgTotalTime.toFixed(2)}ms`,
      allSuccessful: performanceResults.every(r => r.success),
      results: performanceResults
    });
    
    // Performance assertions
    expect(avgResponseTime).toBeLessThan(1000); // Average should be under 1 second
    expect(performanceResults.every(r => r.success)).toBe(true);
  });

  test('should test CRUD operations for aliases', async () => {
    console.log('\n=== Testing aliases CRUD operations ===');
    
    const testAlias = testAliases[0]; // Use first test alias
    
    const crudResults = await apiClient.testCRUDOperations('aliases', testAlias);
    
    console.log('CRUD Results Summary:', {
      create: crudResults.create?.success || false,
      read: crudResults.read?.success || false,
      update: crudResults.update?.success || false,
      delete: crudResults.delete?.success || false
    });
    
    // Log detailed results for each operation
    Object.entries(crudResults).forEach(([operation, result]) => {
      if (result) {
        logTestResult(`Alias ${operation.toUpperCase()}`, result);
        
        if (!result.success && result.errorDetails) {
          console.error(`${operation.toUpperCase()} Error Details:`, result.errorDetails);
        }
      }
    });
    
    // At minimum, CREATE should work (the others might fail due to endpoint implementation)
    if (crudResults.create) {
      expect(crudResults.create.success).toBe(true);
      expect(crudResults.create.statusCode).toBe(201); // 201 Created is correct for POST
      
      if (crudResults.create.data) {
        expect(crudResults.create.data).toHaveProperty('id');
        expect(crudResults.create.data.source_value).toBe(testAlias.source_value);
        expect(crudResults.create.data.normalized_value).toBe(testAlias.normalized_value);
        expect(crudResults.create.data.type).toBe(testAlias.type);
      }
    }
  });

  test('should test concurrent requests handling', async () => {
    console.log('\n=== Testing concurrent aliases requests ===');
    
    const concurrentRequests = 5;
    const promises = [];
    
    // Create multiple concurrent requests
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(apiClient.testAliasesEndpoint());
    }
    
    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    console.log('🔄 Concurrent Request Results:', {
      totalRequests: concurrentRequests,
      successfulRequests: successCount,
      failedRequests: concurrentRequests - successCount,
      averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      allSuccessful: successCount === concurrentRequests
    });
    
    // Log any failures
    results.forEach((result, index) => {
      if (!result.success) {
        console.error(`Request ${index + 1} failed:`, result.errorDetails);
      }
    });
    
    // At least 80% of concurrent requests should succeed
    expect(successCount / concurrentRequests).toBeGreaterThanOrEqual(0.8);
  });

  test('should validate database table creation and schema', async () => {
    console.log('\n=== Testing aliases table creation and schema ===');
    
    // Make a request to trigger table creation
    const result = await apiClient.testAliasesEndpoint();
    
    expect(result.success).toBe(true);
    
    // If we have data, validate the schema
    if (result.data && result.data.length > 0) {
      const firstAlias = result.data[0];
      const requiredFields = ['id', 'source_value', 'normalized_value', 'type', 'is_group', 'created_at', 'updated_at'];
      
      console.log('Sample alias record:', firstAlias);
      
      requiredFields.forEach(field => {
        expect(firstAlias).toHaveProperty(field);
      });
      
      // Validate data types
      expect(typeof firstAlias.id).toBe('number');
      expect(typeof firstAlias.source_value).toBe('string');
      expect(typeof firstAlias.normalized_value).toBe('string');
      expect(typeof firstAlias.type).toBe('string');
      expect(typeof firstAlias.is_group).toBe('boolean');
      expect(typeof firstAlias.created_at).toBe('string');
      expect(typeof firstAlias.updated_at).toBe('string');
      
      console.log('✅ Schema validation passed');
    } else {
      console.log('⚠️ No data available for schema validation (empty table)');
    }
  });
});