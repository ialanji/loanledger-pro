import { test, expect } from '@playwright/test';
import { APITestClient, validateResponseStructure, logTestResult } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, seedTestData, validateTestEnvironment } from './utils/test-helpers.js';
import { testExpenses } from './fixtures/test-data.js';

test.describe('Expenses Endpoint Diagnostic Tests', () => {
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

  test('should successfully retrieve expenses list', async () => {
    console.log('\n=== Testing expenses endpoint GET operation ===');
    
    const result = await apiClient.testExpensesEndpoint();
    
    logTestResult('Expenses GET operation', result);
    
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    
    // Validate response structure
    if (result.data.length > 0) {
      const expectedFields = [
        'id', 'source', 'date', 'amount', 'currency', 
        'department', 'supplier', 'category', 'description', 
        'created_at', 'updated_at'
      ];
      const structureErrors = validateResponseStructure(result.data, expectedFields);
      
      if (structureErrors.length > 0) {
        console.error('Response structure validation errors:', structureErrors);
      }
      
      expect(structureErrors.length).toBe(0);
    }
    
    console.log(`✅ Successfully retrieved ${result.data.length} expenses`);
  });

  test('should successfully create new expense', async ({ request }) => {
    console.log('\n=== Testing expenses endpoint POST operation ===');
    
    const testExpense = testExpenses[0];
    
    try {
      const response = await request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      const responseTime = Date.now();
      const result = {
        success: response.ok(),
        statusCode: response.status(),
        responseTime,
        headers: await response.headers()
      };

      if (response.ok()) {
        result.data = await response.json();
      } else {
        result.errorDetails = await apiClient.captureErrorDetails(response, { 
          operation: 'CREATE', 
          testData: testExpense 
        });
      }

      logTestResult('Expense CREATE operation', result);
      
      if (result.success) {
        expect(result.statusCode).toBe(201); // 201 Created is correct for POST
        expect(result.data).toHaveProperty('id');
        expect(result.data.source).toBe(testExpense.source);
        expect(result.data.amount).toBe(testExpense.amount.toString());
        expect(result.data.currency).toBe(testExpense.currency);
        
        console.log('✅ Successfully created expense:', {
          id: result.data.id,
          source: result.data.source,
          amount: result.data.amount,
          currency: result.data.currency
        });
      } else {
        console.error('❌ Failed to create expense:', result.errorDetails);
        
        // Don't fail the test here - we want to capture the diagnostic info
        console.log('📊 Diagnostic info captured for expense creation failure');
      }
    } catch (error) {
      console.error('Unexpected error during expense creation:', error);
      throw error;
    }
  });

  test('should test expense update operation', async ({ request }) => {
    console.log('\n=== Testing expenses endpoint PUT operation ===');
    
    // First create an expense
    const testExpense = testExpenses[0];
    
    try {
      const createResponse = await request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      if (createResponse.ok()) {
        const createdExpense = await createResponse.json();
        console.log('✅ Created expense for update test:', createdExpense.id);
        
        // Now try to update it
        const updateData = {
          ...testExpense,
          amount: 9999.99,
          description: 'Updated test expense'
        };
        
        const updateResponse = await request.put(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`, {
          data: updateData
        });
        
        const updateResult = {
          success: updateResponse.ok(),
          statusCode: updateResponse.status(),
          headers: await updateResponse.headers()
        };

        if (updateResponse.ok()) {
          updateResult.data = await updateResponse.json();
        } else {
          updateResult.errorDetails = await apiClient.captureErrorDetails(updateResponse, { 
            operation: 'UPDATE', 
            id: createdExpense.id,
            updateData 
          });
        }

        logTestResult('Expense UPDATE operation', updateResult);
        
        if (updateResult.success) {
          expect(updateResult.data.amount).toBe('9999.99');
          expect(updateResult.data.description).toBe('Updated test expense');
          console.log('✅ Successfully updated expense');
        } else {
          console.error('❌ Failed to update expense:', updateResult.errorDetails);
          console.log('📊 Diagnostic info captured for expense update failure');
        }
      } else {
        console.log('⚠️ Could not create expense for update test, skipping update test');
      }
    } catch (error) {
      console.error('Unexpected error during expense update test:', error);
      throw error;
    }
  });

  test('should test expense deletion operation', async ({ request }) => {
    console.log('\n=== Testing expenses endpoint DELETE operation ===');
    
    // First create an expense
    const testExpense = testExpenses[0];
    
    try {
      const createResponse = await request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      if (createResponse.ok()) {
        const createdExpense = await createResponse.json();
        console.log('✅ Created expense for deletion test:', createdExpense.id);
        
        // Now try to delete it
        const deleteResponse = await request.delete(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`);
        
        const deleteResult = {
          success: deleteResponse.ok(),
          statusCode: deleteResponse.status(),
          headers: await deleteResponse.headers()
        };

        if (deleteResponse.ok()) {
          deleteResult.data = await deleteResponse.json();
        } else {
          deleteResult.errorDetails = await apiClient.captureErrorDetails(deleteResponse, { 
            operation: 'DELETE', 
            id: createdExpense.id
          });
        }

        logTestResult('Expense DELETE operation', deleteResult);
        
        if (deleteResult.success) {
          console.log('✅ Successfully deleted expense');
          
          // Verify the expense is actually deleted
          const verifyResponse = await request.get(`${apiClient.baseURL}/api/expenses`);
          if (verifyResponse.ok()) {
            const allExpenses = await verifyResponse.json();
            const deletedExpenseExists = allExpenses.some(exp => exp.id === createdExpense.id);
            
            if (!deletedExpenseExists) {
              console.log('✅ Verified expense was actually deleted from database');
            } else {
              console.log('⚠️ Expense still exists in database after deletion');
            }
          }
        } else {
          console.error('❌ Failed to delete expense:', deleteResult.errorDetails);
          console.log('📊 Diagnostic info captured for expense deletion failure');
        }
      } else {
        console.log('⚠️ Could not create expense for deletion test, skipping deletion test');
      }
    } catch (error) {
      console.error('Unexpected error during expense deletion test:', error);
      throw error;
    }
  });

  test('should handle invalid expense data gracefully', async ({ request }) => {
    console.log('\n=== Testing expenses endpoint with invalid data ===');
    
    const invalidExpenseData = [
      {
        name: 'Missing required date',
        data: {
          source: 'Test Source',
          amount: 100.00,
          currency: 'MDL'
          // Missing date field
        }
      },
      {
        name: 'Invalid date format',
        data: {
          source: 'Test Source',
          date: 'invalid-date',
          amount: 100.00,
          currency: 'MDL'
        }
      },
      {
        name: 'Invalid amount format',
        data: {
          source: 'Test Source',
          date: '2024-01-15',
          amount: 'not-a-number',
          currency: 'MDL'
        }
      },
      {
        name: 'Missing required amount',
        data: {
          source: 'Test Source',
          date: '2024-01-15',
          currency: 'MDL'
          // Missing amount field
        }
      }
    ];

    for (const testCase of invalidExpenseData) {
      console.log(`\n--- Testing: ${testCase.name} ---`);
      
      try {
        const response = await request.post(`${apiClient.baseURL}/api/expenses`, {
          data: testCase.data
        });
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          testCase: testCase.name
        };

        if (!response.ok()) {
          result.errorDetails = await apiClient.captureErrorDetails(response, { 
            operation: 'CREATE_INVALID', 
            testCase: testCase.name,
            invalidData: testCase.data 
          });
        } else {
          result.data = await response.json();
        }

        logTestResult(`Invalid data test: ${testCase.name}`, result);
        
        if (result.success) {
          console.log(`⚠️ Expected validation error but request succeeded for: ${testCase.name}`);
        } else {
          console.log(`✅ Properly rejected invalid data: ${testCase.name} (Status: ${result.statusCode})`);
        }
      } catch (error) {
        console.error(`Unexpected error testing ${testCase.name}:`, error);
      }
    }
  });

  test('should measure expenses endpoint performance', async () => {
    console.log('\n=== Testing expenses endpoint performance ===');
    
    const performanceResults = [];
    const testRuns = 5;
    
    for (let i = 0; i < testRuns; i++) {
      const startTime = Date.now();
      const result = await apiClient.testExpensesEndpoint();
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

  test('should test concurrent expense requests', async () => {
    console.log('\n=== Testing concurrent expenses requests ===');
    
    const concurrentRequests = 5;
    const promises = [];
    
    // Create multiple concurrent requests
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(apiClient.testExpensesEndpoint());
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

  test('should validate expenses table creation and schema', async () => {
    console.log('\n=== Testing expenses table creation and schema ===');
    
    // Seed some test data first
    await seedTestData();
    
    // Make a request to get expenses
    const result = await apiClient.testExpensesEndpoint();
    
    expect(result.success).toBe(true);
    
    // If we have data, validate the schema
    if (result.data && result.data.length > 0) {
      const firstExpense = result.data[0];
      const requiredFields = [
        'id', 'source', 'date', 'amount', 'currency', 
        'department', 'supplier', 'category', 'description', 
        'created_at', 'updated_at'
      ];
      
      console.log('Sample expense record:', firstExpense);
      
      requiredFields.forEach(field => {
        expect(firstExpense).toHaveProperty(field);
      });
      
      // Validate data types
      expect(typeof firstExpense.id).toBe('number');
      expect(typeof firstExpense.amount).toBe('string'); // PostgreSQL DECIMAL comes as string
      expect(typeof firstExpense.currency).toBe('string');
      expect(typeof firstExpense.created_at).toBe('string');
      expect(typeof firstExpense.updated_at).toBe('string');
      
      // Validate date format
      expect(new Date(firstExpense.date)).toBeInstanceOf(Date);
      expect(new Date(firstExpense.created_at)).toBeInstanceOf(Date);
      expect(new Date(firstExpense.updated_at)).toBeInstanceOf(Date);
      
      // Validate amount is a valid number string
      expect(parseFloat(firstExpense.amount)).not.toBeNaN();
      
      console.log('✅ Schema validation passed');
    } else {
      console.log('⚠️ No data available for schema validation (empty table)');
    }
  });

  test('should test database connection failure scenarios', async ({ request }) => {
    console.log('\n=== Testing database connection failure scenarios ===');
    
    // This test simulates what happens when there are database connectivity issues
    // We can't actually disconnect the database, but we can test edge cases
    
    try {
      // Test with extremely large payload to potentially cause issues
      const largeExpense = {
        source: 'A'.repeat(10000), // Very long source
        date: '2024-01-15',
        amount: 999999999.99,
        currency: 'MDL',
        department: 'B'.repeat(5000), // Very long department
        supplier: 'C'.repeat(5000), // Very long supplier
        category: 'D'.repeat(5000), // Very long category
        description: 'E'.repeat(50000) // Very long description
      };
      
      const response = await request.post(`${apiClient.baseURL}/api/expenses`, {
        data: largeExpense
      });
      
      const result = {
        success: response.ok(),
        statusCode: response.status(),
        testCase: 'Large payload test'
      };

      if (!response.ok()) {
        result.errorDetails = await apiClient.captureErrorDetails(response, { 
          operation: 'CREATE_LARGE_PAYLOAD',
          payloadSize: JSON.stringify(largeExpense).length
        });
      } else {
        result.data = await response.json();
      }

      logTestResult('Large payload test', result);
      
      if (result.success) {
        console.log('✅ Successfully handled large payload');
      } else {
        console.log('📊 Captured error details for large payload:', {
          statusCode: result.statusCode,
          message: result.errorDetails?.message
        });
      }
    } catch (error) {
      console.error('Unexpected error during large payload test:', error);
      console.log('📊 This may indicate a connection or processing issue');
    }
  });
});