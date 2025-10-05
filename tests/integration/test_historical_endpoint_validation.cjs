// Test script for endpoint validation and edge cases
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testEndpointValidation() {
  console.log('Testing /api/payments/historical endpoint validation...\n');
  
  const tests = [
    {
      name: 'Basic endpoint (no parameters)',
      url: 'http://localhost:3001/api/payments/historical'
    },
    {
      name: 'With valid UUID creditId',
      url: 'http://localhost:3001/api/payments/historical?creditId=550e8400-e29b-41d4-a716-446655440000'
    },
    {
      name: 'With invalid creditId format',
      url: 'http://localhost:3001/api/payments/historical?creditId=invalid-id'
    },
    {
      name: 'With empty creditId',
      url: 'http://localhost:3001/api/payments/historical?creditId='
    },
    {
      name: 'With multiple parameters',
      url: 'http://localhost:3001/api/payments/historical?creditId=550e8400-e29b-41d4-a716-446655440000&extra=param'
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`URL: ${test.url}`);
      
      const response = await fetch(test.url);
      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Response: Array with ${data.length} items`);
        console.log('✅ Test passed\n');
      } else {
        const errorText = await response.text();
        console.log(`Error: ${errorText}`);
        console.log('❌ Test failed\n');
      }
    } catch (error) {
      console.log(`Exception: ${error.message}`);
      console.log('❌ Test failed\n');
    }
  }
  
  console.log('Validation tests completed.');
}

testEndpointValidation();