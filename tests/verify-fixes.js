/**
 * Simple verification script to test that all API fixes are working
 * This bypasses the Playwright test setup and directly tests the endpoints
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testEndpoint(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const responseData = response.ok ? await response.json() : await response.text();

    return {
      success: response.ok,
      status: response.status,
      data: responseData,
      endpoint: `${method} ${endpoint}`
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message,
      endpoint: `${method} ${endpoint}`
    };
  }
}

async function runVerificationTests() {
  console.log('🚀 Starting API fixes verification...\n');

  const tests = [
    // Health and debug endpoints
    { method: 'GET', endpoint: '/api/version', description: 'Server version check' },
    { method: 'GET', endpoint: '/api/debug/health', description: 'System health check' },
    { method: 'GET', endpoint: '/api/debug/database', description: 'Database status check' },
    { method: 'GET', endpoint: '/api/debug/performance', description: 'Performance metrics' },
    
    // Aliases endpoint tests
    { method: 'GET', endpoint: '/api/aliases', description: 'Get all aliases' },
    { method: 'GET', endpoint: '/api/aliases?type=department', description: 'Get department aliases' },
    { method: 'GET', endpoint: '/api/aliases?type=supplier', description: 'Get supplier aliases' },
    
    // Expenses endpoint tests
    { method: 'GET', endpoint: '/api/expenses', description: 'Get all expenses' },
    { method: 'GET', endpoint: '/api/expenses?limit=5', description: 'Get expenses with limit' },
    
    // Create alias test
    { 
      method: 'POST', 
      endpoint: '/api/aliases', 
      data: {
        source_value: 'Verification Test Department',
        normalized_value: 'verification-test-department',
        type: 'department',
        is_group: false
      },
      description: 'Create test alias'
    },
    
    // Create expense test
    {
      method: 'POST',
      endpoint: '/api/expenses',
      data: {
        source: 'Verification Test',
        date: '2024-01-01',
        amount: 100.00,
        currency: 'MDL',
        department: 'Test Department',
        category: 'Test Category',
        description: 'Verification test expense'
      },
      description: 'Create test expense'
    }
  ];

  let passedTests = 0;
  let failedTests = 0;
  const results = [];

  for (const test of tests) {
    console.log(`Testing: ${test.description}`);
    const result = await testEndpoint(test.method, test.endpoint, test.data);
    
    if (result.success) {
      console.log(`✅ PASS: ${result.endpoint} - Status: ${result.status}`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: ${result.endpoint} - Status: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else if (result.data) {
        console.log(`   Response: ${typeof result.data === 'string' ? result.data : JSON.stringify(result.data)}`);
      }
      failedTests++;
    }
    
    results.push({ ...test, result });
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 VERIFICATION SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! API fixes are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
  }

  return {
    total: tests.length,
    passed: passedTests,
    failed: failedTests,
    successRate: (passedTests / tests.length) * 100,
    results
  };
}

// Check if server is running first
async function checkServerStatus() {
  try {
    const response = await fetch(`${BASE_URL}/api/version`);
    if (response.ok) {
      console.log('✅ Server is running and responding\n');
      return true;
    } else {
      console.log(`❌ Server responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Server is not running or not accessible: ${error.message}`);
    console.log('Please start the server with: npm run server\n');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 API Fixes Verification Tool');
  console.log('===============================\n');

  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    process.exit(1);
  }

  try {
    const results = await runVerificationTests();
    process.exit(results.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
    process.exit(1);
  }
}

main();