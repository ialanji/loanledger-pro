const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n=== Testing ${path} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (err) => {
      console.error(`Error testing ${path}:`, err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  try {
    await testEndpoint('/api/health');
    await testEndpoint('/api/banks');
    await testEndpoint('/api/credits');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();