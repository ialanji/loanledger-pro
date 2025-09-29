const http = require('http');

function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    };

    if (data && method === 'POST') {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testBankingAPI() {
  console.log('Testing Banking API Endpoints...\n');

  // Test health endpoint
  try {
    console.log('1. Testing /api/health');
    const health = await testEndpoint('/api/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.body, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test banks endpoint
  try {
    console.log('2. Testing /api/banks');
    const banks = await testEndpoint('/api/banks');
    console.log(`   Status: ${banks.status}`);
    console.log(`   Response: ${JSON.stringify(banks.body, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test credits endpoint
  try {
    console.log('3. Testing /api/credits');
    const credits = await testEndpoint('/api/credits');
    console.log(`   Status: ${credits.status}`);
    console.log(`   Response: ${JSON.stringify(credits.body, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test create credit endpoint with sample data
  try {
    console.log('4. Testing POST /api/credits');
    const sampleCredit = {
      bank_id: 1,
      credit_amount: 100000,
      interest_rate: 12.5,
      term_months: 24,
      start_date: '2025-01-01',
      credit_type: 'classic',
      grace_period_months: 0
    };
    const createCredit = await testEndpoint('/api/credits', 'POST', sampleCredit);
    console.log(`   Status: ${createCredit.status}`);
    console.log(`   Response: ${JSON.stringify(createCredit.body, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('Banking API testing completed.');
}

testBankingAPI().catch(console.error);