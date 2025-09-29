const http = require('http');

const API_BASE = 'http://localhost:3001';
const TIMEOUT = 10000; // 10 seconds

// Test data for comprehensive testing
const testBankData = {
  name: 'Test Bank Moldova',
  code: 'TBM',
  swift: 'TBMDMD22',
  address: 'str. Test 123, Chisinau',
  phone: '+373 22 123 456',
  website: 'https://testbank.md'
};

const testCreditData = {
  contractNumber: 'CR-TEST-001',
  principal: 100000,
  currencyCode: 'MDL',
  bankId: '', // Will be set after creating a bank
  method: 'CLASSIC_ANNUITY',
  paymentDay: 15,
  startDate: '2024-01-01',
  termMonths: 12,
  defermentMonths: 0,
  initialRate: 12.5,
  rateEffectiveDate: '2024-01-01',
  notes: 'Test credit for API validation'
};

const testFloatingCreditData = {
  contractNumber: 'CR-TEST-002',
  principal: 250000,
  currencyCode: 'USD',
  bankId: '', // Will be set after creating a bank
  method: 'FLOATING_ANNUITY',
  paymentDay: 20,
  startDate: '2024-01-01',
  termMonths: 24,
  defermentMonths: 3,
  initialRate: 8.75,
  rateEffectiveDate: '2024-01-01',
  notes: 'Test floating rate credit',
  rateHistory: [
    {
      annualPercent: 8.75,
      effectiveDate: '2024-01-01',
      note: 'Initial rate'
    },
    {
      annualPercent: 9.25,
      effectiveDate: '2024-06-01',
      note: 'Rate increase'
    }
  ]
};

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUT
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testEndpoint(name, method, path, data = null, expectedStatus = 200) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`   ${method} ${path}`);
  
  if (data) {
    console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
  }

  try {
    const result = await makeRequest(method, path, data);
    
    console.log(`   Status: ${result.status}`);
    
    if (result.parseError) {
      console.log(`   ⚠️  Parse Error: ${result.parseError}`);
      console.log(`   Raw Response: ${result.data}`);
    } else if (result.data) {
      console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
    }

    if (result.status === expectedStatus) {
      console.log(`   ✅ ${name} - SUCCESS`);
      return result;
    } else {
      console.log(`   ❌ ${name} - FAILED (Expected ${expectedStatus}, got ${result.status})`);
      return result;
    }
  } catch (error) {
    console.log(`   ❌ ${name} - ERROR: ${error.message}`);
    return { error: error.message };
  }
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Banking API Tests');
  console.log('=' .repeat(60));

  // Test 1: Health Check
  await testEndpoint('Health Check', 'GET', '/api/health');

  // Test 2: Get Banks (initially empty)
  const banksResult = await testEndpoint('Get Banks (Initial)', 'GET', '/api/banks');

  // Test 3: Create a Bank
  const createBankResult = await testEndpoint('Create Bank', 'POST', '/api/banks', testBankData, 201);
  
  let createdBankId = null;
  if (createBankResult.data && createBankResult.data.id) {
    createdBankId = createBankResult.data.id;
    console.log(`   📝 Created Bank ID: ${createdBankId}`);
  }

  // Test 4: Get Banks (after creation)
  await testEndpoint('Get Banks (After Creation)', 'GET', '/api/banks');

  // Test 5: Get Credits (initially empty)
  await testEndpoint('Get Credits (Initial)', 'GET', '/api/credits');

  if (createdBankId) {
    // Test 6: Create Classic Credit
    testCreditData.bankId = createdBankId;
    const createCreditResult = await testEndpoint('Create Classic Credit', 'POST', '/api/credits', testCreditData, 201);
    
    let createdCreditId = null;
    if (createCreditResult.data && createCreditResult.data.id) {
      createdCreditId = createCreditResult.data.id;
      console.log(`   📝 Created Credit ID: ${createdCreditId}`);
    }

    // Test 7: Create Floating Rate Credit
    testFloatingCreditData.bankId = createdBankId;
    await testEndpoint('Create Floating Credit', 'POST', '/api/credits', testFloatingCreditData, 201);

    // Test 8: Get Credits (after creation)
    await testEndpoint('Get Credits (After Creation)', 'GET', '/api/credits');

    // Test 9: Get specific credit details
    if (createdCreditId) {
      await testEndpoint('Get Credit Details', 'GET', `/api/credits/${createdCreditId}`);
    }
  } else {
    console.log('\n⚠️  Skipping credit tests - no bank created');
  }

  // Test 10: Invalid data tests
  console.log('\n🔍 Testing Error Handling...');
  
  // Invalid bank data
  await testEndpoint('Create Bank (Invalid Data)', 'POST', '/api/banks', { name: '' }, 400);
  
  // Invalid credit data
  await testEndpoint('Create Credit (Invalid Data)', 'POST', '/api/credits', { contractNumber: '' }, 400);
  
  // Non-existent endpoints
  await testEndpoint('Non-existent Endpoint', 'GET', '/api/nonexistent', null, 404);

  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Comprehensive Banking API Tests Completed');
  console.log('=' .repeat(60));
}

// Run the tests
runComprehensiveTests().catch(console.error);