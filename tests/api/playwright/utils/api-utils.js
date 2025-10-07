import { expect } from '@playwright/test';

export class APITestClient {
  constructor(request, baseURL = 'http://localhost:3001') {
    this.request = request;
    this.baseURL = baseURL;
  }

  async testAliasesEndpoint(type = null) {
    const startTime = Date.now();
    let url = `${this.baseURL}/api/aliases`;
    
    if (type) {
      url += `?type=${type}`;
    }

    try {
      const response = await this.request.get(url);
      const responseTime = Date.now() - startTime;
      
      const result = {
        success: response.ok(),
        statusCode: response.status(),
        responseTime,
        url,
        headers: await response.headers()
      };

      if (response.ok()) {
        result.data = await response.json();
      } else {
        result.errorDetails = await this.captureErrorDetails(response, { url, type });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        url,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          requestContext: { url, type }
        }
      };
    }
  }

  async testExpensesEndpoint() {
    const startTime = Date.now();
    const url = `${this.baseURL}/api/expenses`;

    try {
      const response = await this.request.get(url);
      const responseTime = Date.now() - startTime;
      
      const result = {
        success: response.ok(),
        statusCode: response.status(),
        responseTime,
        url,
        headers: await response.headers()
      };

      if (response.ok()) {
        result.data = await response.json();
      } else {
        result.errorDetails = await this.captureErrorDetails(response, { url });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        url,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          requestContext: { url }
        }
      };
    }
  }

  async testCRUDOperations(endpoint, testData) {
    const results = {
      create: null,
      read: null,
      update: null,
      delete: null
    };

    try {
      // CREATE
      const createResponse = await this.request.post(`${this.baseURL}/api/${endpoint}`, {
        data: testData
      });
      
      results.create = {
        success: createResponse.ok(),
        statusCode: createResponse.status(),
        data: createResponse.ok() ? await createResponse.json() : null,
        errorDetails: !createResponse.ok() ? await this.captureErrorDetails(createResponse, { operation: 'CREATE', endpoint, testData }) : null
      };

      if (results.create.success && results.create.data) {
        const createdId = results.create.data.id;

        // READ
        const readResponse = await this.request.get(`${this.baseURL}/api/${endpoint}/${createdId}`);
        results.read = {
          success: readResponse.ok(),
          statusCode: readResponse.status(),
          data: readResponse.ok() ? await readResponse.json() : null,
          errorDetails: !readResponse.ok() ? await this.captureErrorDetails(readResponse, { operation: 'READ', endpoint, id: createdId }) : null
        };

        // UPDATE
        const updateData = { ...testData, updated_field: 'test_update' };
        const updateResponse = await this.request.put(`${this.baseURL}/api/${endpoint}/${createdId}`, {
          data: updateData
        });
        results.update = {
          success: updateResponse.ok(),
          statusCode: updateResponse.status(),
          data: updateResponse.ok() ? await updateResponse.json() : null,
          errorDetails: !updateResponse.ok() ? await this.captureErrorDetails(updateResponse, { operation: 'UPDATE', endpoint, id: createdId, updateData }) : null
        };

        // DELETE
        const deleteResponse = await this.request.delete(`${this.baseURL}/api/${endpoint}/${createdId}`);
        results.delete = {
          success: deleteResponse.ok(),
          statusCode: deleteResponse.status(),
          data: deleteResponse.ok() ? await deleteResponse.json() : null,
          errorDetails: !deleteResponse.ok() ? await this.captureErrorDetails(deleteResponse, { operation: 'DELETE', endpoint, id: createdId }) : null
        };
      }
    } catch (error) {
      console.error(`CRUD test error for ${endpoint}:`, error);
    }

    return results;
  }

  async captureErrorDetails(response, requestContext = {}) {
    try {
      const responseText = await response.text();
      let responseData = null;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Response is not JSON
      }

      return {
        message: responseData?.error || `HTTP ${response.status()}`,
        statusCode: response.status(),
        statusText: response.statusText(),
        responseBody: responseText,
        responseData,
        headers: await response.headers(),
        timestamp: new Date().toISOString(),
        requestContext
      };
    } catch (error) {
      return {
        message: 'Failed to capture error details',
        originalError: error.message,
        timestamp: new Date().toISOString(),
        requestContext
      };
    }
  }

  async waitForServerReady(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.request.get(`${this.baseURL}/api/version`);
        if (response.ok()) {
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }
}

export function validateResponseStructure(data, expectedFields) {
  const errors = [];
  
  if (!Array.isArray(data)) {
    errors.push('Response data should be an array');
    return errors;
  }

  if (data.length > 0) {
    const firstItem = data[0];
    
    for (const field of expectedFields) {
      if (!(field in firstItem)) {
        errors.push(`Missing expected field: ${field}`);
      }
    }
  }

  return errors;
}

export function logTestResult(testName, result) {
  console.log(`\n[TEST RESULT] ${testName}`);
  console.log(`Success: ${result.success}`);
  console.log(`Status Code: ${result.statusCode}`);
  console.log(`Response Time: ${result.responseTime}ms`);
  
  if (result.errorDetails) {
    console.log('Error Details:', JSON.stringify(result.errorDetails, null, 2));
  }
  
  if (result.data) {
    console.log(`Data Count: ${Array.isArray(result.data) ? result.data.length : 'N/A'}`);
  }
}