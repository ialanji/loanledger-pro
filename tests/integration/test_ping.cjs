const axios = require('axios');

async function testPing() {
  try {
    const response = await axios.get('http://localhost:3001/api/payments/ping');
    console.log('Ping response:', response.data);
  } catch (error) {
    console.error('Error pinging server:', error.response ? error.response.data : error.message);
  }
}

testPing();