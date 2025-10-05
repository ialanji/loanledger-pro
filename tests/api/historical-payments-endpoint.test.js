/**
 * Unit tests for /api/payments/historical endpoint
 * Tests endpoint returns correct data structure, filtering, and error handling
 */

const { makeApiRequest } = require('../utils/testHelpers');

describe('Historical Payments Endpoint', () => {
  const API_BASE_URL = 'http://localhost:3001';
  const ENDPOINT = '/api/payments/historical';
  
  describe('Basic endpoint functionality', () => {
    test('should return 200 status and array response', async () => {
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.headers['x-historical-payments']).toBe('active');
    });

    test('should return correct data structure for each payment', async () => {
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      
      if (response.data.length > 0) {
        const payment = response.data[0];
        
        // Verify required fields exist
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('credit_id');
        expect(payment).toHaveProperty('payment_date');
        expect(payment).toHaveProperty('payment_amount');
        expect(payment).toHaveProperty('principal_amount');
        expect(payment).toHaveProperty('interest_amount');
        expect(payment).toHaveProperty('payment_type');
        expect(payment).toHaveProperty('contract_number');
        
        // Verify data types
        expect(typeof payment.id).toBe('string');
        expect(typeof payment.credit_id).toBe('string');
        expect(typeof payment.payment_date).toBe('string');
        expect(typeof payment.payment_type).toBe('string');
        
        // Numeric fields should be numbers or null
        if (payment.payment_amount !== null) {
          expect(typeof payment.payment_amount).toBe('number');
        }
        if (payment.principal_amount !== null) {
          expect(typeof payment.principal_amount).toBe('number');
        }
        if (payment.interest_amount !== null) {
          expect(typeof payment.interest_amount).toBe('number');
        }
      }
    });

    test('should return payments ordered by payment_date DESC', async () => {
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      
      if (response.data.length > 1) {
        for (let i = 0; i < response.data.length - 1; i++) {
          const currentDate = new Date(response.data[i].payment_date);
          const nextDate = new Date(response.data[i + 1].payment_date);
          
          // Current date should be >= next date (DESC order)
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });
  });

  describe('Credit ID filtering', () => {
    test('should accept valid UUID creditId parameter', async () => {
      // Use a valid UUID format (even if it doesn't exist in DB)
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const response = await makeApiRequest(`${ENDPOINT}?creditId=${validUuid}`, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // All returned payments should have the specified credit_id
      response.data.forEach(payment => {
        expect(payment.credit_id).toBe(validUuid);
      });
    });

    test('should return 400 for invalid UUID format', async () => {
      const invalidUuid = 'invalid-uuid-format';
      const response = await makeApiRequest(`${ENDPOINT}?creditId=${invalidUuid}`, 'GET', null, 3001);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toBe('Invalid creditId format');
      expect(response.data).toHaveProperty('details');
      expect(response.data.details).toBe('creditId must be a valid UUID');
    });

    test('should return 400 for malformed UUID', async () => {
      const malformedUuid = '550e8400-e29b-41d4-a716-44665544000'; // Missing one character
      const response = await makeApiRequest(`${ENDPOINT}?creditId=${malformedUuid}`, 'GET', null, 3001);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toBe('Invalid creditId format');
    });

    test('should handle empty creditId parameter', async () => {
      const response = await makeApiRequest(`${ENDPOINT}?creditId=`, 'GET', null, 3001);
      
      // Empty creditId should be ignored and return all payments
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should handle whitespace-only creditId parameter', async () => {
      const response = await makeApiRequest(`${ENDPOINT}?creditId=%20%20%20`, 'GET', null, 3001); // URL encoded spaces
      
      // Whitespace-only creditId should be ignored and return all payments
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should filter by existing credit ID if available', async () => {
      // First get all payments to find an existing credit_id
      const allPaymentsResponse = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      if (allPaymentsResponse.status === 200 && allPaymentsResponse.data.length > 0) {
        const existingCreditId = allPaymentsResponse.data[0].credit_id;
        
        // Now filter by that credit ID
        const filteredResponse = await makeApiRequest(`${ENDPOINT}?creditId=${existingCreditId}`, 'GET', null, 3001);
        
        expect(filteredResponse.status).toBe(200);
        expect(Array.isArray(filteredResponse.data)).toBe(true);
        
        // All returned payments should have the specified credit_id
        filteredResponse.data.forEach(payment => {
          expect(payment.credit_id).toBe(existingCreditId);
        });
        
        // Filtered results should be <= total results
        expect(filteredResponse.data.length).toBeLessThanOrEqual(allPaymentsResponse.data.length);
      }
    });
  });

  describe('Error handling scenarios', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test assumes the server handles DB errors properly
      // We can't easily simulate DB errors in integration tests,
      // but we can verify the error response structure
      
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      // If there's an error, it should be properly formatted
      if (response.status === 500) {
        expect(response.data).toHaveProperty('error');
        expect(response.data).toHaveProperty('details');
        expect(response.data.error).toBe('Internal server error');
      } else {
        // If successful, should return proper data
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      }
    });

    test('should handle non-existent credit ID gracefully', async () => {
      const nonExistentUuid = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID format but non-existent
      const response = await makeApiRequest(`${ENDPOINT}?creditId=${nonExistentUuid}`, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(0); // Should return empty array
    });

    test('should handle multiple query parameters', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const response = await makeApiRequest(`${ENDPOINT}?creditId=${validUuid}&extra=param&another=value`, 'GET', null, 3001);
      
      // Should ignore extra parameters and process creditId normally
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should handle special characters in query parameters', async () => {
      const invalidInput = 'test%20with%20spaces%20and%20special%20chars!@#$';
      const response = await makeApiRequest(`${ENDPOINT}?creditId=${invalidInput}`, 'GET', null, 3001);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toBe('Invalid creditId format');
    });
  });

  describe('Response headers and metadata', () => {
    test('should include X-Historical-Payments header', async () => {
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      expect(response.headers['x-historical-payments']).toBe('active');
    });

    test('should return proper Content-Type header', async () => {
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Data consistency and validation', () => {
    test('should return consistent data on multiple requests', async () => {
      const response1 = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      const response2 = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Data should be consistent between requests (assuming no concurrent modifications)
      expect(response1.data.length).toBe(response2.data.length);
      
      if (response1.data.length > 0) {
        expect(response1.data[0].id).toBe(response2.data[0].id);
      }
    });

    test('should handle null values in numeric fields properly', async () => {
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      
      response.data.forEach(payment => {
        // Numeric fields can be null or numbers, but not undefined or strings
        if (payment.payment_amount !== null) {
          expect(typeof payment.payment_amount).toBe('number');
          expect(isNaN(payment.payment_amount)).toBe(false);
        }
        
        if (payment.principal_amount !== null) {
          expect(typeof payment.principal_amount).toBe('number');
          expect(isNaN(payment.principal_amount)).toBe(false);
        }
        
        if (payment.interest_amount !== null) {
          expect(typeof payment.interest_amount).toBe('number');
          expect(isNaN(payment.interest_amount)).toBe(false);
        }
      });
    });

    test('should return valid date formats', async () => {
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      
      response.data.forEach(payment => {
        if (payment.payment_date) {
          const date = new Date(payment.payment_date);
          expect(date instanceof Date).toBe(true);
          expect(isNaN(date.getTime())).toBe(false);
        }
      });
    });
  });

  describe('Performance and limits', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should handle large result sets efficiently', async () => {
      const response = await makeApiRequest(ENDPOINT, 'GET', null, 3001);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Log the result size for monitoring
      console.log(`Historical payments endpoint returned ${response.data.length} records`);
      
      // Should handle reasonable amounts of data
      expect(response.data.length).toBeLessThan(100000); // Sanity check
    });
  });
});