// Quick test for the new /api/payments/historical endpoint
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testHistoricalEndpoint() {
  try {
    console.log('Testing /api/payments/historical endpoint...');
    
    const response = await fetch('http://localhost:3001/api/payments/historical');
    
    if (!response.ok) {
      console.error('Error:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('Success! Received', data.length, 'historical payments');
    
    if (data.length > 0) {
      console.log('Sample payment:', JSON.stringify(data[0], null, 2));
      
      // Calculate total interest from historical payments
      const totalInterest = data.reduce((sum, payment) => {
        return sum + (parseFloat(payment.interest_amount) || 0);
      }, 0);
      
      console.log('Total interest from historical payments:', totalInterest.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }), 'L');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testHistoricalEndpoint();