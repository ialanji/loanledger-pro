/**
 * Test script for forecast report filter validation
 * Tests the validation of dateFrom, dateTo, and bankId parameters
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  console.log('Testing forecast report filter validation...\n');
  
  const tests = [
    {
      name: 'Valid request with no filters',
      path: '/api/reports/forecast',
      expectedStatus: 200
    },
    {
      name: 'Valid request with valid dateFrom',
      path: '/api/reports/forecast?dateFrom=2024-01-01',
      expectedStatus: 200
    },
    {
      name: 'Valid request with valid dateTo',
      path: '/api/reports/forecast?dateTo=2024-12-31',
      expectedStatus: 200
    },
    {
      name: 'Valid request with valid date range',
      path: '/api/reports/forecast?dateFrom=2024-01-01&dateTo=2024-12-31',
      expectedStatus: 200
    },
    {
      name: 'Valid request with bankId="all"',
      path: '/api/reports/forecast?bankId=all',
      expectedStatus: 200
    },
    {
      name: 'Invalid dateFrom format (wrong format)',
      path: '/api/reports/forecast?dateFrom=01-01-2024',
      expectedStatus: 400
    },
    {
      name: 'Invalid dateFrom format (missing day)',
      path: '/api/reports/forecast?dateFrom=2024-01',
      expectedStatus: 400
    },
    {
      name: 'Invalid dateTo format (wrong separator)',
      path: '/api/reports/forecast?dateTo=2024/12/31',
      expectedStatus: 400
    },
    {
      name: 'Invalid dateTo format (text)',
      path: '/api/reports/forecast?dateTo=invalid-date',
      expectedStatus: 400
    },
    {
      name: 'Invalid bankId format (not UUID)',
      path: '/api/reports/forecast?bankId=12345',
      expectedStatus: 400
    },
    {
      name: 'Invalid bankId format (malformed UUID)',
      path: '/api/reports/forecast?bankId=123e4567-e89b-12d3-a456',
      expectedStatus: 400
    },
    {
      name: 'Valid UUID bankId',
      path: '/api/reports/forecast?bankId=123e4567-e89b-12d3-a456-426614174000',
      expectedStatus: 200
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await makeRequest(test.path);
      const success = result.status === test.expectedStatus;
      
      if (success) {
        console.log(`✓ PASS: ${test.name}`);
        console.log(`  Status: ${result.status}`);
        passed++;
      } else {
        console.log(`✗ FAIL: ${test.name}`);
        console.log(`  Expected status: ${test.expectedStatus}, Got: ${result.status}`);
        console.log(`  Response:`, result.data);
        failed++;
      }
      
      if (result.status === 400 && result.data.error) {
        console.log(`  Error message: ${result.data.error}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`✗ ERROR: ${test.name}`);
      console.log(`  ${error.message}`);
      failed++;
      console.log('');
    }
  }
  
  console.log('='.repeat(50));
  console.log(`Total: ${tests.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
