import { test, expect } from '@playwright/test';
import { APITestClient, validateResponseStructure, logTestResult } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, seedTestData, validateTestEnvironment } from './utils/test-helpers.js';
import { testAliases, testExpenses } from './fixtures/test-data.js';

test.describe('API Performance and Load Testing Suite', () => {
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

  test.describe('Performance Benchmarks for API Response Times', () => {
    test('should benchmark aliases endpoint response times', async () => {
      console.log('\n=== Benchmarking aliases endpoint response times ===');
      
      // Create test data for more realistic performance testing
      const testDataCount = 50;
      console.log(`Creating ${testDataCount} test aliases for performance testing...`);
      
      for (let i = 0; i < testDataCount; i++) {
        const testAlias = {
          source_value: `Performance Test Alias ${i}`,
          normalized_value: `performance-test-alias-${i}`,
          type: i % 2 === 0 ? 'department' : 'supplier',
          is_group: i % 5 === 0
        };
        
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: testAlias
        });
        expect(createResponse.ok()).toBe(true);
      }

      // Benchmark different endpoint variations
      const benchmarkTests = [
        { name: 'Get all aliases', url: '/api/aliases' },
        { name: 'Get department aliases', url: '/api/aliases?type=department' },
        { name: 'Get supplier aliases', url: '/api/aliases?type=supplier' },
        { name: 'Get aliases with limit', url: '/api/aliases?limit=10' },
        { name: 'Get aliases with pagination', url: '/api/aliases?limit=10&offset=5' }
      ];

      const benchmarkResults = [];

      for (const benchmarkTest of benchmarkTests) {
        const iterations = 10;
        const responseTimes = [];

        console.log(`\nBenchmarking: ${benchmarkTest.name} (${iterations} iterations)`);

        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          const response = await apiClient.request.get(`${apiClient.baseURL}${benchmarkTest.url}`);
          const responseTime = Date.now() - startTime;
          
          expect(response.ok()).toBe(true);
          responseTimes.push(responseTime);
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minResponseTime = Math.min(...responseTimes);
        const maxResponseTime = Math.max(...responseTimes);
        const medianResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)];

        const result = {
          test: benchmarkTest.name,
          iterations,
          avgResponseTime: Math.round(avgResponseTime),
          minResponseTime,
          maxResponseTime,
          medianResponseTime,
          responseTimes
        };

        benchmarkResults.push(result);

        console.log(`  Average: ${result.avgResponseTime}ms`);
        console.log(`  Min: ${result.minResponseTime}ms`);
        console.log(`  Max: ${result.maxResponseTime}ms`);
        console.log(`  Median: ${result.medianResponseTime}ms`);

        // Performance assertions
        expect(result.avgResponseTime).toBeLessThan(1000); // Average should be under 1 second
        expect(result.maxResponseTime).toBeLessThan(2000); // Max should be under 2 seconds
      }

      console.log(`\n✅ Aliases endpoint performance benchmarked - ${benchmarkResults.length} scenarios tested`);
    });

    test('should benchmark expenses endpoint response times', async () => {
      console.log('\n=== Benchmarking expenses endpoint response times ===');
      
      // Create test data for more realistic performance testing
      const testDataCount = 100;
      console.log(`Creating ${testDataCount} test expenses for performance testing...`);
      
      for (let i = 0; i < testDataCount; i++) {
        const testExpense = {
          source: `Performance Test Source ${i}`,
          date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
          amount: Math.round((Math.random() * 1000 + 10) * 100) / 100,
          currency: 'MDL',
          department: `Department ${i % 5}`,
          supplier: `Supplier ${i % 10}`,
          category: `Category ${i % 3}`,
          description: `Performance test expense ${i}`
        };
        
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
          data: testExpense
        });
        expect(createResponse.ok()).toBe(true);
      }

      // Benchmark different endpoint variations
      const benchmarkTests = [
        { name: 'Get all expenses', url: '/api/expenses' },
        { name: 'Get expenses with limit', url: '/api/expenses?limit=20' },
        { name: 'Get expenses with pagination', url: '/api/expenses?limit=20&offset=10' },
        { name: 'Get expenses by date range', url: '/api/expenses?date_from=2024-01-01&date_to=2024-01-31' },
        { name: 'Get expenses by amount range', url: '/api/expenses?amount_min=100&amount_max=500' }
      ];

      const benchmarkResults = [];

      for (const benchmarkTest of benchmarkTests) {
        const iterations = 10;
        const responseTimes = [];

        console.log(`\nBenchmarking: ${benchmarkTest.name} (${iterations} iterations)`);

        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          const response = await apiClient.request.get(`${apiClient.baseURL}${benchmarkTest.url}`);
          const responseTime = Date.now() - startTime;
          
          expect(response.ok()).toBe(true);
          responseTimes.push(responseTime);
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minResponseTime = Math.min(...responseTimes);
        const maxResponseTime = Math.max(...responseTimes);
        const medianResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)];

        const result = {
          test: benchmarkTest.name,
          iterations,
          avgResponseTime: Math.round(avgResponseTime),
          minResponseTime,
          maxResponseTime,
          medianResponseTime,
          responseTimes
        };

        benchmarkResults.push(result);

        console.log(`  Average: ${result.avgResponseTime}ms`);
        console.log(`  Min: ${result.minResponseTime}ms`);
        console.log(`  Max: ${result.maxResponseTime}ms`);
        console.log(`  Median: ${result.medianResponseTime}ms`);

        // Performance assertions
        expect(result.avgResponseTime).toBeLessThan(1500); // Average should be under 1.5 seconds
        expect(result.maxResponseTime).toBeLessThan(3000); // Max should be under 3 seconds
      }

      console.log(`\n✅ Expenses endpoint performance benchmarked - ${benchmarkResults.length} scenarios tested`);
    });

    test('should benchmark CRUD operation performance', async () => {
      console.log('\n=== Benchmarking CRUD operation performance ===');
      
      const iterations = 20;
      const crudResults = {
        create: [],
        read: [],
        update: [],
        delete: []
      };

      console.log(`Testing CRUD performance with ${iterations} iterations...`);

      for (let i = 0; i < iterations; i++) {
        const testAlias = {
          source_value: `CRUD Performance Test ${i}`,
          normalized_value: `crud-performance-test-${i}`,
          type: 'department',
          is_group: false
        };

        // CREATE
        let startTime = Date.now();
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: testAlias
        });
        const createTime = Date.now() - startTime;
        expect(createResponse.ok()).toBe(true);
        const created = await createResponse.json();
        crudResults.create.push(createTime);

        // READ
        startTime = Date.now();
        const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${created.id}`);
        const readTime = Date.now() - startTime;
        expect(readResponse.ok()).toBe(true);
        crudResults.read.push(readTime);

        // UPDATE
        const updateData = { ...testAlias, source_value: `Updated ${testAlias.source_value}` };
        startTime = Date.now();
        const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/aliases/${created.id}`, {
          data: updateData
        });
        const updateTime = Date.now() - startTime;
        expect(updateResponse.ok()).toBe(true);
        crudResults.update.push(updateTime);

        // DELETE
        startTime = Date.now();
        const deleteResponse = await apiClient.request.delete(`${apiClient.baseURL}/api/aliases/${created.id}`);
        const deleteTime = Date.now() - startTime;
        expect(deleteResponse.ok()).toBe(true);
        crudResults.delete.push(deleteTime);
      }

      // Calculate statistics for each operation
      for (const [operation, times] of Object.entries(crudResults)) {
        const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const medianTime = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

        console.log(`\n${operation.toUpperCase()} Performance:`);
        console.log(`  Average: ${avgTime}ms`);
        console.log(`  Min: ${minTime}ms`);
        console.log(`  Max: ${maxTime}ms`);
        console.log(`  Median: ${medianTime}ms`);

        // Performance assertions
        expect(avgTime).toBeLessThan(500); // Average should be under 500ms
        expect(maxTime).toBeLessThan(1000); // Max should be under 1 second
      }

      console.log(`\n✅ CRUD operations performance benchmarked - ${iterations} iterations per operation`);
    });
  });

  test.describe('Concurrent Request Handling Capacity', () => {
    test('should test concurrent read request capacity', async () => {
      console.log('\n=== Testing concurrent read request capacity ===');
      
      // Create test data
      const testDataCount = 20;
      for (let i = 0; i < testDataCount; i++) {
        const testAlias = {
          source_value: `Concurrent Test Alias ${i}`,
          normalized_value: `concurrent-test-alias-${i}`,
          type: i % 2 === 0 ? 'department' : 'supplier',
          is_group: false
        };
        
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: testAlias
        });
        expect(createResponse.ok()).toBe(true);
      }

      // Test different levels of concurrency
      const concurrencyLevels = [5, 10, 20, 50];

      for (const concurrency of concurrencyLevels) {
        console.log(`\nTesting ${concurrency} concurrent read requests...`);
        
        const startTime = Date.now();
        const promises = [];

        for (let i = 0; i < concurrency; i++) {
          promises.push(
            apiClient.request.get(`${apiClient.baseURL}/api/aliases`).then(async (response) => ({
              success: response.ok(),
              statusCode: response.status(),
              requestId: i,
              responseTime: Date.now() - startTime,
              data: response.ok() ? await response.json() : null,
              errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CONCURRENT_READ_CAPACITY', requestId: i, concurrency }) : null
            }))
          );
        }

        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

        console.log(`  Success Rate: ${successCount}/${concurrency} (${Math.round(successCount/concurrency*100)}%)`);
        console.log(`  Total Time: ${totalTime}ms`);
        console.log(`  Average Response Time: ${Math.round(avgResponseTime)}ms`);
        console.log(`  Requests per Second: ${Math.round(concurrency / (totalTime / 1000))}`);

        // Performance assertions
        expect(successCount).toBeGreaterThan(concurrency * 0.9); // At least 90% success rate
        expect(avgResponseTime).toBeLessThan(2000); // Average response time under 2 seconds
        
        // Log any failures for analysis
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          console.log(`  Failures: ${failures.map(f => f.statusCode).join(', ')}`);
        }
      }

      console.log(`\n✅ Concurrent read capacity tested across ${concurrencyLevels.length} concurrency levels`);
    });

    test('should test concurrent write request capacity', async () => {
      console.log('\n=== Testing concurrent write request capacity ===');
      
      // Test different levels of concurrency for write operations
      const concurrencyLevels = [3, 5, 10, 15];

      for (const concurrency of concurrencyLevels) {
        console.log(`\nTesting ${concurrency} concurrent write requests...`);
        
        const startTime = Date.now();
        const promises = [];

        for (let i = 0; i < concurrency; i++) {
          const testData = {
            source_value: `Concurrent Write Test ${concurrency}-${i}`,
            normalized_value: `concurrent-write-test-${concurrency}-${i}`,
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
              responseTime: Date.now() - startTime,
              data: response.ok() ? await response.json() : null,
              errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CONCURRENT_WRITE_CAPACITY', requestId: i, concurrency, testData }) : null
            }))
          );
        }

        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

        console.log(`  Success Rate: ${successCount}/${concurrency} (${Math.round(successCount/concurrency*100)}%)`);
        console.log(`  Total Time: ${totalTime}ms`);
        console.log(`  Average Response Time: ${Math.round(avgResponseTime)}ms`);
        console.log(`  Writes per Second: ${Math.round(concurrency / (totalTime / 1000))}`);

        // Performance assertions
        expect(successCount).toBeGreaterThan(concurrency * 0.8); // At least 80% success rate for writes
        expect(avgResponseTime).toBeLessThan(3000); // Average response time under 3 seconds
        
        // Verify all successful writes created unique records
        const successfulResults = results.filter(r => r.success);
        const createdIds = successfulResults.map(r => r.data.id);
        const uniqueIds = [...new Set(createdIds)];
        expect(uniqueIds.length).toBe(successfulResults.length);

        // Log any failures for analysis
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          console.log(`  Failures: ${failures.map(f => f.statusCode).join(', ')}`);
        }
      }

      console.log(`\n✅ Concurrent write capacity tested across ${concurrencyLevels.length} concurrency levels`);
    });

    test('should test mixed operation concurrency', async () => {
      console.log('\n=== Testing mixed operation concurrency ===');
      
      // Create initial test data
      const initialDataCount = 10;
      const createdIds = [];
      
      for (let i = 0; i < initialDataCount; i++) {
        const testAlias = {
          source_value: `Mixed Concurrency Base ${i}`,
          normalized_value: `mixed-concurrency-base-${i}`,
          type: 'department',
          is_group: false
        };
        
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: testAlias
        });
        expect(createResponse.ok()).toBe(true);
        const created = await createResponse.json();
        createdIds.push(created.id);
      }

      // Test mixed operations concurrently
      const totalOperations = 30;
      const operationTypes = ['read', 'create', 'update', 'delete'];
      const promises = [];

      console.log(`\nExecuting ${totalOperations} mixed concurrent operations...`);
      const startTime = Date.now();

      for (let i = 0; i < totalOperations; i++) {
        const operationType = operationTypes[i % operationTypes.length];
        
        let operationPromise;
        
        switch (operationType) {
          case 'read':
            operationPromise = apiClient.request.get(`${apiClient.baseURL}/api/aliases`);
            break;
            
          case 'create':
            operationPromise = apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
              data: {
                source_value: `Mixed Create ${i}`,
                normalized_value: `mixed-create-${i}`,
                type: 'supplier',
                is_group: false
              }
            });
            break;
            
          case 'update':
            const updateId = createdIds[i % createdIds.length];
            operationPromise = apiClient.request.put(`${apiClient.baseURL}/api/aliases/${updateId}`, {
              data: {
                source_value: `Mixed Update ${i}`,
                normalized_value: `mixed-update-${i}`,
                type: 'department',
                is_group: false
              }
            });
            break;
            
          case 'delete':
            // Only delete if we have enough IDs and this is not too early
            if (createdIds.length > 5 && i > 10) {
              const deleteId = createdIds.pop(); // Remove from array so we don't delete twice
              operationPromise = apiClient.request.delete(`${apiClient.baseURL}/api/aliases/${deleteId}`);
            } else {
              // Fallback to read operation
              operationPromise = apiClient.request.get(`${apiClient.baseURL}/api/aliases`);
            }
            break;
        }

        promises.push(
          operationPromise.then(async (response) => ({
            success: response.ok(),
            statusCode: response.status(),
            operationType,
            requestId: i,
            responseTime: Date.now() - startTime,
            data: response.ok() ? await response.json() : null,
            errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'MIXED_CONCURRENCY', operationType, requestId: i }) : null
          }))
        );
      }

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      // Analyze results by operation type
      const operationStats = {};
      for (const operationType of operationTypes) {
        const typeResults = results.filter(r => r.operationType === operationType);
        operationStats[operationType] = {
          total: typeResults.length,
          successful: typeResults.filter(r => r.success).length,
          avgResponseTime: typeResults.length > 0 ? Math.round(typeResults.reduce((sum, r) => sum + r.responseTime, 0) / typeResults.length) : 0
        };
      }

      console.log(`\nMixed Concurrency Results:`);
      console.log(`  Overall Success Rate: ${successCount}/${totalOperations} (${Math.round(successCount/totalOperations*100)}%)`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Average Response Time: ${Math.round(avgResponseTime)}ms`);
      console.log(`  Operations per Second: ${Math.round(totalOperations / (totalTime / 1000))}`);

      console.log(`\nBy Operation Type:`);
      for (const [type, stats] of Object.entries(operationStats)) {
        console.log(`  ${type.toUpperCase()}: ${stats.successful}/${stats.total} success, ${stats.avgResponseTime}ms avg`);
      }

      // Performance assertions
      expect(successCount).toBeGreaterThan(totalOperations * 0.8); // At least 80% overall success rate
      expect(avgResponseTime).toBeLessThan(3000); // Average response time under 3 seconds

      console.log(`\n✅ Mixed operation concurrency tested - ${totalOperations} operations completed`);
    });
  });

  test.describe('Memory Usage and Connection Pool Efficiency', () => {
    test('should monitor memory usage during bulk operations', async () => {
      console.log('\n=== Monitoring memory usage during bulk operations ===');
      
      // Function to get memory usage (simplified for testing environment)
      const getMemoryUsage = () => {
        if (typeof process !== 'undefined' && process.memoryUsage) {
          return process.memoryUsage();
        }
        return { heapUsed: 0, heapTotal: 0, external: 0 };
      };

      const initialMemory = getMemoryUsage();
      console.log(`Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);

      // Perform bulk create operations
      const bulkOperationCount = 100;
      const createdIds = [];

      console.log(`\nPerforming ${bulkOperationCount} bulk create operations...`);
      
      for (let i = 0; i < bulkOperationCount; i++) {
        const testAlias = {
          source_value: `Bulk Memory Test ${i}`,
          normalized_value: `bulk-memory-test-${i}`,
          type: i % 2 === 0 ? 'department' : 'supplier',
          is_group: i % 10 === 0
        };
        
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: testAlias
        });
        
        expect(createResponse.ok()).toBe(true);
        const created = await createResponse.json();
        createdIds.push(created.id);

        // Check memory usage every 25 operations
        if (i % 25 === 0) {
          const currentMemory = getMemoryUsage();
          console.log(`  After ${i + 1} operations: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
        }
      }

      const afterCreateMemory = getMemoryUsage();
      console.log(`After bulk creates: ${Math.round(afterCreateMemory.heapUsed / 1024 / 1024)}MB`);

      // Perform bulk read operations
      console.log(`\nPerforming ${bulkOperationCount} bulk read operations...`);
      
      for (let i = 0; i < bulkOperationCount; i++) {
        const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases`);
        expect(readResponse.ok()).toBe(true);

        if (i % 25 === 0) {
          const currentMemory = getMemoryUsage();
          console.log(`  After ${i + 1} reads: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
        }
      }

      const afterReadMemory = getMemoryUsage();
      console.log(`After bulk reads: ${Math.round(afterReadMemory.heapUsed / 1024 / 1024)}MB`);

      // Cleanup - delete all created records
      console.log(`\nCleaning up ${createdIds.length} created records...`);
      
      for (const id of createdIds) {
        const deleteResponse = await apiClient.request.delete(`${apiClient.baseURL}/api/aliases/${id}`);
        expect(deleteResponse.ok()).toBe(true);
      }

      const finalMemory = getMemoryUsage();
      console.log(`After cleanup: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);

      // Memory usage assertions (these are approximate due to garbage collection)
      const memoryIncrease = afterCreateMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseAfterReads = afterReadMemory.heapUsed - afterCreateMemory.heapUsed;
      
      console.log(`\nMemory Analysis:`);
      console.log(`  Memory increase after creates: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      console.log(`  Memory increase after reads: ${Math.round(memoryIncreaseAfterReads / 1024 / 1024)}MB`);
      console.log(`  Memory per create operation: ${Math.round(memoryIncrease / bulkOperationCount / 1024)}KB`);

      // Basic memory usage assertions
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      expect(memoryIncreaseAfterReads).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase for reads

      console.log(`\n✅ Memory usage monitored during ${bulkOperationCount * 2} bulk operations`);
    });

    test('should test connection pool efficiency', async () => {
      console.log('\n=== Testing connection pool efficiency ===');
      
      // Test connection pool by making many concurrent requests
      const connectionPoolTests = [
        { name: 'Light load', concurrency: 5, iterations: 3 },
        { name: 'Medium load', concurrency: 10, iterations: 5 },
        { name: 'Heavy load', concurrency: 20, iterations: 3 }
      ];

      for (const poolTest of connectionPoolTests) {
        console.log(`\nTesting connection pool - ${poolTest.name}:`);
        console.log(`  ${poolTest.concurrency} concurrent requests × ${poolTest.iterations} iterations`);

        const allResults = [];

        for (let iteration = 0; iteration < poolTest.iterations; iteration++) {
          console.log(`  Iteration ${iteration + 1}/${poolTest.iterations}...`);
          
          const startTime = Date.now();
          const promises = [];

          for (let i = 0; i < poolTest.concurrency; i++) {
            promises.push(
              apiClient.request.get(`${apiClient.baseURL}/api/aliases`).then(async (response) => ({
                success: response.ok(),
                statusCode: response.status(),
                responseTime: Date.now() - startTime,
                iteration,
                requestId: i,
                errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CONNECTION_POOL_TEST', iteration, requestId: i }) : null
              }))
            );
          }

          const iterationResults = await Promise.all(promises);
          allResults.push(...iterationResults);
          
          const iterationTime = Date.now() - startTime;
          const successCount = iterationResults.filter(r => r.success).length;
          
          console.log(`    Completed in ${iterationTime}ms, ${successCount}/${poolTest.concurrency} successful`);
          
          // Brief pause between iterations to allow connection pool to stabilize
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Analyze overall results
        const totalRequests = allResults.length;
        const totalSuccessful = allResults.filter(r => r.success).length;
        const avgResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length;
        const maxResponseTime = Math.max(...allResults.map(r => r.responseTime));
        const minResponseTime = Math.min(...allResults.map(r => r.responseTime));

        console.log(`\n  ${poolTest.name} Results:`);
        console.log(`    Total Requests: ${totalRequests}`);
        console.log(`    Success Rate: ${totalSuccessful}/${totalRequests} (${Math.round(totalSuccessful/totalRequests*100)}%)`);
        console.log(`    Average Response Time: ${Math.round(avgResponseTime)}ms`);
        console.log(`    Min Response Time: ${minResponseTime}ms`);
        console.log(`    Max Response Time: ${maxResponseTime}ms`);

        // Connection pool efficiency assertions
        expect(totalSuccessful).toBeGreaterThan(totalRequests * 0.95); // At least 95% success rate
        expect(avgResponseTime).toBeLessThan(2000); // Average response time under 2 seconds
        expect(maxResponseTime).toBeLessThan(5000); // Max response time under 5 seconds

        // Check for connection pool exhaustion indicators
        const connectionErrors = allResults.filter(r => 
          !r.success && (
            r.statusCode === 503 || // Service Unavailable
            r.statusCode === 500 || // Internal Server Error (might indicate pool exhaustion)
            (r.errorDetails && r.errorDetails.message && r.errorDetails.message.toLowerCase().includes('connection'))
          )
        );

        if (connectionErrors.length > 0) {
          console.log(`    Connection-related errors: ${connectionErrors.length}`);
        }

        expect(connectionErrors.length).toBeLessThan(totalRequests * 0.1); // Less than 10% connection errors
      }

      console.log(`\n✅ Connection pool efficiency tested across ${connectionPoolTests.length} load scenarios`);
    });

    test('should test sustained load performance', async () => {
      console.log('\n=== Testing sustained load performance ===');
      
      // Test sustained load over a longer period
      const sustainedLoadDuration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const expectedRequests = Math.floor(sustainedLoadDuration / requestInterval);

      console.log(`Running sustained load test for ${sustainedLoadDuration/1000} seconds...`);
      console.log(`Expected ~${expectedRequests} requests at ${requestInterval}ms intervals`);

      const results = [];
      const startTime = Date.now();
      let requestCount = 0;

      const sustainedLoadPromise = new Promise((resolve) => {
        const intervalId = setInterval(async () => {
          const currentTime = Date.now();
          
          if (currentTime - startTime >= sustainedLoadDuration) {
            clearInterval(intervalId);
            resolve();
            return;
          }

          requestCount++;
          const requestStartTime = Date.now();
          
          try {
            const response = await apiClient.request.get(`${apiClient.baseURL}/api/aliases`);
            const responseTime = Date.now() - requestStartTime;
            
            results.push({
              success: response.ok(),
              statusCode: response.status(),
              responseTime,
              requestId: requestCount,
              timestamp: currentTime - startTime,
              errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'SUSTAINED_LOAD_TEST', requestId: requestCount }) : null
            });
          } catch (error) {
            results.push({
              success: false,
              statusCode: 0,
              responseTime: Date.now() - requestStartTime,
              requestId: requestCount,
              timestamp: currentTime - startTime,
              errorDetails: {
                message: error.message,
                stack: error.stack
              }
            });
          }

          // Log progress every 5 seconds
          if (requestCount % 50 === 0) {
            const recentResults = results.slice(-50);
            const recentSuccessRate = recentResults.filter(r => r.success).length / recentResults.length;
            const recentAvgResponseTime = recentResults.reduce((sum, r) => sum + r.responseTime, 0) / recentResults.length;
            
            console.log(`  ${Math.round((currentTime - startTime)/1000)}s: ${requestCount} requests, ${Math.round(recentSuccessRate*100)}% success, ${Math.round(recentAvgResponseTime)}ms avg`);
          }
        }, requestInterval);
      });

      await sustainedLoadPromise;

      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const minResponseTime = Math.min(...results.map(r => r.responseTime));

      console.log(`\nSustained Load Test Results:`);
      console.log(`  Duration: ${Math.round(totalTime/1000)}s`);
      console.log(`  Total Requests: ${results.length}`);
      console.log(`  Success Rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
      console.log(`  Requests per Second: ${Math.round(results.length / (totalTime/1000))}`);
      console.log(`  Average Response Time: ${Math.round(avgResponseTime)}ms`);
      console.log(`  Min Response Time: ${minResponseTime}ms`);
      console.log(`  Max Response Time: ${maxResponseTime}ms`);

      // Analyze performance degradation over time
      const firstQuarter = results.slice(0, Math.floor(results.length / 4));
      const lastQuarter = results.slice(-Math.floor(results.length / 4));
      
      const firstQuarterAvg = firstQuarter.reduce((sum, r) => sum + r.responseTime, 0) / firstQuarter.length;
      const lastQuarterAvg = lastQuarter.reduce((sum, r) => sum + r.responseTime, 0) / lastQuarter.length;
      const performanceDegradation = ((lastQuarterAvg - firstQuarterAvg) / firstQuarterAvg) * 100;

      console.log(`\nPerformance Analysis:`);
      console.log(`  First quarter avg response time: ${Math.round(firstQuarterAvg)}ms`);
      console.log(`  Last quarter avg response time: ${Math.round(lastQuarterAvg)}ms`);
      console.log(`  Performance change: ${performanceDegradation > 0 ? '+' : ''}${Math.round(performanceDegradation)}%`);

      // Sustained load assertions
      expect(successCount).toBeGreaterThan(results.length * 0.9); // At least 90% success rate
      expect(avgResponseTime).toBeLessThan(1500); // Average response time under 1.5 seconds
      expect(Math.abs(performanceDegradation)).toBeLessThan(50); // Performance shouldn't degrade more than 50%

      console.log(`\n✅ Sustained load test completed - ${results.length} requests over ${Math.round(totalTime/1000)} seconds`);
    });
  });
});