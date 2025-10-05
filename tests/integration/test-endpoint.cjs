const http = require('http');

function testEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/credits/totals-by-type',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    
    console.log(`\nStatus: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log(`\nBody: ${body}`);
      
      if (res.statusCode === 200) {
        try {
          const data = JSON.parse(body);
          console.log('\nParsed response:');
          console.log(JSON.stringify(data, null, 2));
        } catch (e) {
          console.log('Failed to parse JSON');
        }
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.end();
}

console.log('Testing /api/credits/totals-by-type endpoint...');
testEndpoint();
