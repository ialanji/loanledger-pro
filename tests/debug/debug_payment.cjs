const axios = require('axios');

async function debugPayment() {
  try {
    const response = await axios.get('http://localhost:3001/api/debug/credit/GA202503S805%2F3524%2F2/payments');
    console.log('Debug response:', response.data);
  } catch (error) {
    console.error('Error fetching debug info:', error.response ? error.response.data : error.message);
  }
}

debugPayment();