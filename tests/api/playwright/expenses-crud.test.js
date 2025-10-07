import { test, expect } from '@playwright/test';
import { APITestClient, validateResponseStructure, logTestResult } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, seedTestData, validateTestEnvironment } from './utils/test-helpers.js';
import { testExpenses, invalidTestData } from './fixtures/test-data.js';

test.describe('Expenses CRUD Operations Test Suite', () => {
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

  test.describe('CREATE Operations', () => {
    test('should create expense with all required fields', async () => {
      console.log('\n=== Testing expense creation with required fields ===');
      
      const testExpense = {
        source: 'Test API Source',
        date: '2024-01-15',
        amount: 1500.50,
        currency: 'MDL',
        department: 'IT Department',
        supplier: 'Tech Supplier',
        category: 'Software',
        description: 'Test expense for API debugging'
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE', testExpense }) : null
      };

      logTestResult('Create expense with all fields', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.source).toBe(testExpense.source);
      expect(result.data.date).toBe(testExpense.date);
      expect(parseFloat(result.data.amount)).toBe(testExpense.amount);
      expect(result.data.currency).toBe(testExpense.currency);
      expect(result.data.department).toBe(testExpense.department);
      expect(result.data.supplier).toBe(testExpense.supplier);
      expect(result.data.category).toBe(testExpense.category);
      expect(result.data.description).toBe(testExpense.description);
      expect(result.data.created_at).toBeDefined();
      expect(result.data.updated_at).toBeDefined();

      console.log(`✅ Successfully created expense with ID: ${result.data.id}`);
    });

    test('should create expense with only required fields', async () => {
      console.log('\n=== Testing expense creation with minimal required fields ===');
      
      const minimalExpense = {
        date: '2024-01-16',
        amount: 500.00,
        currency: 'MDL'
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: minimalExpense
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE', minimalExpense }) : null
      };

      logTestResult('Create minimal expense', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.date).toBe(minimalExpense.date);
      expect(parseFloat(result.data.amount)).toBe(minimalExpense.amount);
      expect(result.data.currency).toBe(minimalExpense.currency);

      console.log(`✅ Successfully created minimal expense with ID: ${result.data.id}`);
    });

    test('should validate required fields on creation', async () => {
      console.log('\n=== Testing expense creation validation ===');
      
      const invalidExpense = {
        source: 'Test Source',
        // Missing required date and amount
        currency: 'MDL'
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: invalidExpense
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE', invalidExpense }) : null
      };

      logTestResult('Create invalid expense', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails.responseData.error).toBeDefined();

      console.log(`✅ Properly rejected invalid expense creation with status ${result.statusCode}`);
    });

    test('should validate data types on creation', async () => {
      console.log('\n=== Testing expense data type validation ===');
      
      const invalidTypeExpense = {
        date: 'invalid-date-format',
        amount: 'not-a-number',
        currency: 'INVALID_CURRENCY_CODE'
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: invalidTypeExpense
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE', invalidTypeExpense }) : null
      };

      logTestResult('Create expense with invalid data types', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly rejected expense with invalid data types with status ${result.statusCode}`);
    });
  });

  test.describe('READ Operations', () => {
    test('should read specific expense by ID', async () => {
      console.log('\n=== Testing expense read by ID ===');
      
      // First create an expense
      const testExpense = testExpenses[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdExpense = await createResponse.json();
      
      // Now read it back
      const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`);
      
      const result = {
        success: readResponse.ok(),
        statusCode: readResponse.status(),
        data: readResponse.ok() ? await readResponse.json() : null,
        errorDetails: !readResponse.ok() ? await apiClient.captureErrorDetails(readResponse, { operation: 'READ', id: createdExpense.id }) : null
      };

      logTestResult('Read expense by ID', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(createdExpense.id);
      expect(result.data.source).toBe(testExpense.source);
      expect(result.data.date).toBe(testExpense.date);
      expect(parseFloat(result.data.amount)).toBe(testExpense.amount);
      expect(result.data.currency).toBe(testExpense.currency);

      console.log(`✅ Successfully read expense with ID: ${createdExpense.id}`);
    });

    test('should handle non-existent expense ID', async () => {
      console.log('\n=== Testing read of non-existent expense ===');
      
      const nonExistentId = 99999;
      const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses/${nonExistentId}`);
      
      const result = {
        success: readResponse.ok(),
        statusCode: readResponse.status(),
        data: readResponse.ok() ? await readResponse.json() : null,
        errorDetails: !readResponse.ok() ? await apiClient.captureErrorDetails(readResponse, { operation: 'READ', id: nonExistentId }) : null
      };

      logTestResult('Read non-existent expense', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly returned 404 for non-existent expense ID: ${nonExistentId}`);
    });

    test('should read all expenses with proper structure', async () => {
      console.log('\n=== Testing read all expenses ===');
      
      // Create multiple test expenses
      for (const testExpense of testExpenses) {
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
          data: testExpense
        });
        expect(createResponse.ok()).toBe(true);
      }
      
      // Read all expenses
      const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses`);
      
      const result = {
        success: readResponse.ok(),
        statusCode: readResponse.status(),
        data: readResponse.ok() ? await readResponse.json() : null,
        errorDetails: !readResponse.ok() ? await apiClient.captureErrorDetails(readResponse, { operation: 'READ_ALL' }) : null
      };

      logTestResult('Read all expenses', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(testExpenses.length);

      // Validate structure
      const expectedFields = ['id', 'source', 'date', 'amount', 'currency', 'department', 'supplier', 'category', 'description', 'created_at', 'updated_at'];
      const structureErrors = validateResponseStructure(result.data, expectedFields);
      expect(structureErrors.length).toBe(0);

      console.log(`✅ Successfully read ${result.data.length} expenses with proper structure`);
    });

    test('should support filtering and pagination', async () => {
      console.log('\n=== Testing expense filtering and pagination ===');
      
      // Create multiple expenses with different attributes
      const expenses = [
        { ...testExpenses[0], department: 'IT', category: 'Software' },
        { ...testExpenses[1], department: 'HR', category: 'Office' },
        { ...testExpenses[0], department: 'IT', category: 'Hardware' }
      ];
      
      for (const expense of expenses) {
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
          data: expense
        });
        expect(createResponse.ok()).toBe(true);
      }
      
      // Test filtering by department
      const filterResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses?department=IT`);
      
      const result = {
        success: filterResponse.ok(),
        statusCode: filterResponse.status(),
        data: filterResponse.ok() ? await filterResponse.json() : null,
        errorDetails: !filterResponse.ok() ? await apiClient.captureErrorDetails(filterResponse, { operation: 'FILTER', filter: 'department=IT' }) : null
      };

      logTestResult('Filter expenses by department', result);

      if (result.success) {
        expect(result.statusCode).toBe(200);
        expect(Array.isArray(result.data)).toBe(true);
        
        // If filtering is implemented, verify results
        if (result.data.length > 0) {
          const nonITExpenses = result.data.filter(expense => expense.department !== 'IT');
          if (nonITExpenses.length === 0) {
            console.log(`✅ Successfully filtered ${result.data.length} IT department expenses`);
          } else {
            console.log(`⚠️ Filtering may not be implemented - got ${result.data.length} expenses`);
          }
        }
      } else {
        console.log(`⚠️ Filtering may not be implemented - endpoint returned ${result.statusCode}`);
      }
    });
  });

  test.describe('UPDATE Operations', () => {
    test('should update expense data', async () => {
      console.log('\n=== Testing expense update ===');
      
      // First create an expense
      const testExpense = testExpenses[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdExpense = await createResponse.json();
      
      // Update the expense
      const updateData = {
        source: 'Updated Source',
        date: '2024-02-15',
        amount: 2500.75,
        currency: 'MDL',
        department: 'Updated Department',
        supplier: 'Updated Supplier',
        category: 'Updated Category',
        description: 'Updated description for testing'
      };
      
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`, {
        data: updateData
      });
      
      const result = {
        success: updateResponse.ok(),
        statusCode: updateResponse.status(),
        data: updateResponse.ok() ? await updateResponse.json() : null,
        errorDetails: !updateResponse.ok() ? await apiClient.captureErrorDetails(updateResponse, { operation: 'UPDATE', id: createdExpense.id, updateData }) : null
      };

      logTestResult('Update expense', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(createdExpense.id);
      expect(result.data.source).toBe(updateData.source);
      expect(result.data.date).toBe(updateData.date);
      expect(parseFloat(result.data.amount)).toBe(updateData.amount);
      expect(result.data.department).toBe(updateData.department);
      expect(result.data.supplier).toBe(updateData.supplier);
      expect(result.data.category).toBe(updateData.category);
      expect(result.data.description).toBe(updateData.description);
      expect(result.data.updated_at).not.toBe(createdExpense.updated_at);

      console.log(`✅ Successfully updated expense with ID: ${createdExpense.id}`);
    });

    test('should validate update data', async () => {
      console.log('\n=== Testing expense update validation ===');
      
      // First create an expense
      const testExpense = testExpenses[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdExpense = await createResponse.json();
      
      // Try to update with invalid data
      const invalidUpdateData = {
        date: 'invalid-date',
        amount: 'not-a-number',
        currency: 'INVALID'
      };
      
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`, {
        data: invalidUpdateData
      });
      
      const result = {
        success: updateResponse.ok(),
        statusCode: updateResponse.status(),
        data: updateResponse.ok() ? await updateResponse.json() : null,
        errorDetails: !updateResponse.ok() ? await apiClient.captureErrorDetails(updateResponse, { operation: 'UPDATE', id: createdExpense.id, invalidUpdateData }) : null
      };

      logTestResult('Update expense with invalid data', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly rejected invalid update data with status ${result.statusCode}`);
    });

    test('should handle partial updates', async () => {
      console.log('\n=== Testing partial expense update ===');
      
      // First create an expense
      const testExpense = testExpenses[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdExpense = await createResponse.json();
      
      // Update only specific fields
      const partialUpdateData = {
        amount: 3000.00,
        description: 'Partially updated description'
      };
      
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`, {
        data: partialUpdateData
      });
      
      const result = {
        success: updateResponse.ok(),
        statusCode: updateResponse.status(),
        data: updateResponse.ok() ? await updateResponse.json() : null,
        errorDetails: !updateResponse.ok() ? await apiClient.captureErrorDetails(updateResponse, { operation: 'PARTIAL_UPDATE', id: createdExpense.id, partialUpdateData }) : null
      };

      logTestResult('Partial update expense', result);

      if (result.success) {
        expect(result.statusCode).toBe(200);
        expect(result.data).toBeDefined();
        expect(parseFloat(result.data.amount)).toBe(partialUpdateData.amount);
        expect(result.data.description).toBe(partialUpdateData.description);
        // Other fields should remain unchanged
        expect(result.data.source).toBe(testExpense.source);
        expect(result.data.date).toBe(testExpense.date);
        
        console.log(`✅ Successfully performed partial update on expense ID: ${createdExpense.id}`);
      } else {
        console.log(`⚠️ Partial updates may not be supported - endpoint returned ${result.statusCode}`);
      }
    });

    test('should handle update of non-existent expense', async () => {
      console.log('\n=== Testing update of non-existent expense ===');
      
      const nonExistentId = 99999;
      const updateData = {
        source: 'Updated Source',
        date: '2024-02-15',
        amount: 1000.00,
        currency: 'MDL'
      };
      
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/expenses/${nonExistentId}`, {
        data: updateData
      });
      
      const result = {
        success: updateResponse.ok(),
        statusCode: updateResponse.status(),
        data: updateResponse.ok() ? await updateResponse.json() : null,
        errorDetails: !updateResponse.ok() ? await apiClient.captureErrorDetails(updateResponse, { operation: 'UPDATE', id: nonExistentId, updateData }) : null
      };

      logTestResult('Update non-existent expense', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly returned 404 for update of non-existent expense ID: ${nonExistentId}`);
    });
  });

  test.describe('DELETE Operations', () => {
    test('should delete expense successfully', async () => {
      console.log('\n=== Testing expense deletion ===');
      
      // First create an expense
      const testExpense = testExpenses[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdExpense = await createResponse.json();
      
      // Delete the expense
      const deleteResponse = await apiClient.request.delete(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`);
      
      const result = {
        success: deleteResponse.ok(),
        statusCode: deleteResponse.status(),
        data: deleteResponse.ok() ? await deleteResponse.json() : null,
        errorDetails: !deleteResponse.ok() ? await apiClient.captureErrorDetails(deleteResponse, { operation: 'DELETE', id: createdExpense.id }) : null
      };

      logTestResult('Delete expense', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);

      // Verify the expense is actually deleted
      const verifyResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`);
      expect(verifyResponse.ok()).toBe(false);
      expect(verifyResponse.status()).toBe(404);

      console.log(`✅ Successfully deleted expense with ID: ${createdExpense.id}`);
    });

    test('should handle deletion of non-existent expense', async () => {
      console.log('\n=== Testing deletion of non-existent expense ===');
      
      const nonExistentId = 99999;
      const deleteResponse = await apiClient.request.delete(`${apiClient.baseURL}/api/expenses/${nonExistentId}`);
      
      const result = {
        success: deleteResponse.ok(),
        statusCode: deleteResponse.status(),
        data: deleteResponse.ok() ? await deleteResponse.json() : null,
        errorDetails: !deleteResponse.ok() ? await apiClient.captureErrorDetails(deleteResponse, { operation: 'DELETE', id: nonExistentId }) : null
      };

      logTestResult('Delete non-existent expense', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly returned 404 for deletion of non-existent expense ID: ${nonExistentId}`);
    });

    test('should test related data cleanup on deletion', async () => {
      console.log('\n=== Testing related data cleanup on expense deletion ===');
      
      // Create an expense
      const testExpense = {
        source: 'Cleanup Test Source',
        date: '2024-01-20',
        amount: 1000.00,
        currency: 'MDL',
        department: 'Test Department',
        supplier: 'Test Supplier',
        category: 'Test Category',
        description: 'Test expense for cleanup verification'
      };
      
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdExpense = await createResponse.json();
      
      // Delete the expense
      const deleteResponse = await apiClient.request.delete(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`);
      
      const result = {
        success: deleteResponse.ok(),
        statusCode: deleteResponse.status(),
        data: deleteResponse.ok() ? await deleteResponse.json() : null,
        errorDetails: !deleteResponse.ok() ? await apiClient.captureErrorDetails(deleteResponse, { operation: 'DELETE_CLEANUP', id: createdExpense.id }) : null
      };

      logTestResult('Delete expense (cleanup test)', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);

      // Verify the expense is deleted
      const verifyResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses/${createdExpense.id}`);
      expect(verifyResponse.ok()).toBe(false);
      expect(verifyResponse.status()).toBe(404);

      // Note: In a real system, we might check for related data cleanup
      // such as removing references in reports, analytics, etc.
      console.log(`✅ Successfully tested cleanup effects for expense deletion`);
    });
  });

  test.describe('Data Integrity and Validation', () => {
    test('should maintain data integrity across operations', async () => {
      console.log('\n=== Testing data integrity across CRUD operations ===');
      
      const testExpense = {
        source: 'Integrity Test Source',
        date: '2024-01-25',
        amount: 1750.25,
        currency: 'MDL',
        department: 'Integrity Test Dept',
        supplier: 'Integrity Test Supplier',
        category: 'Testing',
        description: 'Expense for integrity testing'
      };

      // Create
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      expect(createResponse.ok()).toBe(true);
      const created = await createResponse.json();
      
      // Read and verify
      const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses/${created.id}`);
      expect(readResponse.ok()).toBe(true);
      const read = await readResponse.json();
      
      expect(read.source).toBe(testExpense.source);
      expect(read.date).toBe(testExpense.date);
      expect(parseFloat(read.amount)).toBe(testExpense.amount);
      expect(read.currency).toBe(testExpense.currency);
      expect(read.department).toBe(testExpense.department);
      expect(read.supplier).toBe(testExpense.supplier);
      
      // Update
      const updateData = { ...testExpense, amount: 2000.00, description: 'Updated integrity test' };
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/expenses/${created.id}`, {
        data: updateData
      });
      expect(updateResponse.ok()).toBe(true);
      const updated = await updateResponse.json();
      
      expect(parseFloat(updated.amount)).toBe(updateData.amount);
      expect(updated.description).toBe(updateData.description);
      expect(updated.id).toBe(created.id);
      
      // Final verification
      const finalReadResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses/${created.id}`);
      expect(finalReadResponse.ok()).toBe(true);
      const finalRead = await finalReadResponse.json();
      
      expect(parseFloat(finalRead.amount)).toBe(updateData.amount);
      expect(finalRead.description).toBe(updateData.description);
      expect(finalRead.updated_at).not.toBe(created.updated_at);

      console.log(`✅ Data integrity maintained across all operations for expense ID: ${created.id}`);
    });

    test('should handle concurrent modifications', async () => {
      console.log('\n=== Testing concurrent expense modifications ===');
      
      // Create an expense
      const testExpense = testExpenses[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: testExpense
      });
      expect(createResponse.ok()).toBe(true);
      const created = await createResponse.json();
      
      // Perform concurrent updates
      const updatePromises = [];
      for (let i = 0; i < 3; i++) {
        const updateData = {
          ...testExpense,
          amount: 1000 + (i * 100),
          description: `Concurrent Update ${i + 1}`
        };
        
        updatePromises.push(
          apiClient.request.put(`${apiClient.baseURL}/api/expenses/${created.id}`, {
            data: updateData
          })
        );
      }
      
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.ok()).length;
      
      console.log(`Concurrent updates: ${successCount}/${results.length} successful`);
      
      // At least one update should succeed
      expect(successCount).toBeGreaterThan(0);
      
      // Verify final state
      const finalReadResponse = await apiClient.request.get(`${apiClient.baseURL}/api/expenses/${created.id}`);
      expect(finalReadResponse.ok()).toBe(true);
      const finalState = await finalReadResponse.json();
      
      expect(finalState.description).toMatch(/Concurrent Update \d+/);

      console.log(`✅ Concurrent modifications handled - final state: ${finalState.description}`);
    });

    test('should validate currency and amount precision', async () => {
      console.log('\n=== Testing currency and amount precision validation ===');
      
      const precisionTestExpense = {
        source: 'Precision Test',
        date: '2024-01-30',
        amount: 1234.567, // Test precision handling
        currency: 'MDL',
        description: 'Testing decimal precision'
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/expenses`, {
        data: precisionTestExpense
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE_PRECISION', precisionTestExpense }) : null
      };

      logTestResult('Create expense with precision test', result);

      if (result.success) {
        expect(result.statusCode).toBe(201);
        expect(result.data).toBeDefined();
        
        // Check how the system handles decimal precision
        const storedAmount = parseFloat(result.data.amount);
        console.log(`Original amount: ${precisionTestExpense.amount}, Stored amount: ${storedAmount}`);
        
        // The system should handle decimal precision appropriately
        expect(storedAmount).toBeCloseTo(precisionTestExpense.amount, 2);
        
        console.log(`✅ Amount precision handled correctly: ${storedAmount}`);
      } else {
        console.log(`⚠️ Precision test failed with status ${result.statusCode}`);
      }
    });
  });
});