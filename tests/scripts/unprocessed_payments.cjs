const axios = require('axios');

async function callUnprocessed() {
  try {
    const creditId = '2ceff137-41e9-4616-8465-900a76e607ef';
    const url = `http://localhost:3001/api/credits/${creditId}/payments/unprocessed`;
    console.log(`Calling URL: ${url}`);
    const response = await axios.get(url);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

callUnprocessed();