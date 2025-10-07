import { test, expect } from '@playwright/test';
import { APITestClient, validateResponseStructure, logTestResult } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, seedTestData, validateTestEnvironment } from './utils/test-helpers.js';
import { testAliases, testExpenses, invalidTestData } from './fixtures/test-data.js';

test.describe('API Error Scenarios and Edge Cases Test Suite', () => {
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

  test.describe('Database Connection Failure Scenarios', () => {
    test('should handle database connection timeout gracefully', async () => {
      console.log('\n=== Testing database connection timeout handling ===');
      
      // This test simulates what happens when database queries take too long
      // We'll test with a very large dataset request that might timeout
      const response = await apiClient.request.get(`${apiClient.baseURL}/api/aliases?limit=999999`);
      
      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'TIMEOUT_TEST' }) : null
      };

      logTestResult('Database connection timeout test', result);

      // Should either succeed with reasonable response time or fail gracefully
      if (!result.success) {
        expect([408, 500, 503]).toContain(result.statusCode); // Timeout, Internal Error, or Service Unavailable
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.message).toBeDefined();
      } else {
        // If it succeeds, it should return valid data
        expect(Array.isArray(result.data)).toBe(true);
      }

      console.log(`✅ Database timeout scenario handled appropriately`);
    });

    test('should handle database unavailable scenario', async () => {
      console.log('\n=== Testing database unavailable scenario ===');
      
      // Test multiple endpoints when database might be unavailable
      const endpoints = [
        '/api/aliases',
        '/api/expenses',
        '/api/aliases?type=department',
        '/api/expenses?limit=10'
      ];

      for (const endpoint of endpoints) {
        const response = await apiClient.request.get(`${apiClient.baseURL}${endpoint}`);
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          endpoint,
          data: response.ok() ? await response.json() : null,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'DB_UNAVAILABLE_TEST', endpoint }) : null
        };

        logTestResult(`Database unavailable test - ${endpoint}`, result);

        // Should either succeed or fail with appropriate error codes
        if (!result.success) {
          expect([500, 503, 502]).toContain(result.statusCode); // Internal Error, Service Unavailable, or Bad Gateway
          expect(result.errorDetails).toBeDefined();
        }
      }

      console.log(`✅ Database unavailable scenarios tested for all endpoints`);
    });

    test('should handle connection pool exhaustion', async () => {
      console.log('\n=== Testing connection pool exhaustion ===');
      
      // Create multiple concurrent requests to potentially exhaust connection pool
      const concurrentRequests = 20;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          apiClient.request.get(`${apiClient.baseURL}/api/aliases`).then(async (response) => ({
            success: response.ok(),
            statusCode: response.status(),
            requestId: i,
            errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'POOL_EXHAUSTION_TEST', requestId: i }) : null
          }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`Concurrent requests: ${successCount} successful, ${failureCount} failed`);

      // At least some requests should succeed, but some might fail due to pool exhaustion
      expect(successCount).toBeGreaterThan(0);

      // Check that failures have appropriate error codes
      const failures = results.filter(r => !r.success);
      for (const failure of failures) {
        expect([500, 503, 429]).toContain(failure.statusCode); // Internal Error, Service Unavailable, or Too Many Requests
      }

      console.log(`✅ Connection pool exhaustion scenario tested - ${successCount}/${concurrentRequests} requests succeeded`);
    });
  });

  test.describe('Invalid Parameter Handling and Validation', () => {
    test('should validate aliases endpoint parameters', async () => {
      console.log('\n=== Testing aliases endpoint parameter validation ===');
      
      const invalidParameters = [
        { param: 'type', value: 'invalid_type', expectedStatus: 400 },
        { param: 'type', value: '', expectedStatus: 400 },
        { param: 'type', value: null, expectedStatus: 400 },
        { param: 'limit', value: 'not_a_number', expectedStatus: 400 },
        { param: 'limit', value: -1, expectedStatus: 400 },
        { param: 'offset', value: 'not_a_number', expectedStatus: 400 },
        { param: 'offset', value: -1, expectedStatus: 400 }
      ];

      for (const { param, value, expectedStatus } of invalidParameters) {
        let url = `${apiClient.baseURL}/api/aliases`;
        if (value !== null) {
          url += `?${param}=${value}`;
        }

        const response = await apiClient.request.get(url);
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          param,
          value,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'PARAM_VALIDATION', param, value }) : null
        };

        logTestResult(`Invalid parameter test - ${param}=${value}`, result);

        if (expectedStatus === 400) {
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(expectedStatus);
          expect(result.errorDetails).toBeDefined();
        }
      }

      console.log(`✅ Parameter validation tested for aliases endpoint`);
    });

    test('should validate expenses endpoint parameters', async () => {
      console.log('\n=== Testing expenses endpoint parameter validation ===');
      
      const invalidParameters = [
        { param: 'limit', value: 'not_a_number', expectedStatus: 400 },
        { param: 'limit', value: -1, expectedStatus: 400 },
        { param: 'offset', value: 'not_a_number', expectedStatus: 400 },
        { param: 'offset', value: -1, expectedStatus: 400 },
        { param: 'date_from', value: 'invalid_date', expectedStatus: 400 },
        { param: 'date_to', value: 'invalid_date', expectedStatus: 400 },
        { param: 'amount_min', value: 'not_a_number', expectedStatus: 400 },
        { param: 'amount_max', value: 'not_a_number', expectedStatus: 400 }
      ];

      for (const { param, value, expectedStatus } of invalidParameters) {
        const url = `${apiClient.baseURL}/api/expenses?${param}=${value}`;
        const response = await apiClient.request.get(url);
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          param,
          value,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'PARAM_VALIDATION', param, value }) : null
        };

        logTestResult(`Invalid parameter test - ${param}=${value}`, result);

        if (expectedStatus === 400) {
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(expectedStatus);
          expect(result.errorDetails).toBeDefined();
        }
      }

      console.log(`✅ Parameter validation tested for expenses endpoint`);
    });

    test('should handle malformed JSON in POST requests', async () => {
      console.log('\n=== Testing malformed JSON handling ===');
      
      const malformedPayloads = [
        '{"invalid": json}',
        '{"unclosed": "string}',
        '{invalid_key: "value"}',
        '{"trailing": "comma",}',
        'not json at all',
        ''
      ];

      for (const payload of malformedPayloads) {
        const response = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: payload,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          payload: payload.substring(0, 50) + (payload.length > 50 ? '...' : ''),
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'MALFORMED_JSON', payload }) : null
        };

        logTestResult(`Malformed JSON test`, result);

        expect(result.success).toBe(false);
        expect([400, 422]).toContain(result.statusCode); // Bad Request or Unprocessable Entity
        expect(result.errorDetails).toBeDefined();
      }

      console.log(`✅ Malformed JSON handling tested`);
    });

    test('should validate required fields in POST requests', async () => {
      console.log('\n=== Testing required field validation ===');
      
      // Test aliases endpoint
      const invalidAliasPayloads = [
        {}, // Empty object
        { source_value: '' }, // Empty source_value
        { normalized_value: '' }, // Empty normalized_value
        { source_value: 'test' }, // Missing normalized_value
        { normalized_value: 'test' }, // Missing source_value
        { source_value: null, normalized_value: 'test' }, // Null source_value
        { source_value: 'test', normalized_value: null } // Null normalized_value
      ];

      for (const payload of invalidAliasPayloads) {
        const response = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: payload
        });
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          payload,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'REQUIRED_FIELD_VALIDATION', payload }) : null
        };

        logTestResult(`Required field validation - aliases`, result);

        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(400);
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.message).toMatch(/required|missing|empty/i);
      }

      // Test expenses endpoint
      const invalidExpensePayloads = [
        {}, // Empty object
        { date: '2024-01-01' }, // Missing amount
        { amount: 100 }, // Missing date
        { date: '', amount: 100 }, // Empty date
        { date: '2024-01-01', amount: '' }, // Empty amount
        { date: null, amount: 100 }, // Null date
        { date: '2024-01-01', amount: null } // Null amount
      ];

      for (const payload of invalidExpensePayloads) {
        const response = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
          data: payload
        });
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          payload,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'REQUIRED_FIELD_VALIDATION', payload }) : null
        };

        logTestResult(`Required field validation - expenses`, result);

        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(400);
        expect(result.errorDetails).toBeDefined();
      }

      console.log(`✅ Required field validation tested for both endpoints`);
    });

    test('should handle SQL injection attempts', async () => {
      console.log('\n=== Testing SQL injection protection ===');
      
      const sqlInjectionPayloads = [
        "'; DROP TABLE aliases; --",
        "' OR '1'='1",
        "'; DELETE FROM expenses; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO aliases VALUES ('hack', 'hack'); --",
        "1'; UPDATE aliases SET source_value='hacked' WHERE id=1; --"
      ];

      // Test in various contexts
      const testContexts = [
        { endpoint: '/api/aliases', param: 'type' },
        { endpoint: '/api/expenses', param: 'category' },
        { endpoint: '/api/aliases/search', param: 'q' }
      ];

      for (const context of testContexts) {
        for (const payload of sqlInjectionPayloads) {
          const url = `${apiClient.baseURL}${context.endpoint}?${context.param}=${encodeURIComponent(payload)}`;
          const response = await apiClient.request.get(url);
          
          const result = {
            success: response.ok(),
            statusCode: response.status(),
            context: context.endpoint,
            payload: payload.substring(0, 30) + '...',
            errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'SQL_INJECTION_TEST', context, payload }) : null
          };

          logTestResult(`SQL injection test - ${context.endpoint}`, result);

          // Should either succeed with safe handling or fail with appropriate error
          if (!result.success) {
            expect([400, 403, 422]).toContain(result.statusCode); // Bad Request, Forbidden, or Unprocessable Entity
          } else {
            // If it succeeds, verify no malicious data was inserted
            expect(result.data).toBeDefined();
            if (Array.isArray(result.data)) {
              // Check that no suspicious data was returned
              const suspiciousData = result.data.some(item => 
                JSON.stringify(item).toLowerCase().includes('hack')
              );
              expect(suspiciousData).toBe(false);
            }
          }
        }
      }

      console.log(`✅ SQL injection protection tested`);
    });
  });

  test.describe('Concurrent Request Handling and Race Conditions', () => {
    test('should handle concurrent read requests', async () => {
      console.log('\n=== Testing concurrent read requests ===');
      
      // Create some test data first
      const testAlias = testAliases[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });
      expect(createResponse.ok()).toBe(true);

      // Perform concurrent read requests
      const concurrentReads = 10;
      const promises = [];

      for (let i = 0; i < concurrentReads; i++) {
        promises.push(
          apiClient.request.get(`${apiClient.baseURL}/api/aliases`).then(async (response) => ({
            success: response.ok(),
            statusCode: response.status(),
            requestId: i,
            data: response.ok() ? await response.json() : null,
            errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CONCURRENT_READ', requestId: i }) : null
          }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      console.log(`Concurrent reads: ${successCount}/${concurrentReads} successful`);

      // All read requests should succeed
      expect(successCount).toBe(concurrentReads);

      // All successful responses should have consistent data
      const successfulResults = results.filter(r => r.success);
      const firstDataLength = successfulResults[0].data.length;
      
      for (const result of successfulResults) {
        expect(result.data.length).toBe(firstDataLength);
      }

      console.log(`✅ Concurrent read requests handled successfully`);
    });

    test('should handle concurrent write requests', async () => {
      console.log('\n=== Testing concurrent write requests ===');
      
      // Perform concurrent create requests
      const concurrentWrites = 5;
      const promises = [];

      for (let i = 0; i < concurrentWrites; i++) {
        const testData = {
          source_value: `Concurrent Test ${i}`,
          normalized_value: `concurrent-test-${i}`,
          type: 'department',
          is_group: false
        };

        promises.push(
          apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
            data: testData
          }).then(async (response) => ({
            success: response.ok(),
            statusCode: response.status(),
            requestId: i,
            data: response.ok() ? await response.json() : null,
            errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CONCURRENT_WRITE', requestId: i, testData }) : null
          }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      console.log(`Concurrent writes: ${successCount}/${concurrentWrites} successful`);

      // Most or all write requests should succeed
      expect(successCount).toBeGreaterThan(0);

      // Verify all created records are unique
      const successfulResults = results.filter(r => r.success);
      const createdIds = successfulResults.map(r => r.data.id);
      const uniqueIds = [...new Set(createdIds)];
      
      expect(uniqueIds.length).toBe(successfulResults.length);

      console.log(`✅ Concurrent write requests handled - ${successCount} unique records created`);
    });

    test('should handle race conditions in update operations', async () => {
      console.log('\n=== Testing race conditions in updates ===');
      
      // Create a test record
      const testAlias = testAliases[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });
      expect(createResponse.ok()).toBe(true);
      const created = await createResponse.json();

      // Perform concurrent updates on the same record
      const concurrentUpdates = 3;
      const promises = [];

      for (let i = 0; i < concurrentUpdates; i++) {
        const updateData = {
          ...testAlias,
          source_value: `Race Condition Test ${i}`,
          normalized_value: `race-condition-test-${i}`
        };

        promises.push(
          apiClient.request.put(`${apiClient.baseURL}/api/aliases/${created.id}`, {
            data: updateData
          }).then(async (response) => ({
            success: response.ok(),
            statusCode: response.status(),
            requestId: i,
            data: response.ok() ? await response.json() : null,
            errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'RACE_CONDITION_UPDATE', requestId: i, updateData }) : null
          }))
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      console.log(`Concurrent updates: ${successCount}/${concurrentUpdates} successful`);

      // At least one update should succeed
      expect(successCount).toBeGreaterThan(0);

      // Verify final state is consistent
      const finalReadResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${created.id}`);
      expect(finalReadResponse.ok()).toBe(true);
      const finalState = await finalReadResponse.json();
      
      expect(finalState.source_value).toMatch(/Race Condition Test \d+/);
      expect(finalState.id).toBe(created.id);

      console.log(`✅ Race condition in updates handled - final state: ${finalState.source_value}`);
    });

    test('should handle mixed concurrent operations', async () => {
      console.log('\n=== Testing mixed concurrent operations ===');
      
      // Create initial test data
      const initialAlias = testAliases[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: initialAlias
      });
      expect(createResponse.ok()).toBe(true);
      const created = await createResponse.json();

      // Mix of different operations
      const operations = [
        // Read operations
        () => apiClient.request.get(`${apiClient.baseURL}/api/aliases`),
        () => apiClient.request.get(`${apiClient.baseURL}/api/aliases/${created.id}`),
        () => apiClient.request.get(`${apiClient.baseURL}/api/aliases?type=department`),
        
        // Write operations
        () => apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: {
            source_value: `Mixed Op ${Date.now()}`,
            normalized_value: `mixed-op-${Date.now()}`,
            type: 'supplier',
            is_group: false
          }
        }),
        
        // Update operations
        () => apiClient.request.put(`${apiClient.baseURL}/api/aliases/${created.id}`, {
          data: {
            ...initialAlias,
            source_value: `Updated ${Date.now()}`
          }
        })
      ];

      // Execute mixed operations concurrently
      const promises = operations.map((operation, index) => 
        operation().then(async (response) => ({
          success: response.ok(),
          statusCode: response.status(),
          operationIndex: index,
          data: response.ok() ? await response.json() : null,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'MIXED_CONCURRENT', operationIndex: index }) : null
        }))
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;

      console.log(`Mixed concurrent operations: ${successCount}/${operations.length} successful`);

      // Most operations should succeed
      expect(successCount).toBeGreaterThan(operations.length / 2);

      // Verify system is still in consistent state
      const finalReadResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases`);
      expect(finalReadResponse.ok()).toBe(true);
      const finalData = await finalReadResponse.json();
      expect(Array.isArray(finalData)).toBe(true);

      console.log(`✅ Mixed concurrent operations handled - system remains consistent`);
    });
  });

  test.describe('Edge Cases and Boundary Conditions', () => {
    test('should handle extremely large payloads', async () => {
      console.log('\n=== Testing large payload handling ===');
      
      // Create a very large string
      const largeString = 'A'.repeat(10000); // 10KB string
      const largePayload = {
        source_value: largeString,
        normalized_value: 'large-payload-test',
        type: 'department',
        is_group: false
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: largePayload
      });
      
      const result = {
        success: response.ok(),
        statusCode: response.status(),
        payloadSize: JSON.stringify(largePayload).length,
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'LARGE_PAYLOAD_TEST' }) : null
      };

      logTestResult('Large payload test', result);

      // Should either succeed or fail with appropriate error code
      if (!result.success) {
        expect([400, 413, 422]).toContain(result.statusCode); // Bad Request, Payload Too Large, or Unprocessable Entity
        expect(result.errorDetails).toBeDefined();
      } else {
        expect(result.data.source_value).toBe(largeString);
      }

      console.log(`✅ Large payload (${result.payloadSize} bytes) handled appropriately`);
    });

    test('should handle special characters and unicode', async () => {
      console.log('\n=== Testing special characters and unicode ===');
      
      const specialCharacterTests = [
        { name: 'Unicode characters', source: '测试数据', normalized: 'test-unicode' },
        { name: 'Emoji', source: '🏢 Office Department', normalized: 'office-department' },
        { name: 'Special symbols', source: 'Dept@#$%^&*()', normalized: 'dept-special' },
        { name: 'HTML entities', source: '&lt;script&gt;alert()&lt;/script&gt;', normalized: 'html-entities' },
        { name: 'SQL characters', source: "O'Reilly & Co.", normalized: 'oreilly-co' },
        { name: 'Newlines and tabs', source: 'Line1\nLine2\tTabbed', normalized: 'multiline-test' }
      ];

      for (const testCase of specialCharacterTests) {
        const payload = {
          source_value: testCase.source,
          normalized_value: testCase.normalized,
          type: 'supplier',
          is_group: false
        };

        const response = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: payload
        });
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          testCase: testCase.name,
          data: response.ok() ? await response.json() : null,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'SPECIAL_CHARS_TEST', testCase }) : null
        };

        logTestResult(`Special characters test - ${testCase.name}`, result);

        if (result.success) {
          expect(result.data.source_value).toBe(testCase.source);
          expect(result.data.normalized_value).toBe(testCase.normalized);
        } else {
          // If it fails, should be with appropriate error code
          expect([400, 422]).toContain(result.statusCode);
        }
      }

      console.log(`✅ Special characters and unicode handling tested`);
    });

    test('should handle boundary values for numeric fields', async () => {
      console.log('\n=== Testing numeric boundary values ===');
      
      const boundaryTests = [
        { name: 'Zero amount', amount: 0 },
        { name: 'Negative amount', amount: -100.50 },
        { name: 'Very large amount', amount: 999999999.99 },
        { name: 'Very small decimal', amount: 0.01 },
        { name: 'Many decimal places', amount: 123.456789 },
        { name: 'Scientific notation', amount: 1.23e+10 }
      ];

      for (const testCase of boundaryTests) {
        const payload = {
          source: 'Boundary Test',
          date: '2024-01-01',
          amount: testCase.amount,
          currency: 'MDL',
          department: 'Test Department',
          category: 'Test Category'
        };

        const response = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
          data: payload
        });
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          testCase: testCase.name,
          amount: testCase.amount,
          data: response.ok() ? await response.json() : null,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'BOUNDARY_VALUES_TEST', testCase }) : null
        };

        logTestResult(`Boundary values test - ${testCase.name}`, result);

        if (result.success) {
          expect(result.data.amount).toBe(testCase.amount);
        } else {
          // If it fails, should be with appropriate validation error
          expect([400, 422]).toContain(result.statusCode);
        }
      }

      console.log(`✅ Numeric boundary values tested`);
    });

    test('should handle date boundary conditions', async () => {
      console.log('\n=== Testing date boundary conditions ===');
      
      const dateTests = [
        { name: 'Leap year date', date: '2024-02-29' },
        { name: 'Invalid leap year', date: '2023-02-29' },
        { name: 'Year 1900', date: '1900-01-01' },
        { name: 'Year 2100', date: '2100-12-31' },
        { name: 'Invalid month', date: '2024-13-01' },
        { name: 'Invalid day', date: '2024-01-32' },
        { name: 'Invalid format', date: '01/01/2024' },
        { name: 'Empty date', date: '' },
        { name: 'Null date', date: null }
      ];

      for (const testCase of dateTests) {
        const payload = {
          source: 'Date Test',
          date: testCase.date,
          amount: 100.00,
          currency: 'MDL',
          department: 'Test Department'
        };

        const response = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
          data: payload
        });
        
        const result = {
          success: response.ok(),
          statusCode: response.status(),
          testCase: testCase.name,
          date: testCase.date,
          data: response.ok() ? await response.json() : null,
          errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'DATE_BOUNDARY_TEST', testCase }) : null
        };

        logTestResult(`Date boundary test - ${testCase.name}`, result);

        // Valid dates should succeed, invalid ones should fail with 400
        const validDates = ['2024-02-29', '1900-01-01', '2100-12-31'];
        if (validDates.includes(testCase.date)) {
          expect(result.success).toBe(true);
          // The API returns a full ISO timestamp, so we just check that a date was returned
          expect(result.data.date).toBeDefined();
          expect(typeof result.data.date).toBe('string');
        } else {
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(400);
        }
      }

      console.log(`✅ Date boundary conditions tested`);
    });
  });
});