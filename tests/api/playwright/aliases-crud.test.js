import { test, expect } from '@playwright/test';
import { APITestClient, validateResponseStructure, logTestResult } from './utils/api-utils.js';
import { setupTestEnvironment, cleanupTestEnvironment, seedTestData, validateTestEnvironment } from './utils/test-helpers.js';
import { testAliases, invalidTestData } from './fixtures/test-data.js';

test.describe('Aliases CRUD Operations Test Suite', () => {
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
    test('should create alias with department type', async () => {
      console.log('\n=== Testing alias creation with department type ===');
      
      const testAlias = {
        source_value: 'HR Department',
        normalized_value: 'hr-department',
        type: 'department',
        is_group: false
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE', testAlias }) : null
      };

      logTestResult('Create department alias', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.source_value).toBe(testAlias.source_value);
      expect(result.data.normalized_value).toBe(testAlias.normalized_value);
      expect(result.data.type).toBe(testAlias.type);
      expect(result.data.is_group).toBe(testAlias.is_group);
      expect(result.data.created_at).toBeDefined();
      expect(result.data.updated_at).toBeDefined();

      console.log(`✅ Successfully created department alias with ID: ${result.data.id}`);
    });

    test('should create alias with supplier type', async () => {
      console.log('\n=== Testing alias creation with supplier type ===');
      
      const testAlias = {
        source_value: 'Acme Corp',
        normalized_value: 'acme-corp',
        type: 'supplier',
        is_group: false
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE', testAlias }) : null
      };

      logTestResult('Create supplier alias', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.source_value).toBe(testAlias.source_value);
      expect(result.data.normalized_value).toBe(testAlias.normalized_value);
      expect(result.data.type).toBe(testAlias.type);
      expect(result.data.is_group).toBe(testAlias.is_group);

      console.log(`✅ Successfully created supplier alias with ID: ${result.data.id}`);
    });

    test('should create group alias', async () => {
      console.log('\n=== Testing group alias creation ===');
      
      const testAlias = {
        source_value: 'Office Suppliers Group',
        normalized_value: 'office-suppliers-group',
        type: 'supplier',
        is_group: true
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE', testAlias }) : null
      };

      logTestResult('Create group alias', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.is_group).toBe(true);

      console.log(`✅ Successfully created group alias with ID: ${result.data.id}`);
    });

    test('should validate required fields on creation', async () => {
      console.log('\n=== Testing alias creation validation ===');
      
      const invalidAlias = {
        source_value: '',
        normalized_value: '',
        type: 'invalid_type'
      };

      const response = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: invalidAlias
      });

      const result = {
        success: response.ok(),
        statusCode: response.status(),
        data: response.ok() ? await response.json() : null,
        errorDetails: !response.ok() ? await apiClient.captureErrorDetails(response, { operation: 'CREATE', invalidAlias }) : null
      };

      logTestResult('Create invalid alias', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails.responseData.error).toBeDefined();

      console.log(`✅ Properly rejected invalid alias creation with status ${result.statusCode}`);
    });
  });

  test.describe('READ Operations', () => {
    test('should read specific alias by ID', async () => {
      console.log('\n=== Testing alias read by ID ===');
      
      // First create an alias
      const testAlias = testAliases[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdAlias = await createResponse.json();
      
      // Now read it back
      const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${createdAlias.id}`);
      
      const result = {
        success: readResponse.ok(),
        statusCode: readResponse.status(),
        data: readResponse.ok() ? await readResponse.json() : null,
        errorDetails: !readResponse.ok() ? await apiClient.captureErrorDetails(readResponse, { operation: 'READ', id: createdAlias.id }) : null
      };

      logTestResult('Read alias by ID', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(createdAlias.id);
      expect(result.data.source_value).toBe(testAlias.source_value);
      expect(result.data.normalized_value).toBe(testAlias.normalized_value);
      expect(result.data.type).toBe(testAlias.type);

      console.log(`✅ Successfully read alias with ID: ${createdAlias.id}`);
    });

    test('should handle non-existent alias ID', async () => {
      console.log('\n=== Testing read of non-existent alias ===');
      
      const nonExistentId = 99999;
      const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${nonExistentId}`);
      
      const result = {
        success: readResponse.ok(),
        statusCode: readResponse.status(),
        data: readResponse.ok() ? await readResponse.json() : null,
        errorDetails: !readResponse.ok() ? await apiClient.captureErrorDetails(readResponse, { operation: 'READ', id: nonExistentId }) : null
      };

      logTestResult('Read non-existent alias', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly returned 404 for non-existent alias ID: ${nonExistentId}`);
    });

    test('should read all aliases with proper structure', async () => {
      console.log('\n=== Testing read all aliases ===');
      
      // Create multiple test aliases
      for (const testAlias of testAliases) {
        const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
          data: testAlias
        });
        expect(createResponse.ok()).toBe(true);
      }
      
      // Read all aliases
      const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases`);
      
      const result = {
        success: readResponse.ok(),
        statusCode: readResponse.status(),
        data: readResponse.ok() ? await readResponse.json() : null,
        errorDetails: !readResponse.ok() ? await apiClient.captureErrorDetails(readResponse, { operation: 'READ_ALL' }) : null
      };

      logTestResult('Read all aliases', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(testAliases.length);

      // Validate structure
      const expectedFields = ['id', 'source_value', 'normalized_value', 'type', 'is_group', 'created_at', 'updated_at'];
      const structureErrors = validateResponseStructure(result.data, expectedFields);
      expect(structureErrors.length).toBe(0);

      console.log(`✅ Successfully read ${result.data.length} aliases with proper structure`);
    });
  });

  test.describe('UPDATE Operations', () => {
    test('should update alias data', async () => {
      console.log('\n=== Testing alias update ===');
      
      // First create an alias
      const testAlias = testAliases[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdAlias = await createResponse.json();
      
      // Update the alias
      const updateData = {
        source_value: 'Updated Department Name',
        normalized_value: 'updated-department-name',
        type: 'department',
        is_group: true
      };
      
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/aliases/${createdAlias.id}`, {
        data: updateData
      });
      
      const result = {
        success: updateResponse.ok(),
        statusCode: updateResponse.status(),
        data: updateResponse.ok() ? await updateResponse.json() : null,
        errorDetails: !updateResponse.ok() ? await apiClient.captureErrorDetails(updateResponse, { operation: 'UPDATE', id: createdAlias.id, updateData }) : null
      };

      logTestResult('Update alias', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(createdAlias.id);
      expect(result.data.source_value).toBe(updateData.source_value);
      expect(result.data.normalized_value).toBe(updateData.normalized_value);
      expect(result.data.is_group).toBe(updateData.is_group);
      expect(result.data.updated_at).not.toBe(createdAlias.updated_at);

      console.log(`✅ Successfully updated alias with ID: ${createdAlias.id}`);
    });

    test('should validate update data', async () => {
      console.log('\n=== Testing alias update validation ===');
      
      // First create an alias
      const testAlias = testAliases[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdAlias = await createResponse.json();
      
      // Try to update with invalid data
      const invalidUpdateData = {
        source_value: '',
        normalized_value: '',
        type: 'invalid_type'
      };
      
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/aliases/${createdAlias.id}`, {
        data: invalidUpdateData
      });
      
      const result = {
        success: updateResponse.ok(),
        statusCode: updateResponse.status(),
        data: updateResponse.ok() ? await updateResponse.json() : null,
        errorDetails: !updateResponse.ok() ? await apiClient.captureErrorDetails(updateResponse, { operation: 'UPDATE', id: createdAlias.id, invalidUpdateData }) : null
      };

      logTestResult('Update alias with invalid data', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly rejected invalid update data with status ${result.statusCode}`);
    });

    test('should handle update of non-existent alias', async () => {
      console.log('\n=== Testing update of non-existent alias ===');
      
      const nonExistentId = 99999;
      const updateData = {
        source_value: 'Updated Name',
        normalized_value: 'updated-name',
        type: 'department',
        is_group: false
      };
      
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/aliases/${nonExistentId}`, {
        data: updateData
      });
      
      const result = {
        success: updateResponse.ok(),
        statusCode: updateResponse.status(),
        data: updateResponse.ok() ? await updateResponse.json() : null,
        errorDetails: !updateResponse.ok() ? await apiClient.captureErrorDetails(updateResponse, { operation: 'UPDATE', id: nonExistentId, updateData }) : null
      };

      logTestResult('Update non-existent alias', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly returned 404 for update of non-existent alias ID: ${nonExistentId}`);
    });
  });

  test.describe('DELETE Operations', () => {
    test('should delete alias successfully', async () => {
      console.log('\n=== Testing alias deletion ===');
      
      // First create an alias
      const testAlias = testAliases[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });
      
      expect(createResponse.ok()).toBe(true);
      const createdAlias = await createResponse.json();
      
      // Delete the alias
      const deleteResponse = await apiClient.request.delete(`${apiClient.baseURL}/api/aliases/${createdAlias.id}`);
      
      const result = {
        success: deleteResponse.ok(),
        statusCode: deleteResponse.status(),
        data: deleteResponse.ok() ? await deleteResponse.json() : null,
        errorDetails: !deleteResponse.ok() ? await apiClient.captureErrorDetails(deleteResponse, { operation: 'DELETE', id: createdAlias.id }) : null
      };

      logTestResult('Delete alias', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);

      // Verify the alias is actually deleted
      const verifyResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${createdAlias.id}`);
      expect(verifyResponse.ok()).toBe(false);
      expect(verifyResponse.status()).toBe(404);

      console.log(`✅ Successfully deleted alias with ID: ${createdAlias.id}`);
    });

    test('should handle deletion of non-existent alias', async () => {
      console.log('\n=== Testing deletion of non-existent alias ===');
      
      const nonExistentId = 99999;
      const deleteResponse = await apiClient.request.delete(`${apiClient.baseURL}/api/aliases/${nonExistentId}`);
      
      const result = {
        success: deleteResponse.ok(),
        statusCode: deleteResponse.status(),
        data: deleteResponse.ok() ? await deleteResponse.json() : null,
        errorDetails: !deleteResponse.ok() ? await apiClient.captureErrorDetails(deleteResponse, { operation: 'DELETE', id: nonExistentId }) : null
      };

      logTestResult('Delete non-existent alias', result);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.errorDetails).toBeDefined();

      console.log(`✅ Properly returned 404 for deletion of non-existent alias ID: ${nonExistentId}`);
    });

    test('should test cascade effects of alias deletion', async () => {
      console.log('\n=== Testing cascade effects of alias deletion ===');
      
      // Create a group alias
      const groupAlias = {
        source_value: 'Test Group',
        normalized_value: 'test-group',
        type: 'supplier',
        is_group: true
      };
      
      const createGroupResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: groupAlias
      });
      
      expect(createGroupResponse.ok()).toBe(true);
      const createdGroup = await createGroupResponse.json();
      
      // Create a regular alias that might reference the group
      const memberAlias = {
        source_value: 'Test Member',
        normalized_value: 'test-member',
        type: 'supplier',
        is_group: false
      };
      
      const createMemberResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: memberAlias
      });
      
      expect(createMemberResponse.ok()).toBe(true);
      const createdMember = await createMemberResponse.json();
      
      // Delete the group alias
      const deleteResponse = await apiClient.request.delete(`${apiClient.baseURL}/api/aliases/${createdGroup.id}`);
      
      const result = {
        success: deleteResponse.ok(),
        statusCode: deleteResponse.status(),
        data: deleteResponse.ok() ? await deleteResponse.json() : null,
        errorDetails: !deleteResponse.ok() ? await apiClient.captureErrorDetails(deleteResponse, { operation: 'DELETE_CASCADE', id: createdGroup.id }) : null
      };

      logTestResult('Delete group alias (cascade test)', result);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);

      // Verify the group is deleted
      const verifyGroupResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${createdGroup.id}`);
      expect(verifyGroupResponse.ok()).toBe(false);
      expect(verifyGroupResponse.status()).toBe(404);

      // Verify the member alias still exists (no cascade deletion expected for this simple case)
      const verifyMemberResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${createdMember.id}`);
      expect(verifyMemberResponse.ok()).toBe(true);

      console.log(`✅ Successfully tested cascade effects - group deleted, member preserved`);
    });
  });

  test.describe('Data Validation and Integrity', () => {
    test('should maintain data integrity across operations', async () => {
      console.log('\n=== Testing data integrity across CRUD operations ===');
      
      const testAlias = {
        source_value: 'Integrity Test Alias',
        normalized_value: 'integrity-test-alias',
        type: 'department',
        is_group: false
      };

      // Create
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });
      expect(createResponse.ok()).toBe(true);
      const created = await createResponse.json();
      
      // Read and verify
      const readResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${created.id}`);
      expect(readResponse.ok()).toBe(true);
      const read = await readResponse.json();
      
      expect(read.source_value).toBe(testAlias.source_value);
      expect(read.normalized_value).toBe(testAlias.normalized_value);
      expect(read.type).toBe(testAlias.type);
      expect(read.is_group).toBe(testAlias.is_group);
      
      // Update
      const updateData = { ...testAlias, source_value: 'Updated Integrity Test' };
      const updateResponse = await apiClient.request.put(`${apiClient.baseURL}/api/aliases/${created.id}`, {
        data: updateData
      });
      expect(updateResponse.ok()).toBe(true);
      const updated = await updateResponse.json();
      
      expect(updated.source_value).toBe(updateData.source_value);
      expect(updated.id).toBe(created.id);
      
      // Final verification
      const finalReadResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${created.id}`);
      expect(finalReadResponse.ok()).toBe(true);
      const finalRead = await finalReadResponse.json();
      
      expect(finalRead.source_value).toBe(updateData.source_value);
      expect(finalRead.updated_at).not.toBe(created.updated_at);

      console.log(`✅ Data integrity maintained across all operations for alias ID: ${created.id}`);
    });

    test('should handle concurrent modifications', async () => {
      console.log('\n=== Testing concurrent alias modifications ===');
      
      // Create an alias
      const testAlias = testAliases[0];
      const createResponse = await apiClient.request.post(`${apiClient.baseURL}/api/aliases`, {
        data: testAlias
      });
      expect(createResponse.ok()).toBe(true);
      const created = await createResponse.json();
      
      // Perform concurrent updates
      const updatePromises = [];
      for (let i = 0; i < 3; i++) {
        const updateData = {
          ...testAlias,
          source_value: `Concurrent Update ${i + 1}`,
          normalized_value: `concurrent-update-${i + 1}`
        };
        
        updatePromises.push(
          apiClient.request.put(`${apiClient.baseURL}/api/aliases/${created.id}`, {
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
      const finalReadResponse = await apiClient.request.get(`${apiClient.baseURL}/api/aliases/${created.id}`);
      expect(finalReadResponse.ok()).toBe(true);
      const finalState = await finalReadResponse.json();
      
      expect(finalState.source_value).toMatch(/Concurrent Update \d+/);

      console.log(`✅ Concurrent modifications handled - final state: ${finalState.source_value}`);
    });
  });
});