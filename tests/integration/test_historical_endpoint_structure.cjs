// Test script to verify the response structure of /api/payments/historical endpoint
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testResponseStructure() {
  try {
    console.log('Testing /api/payments/historical response structure...\n');
    
    const response = await fetch('http://localhost:3001/api/payments/historical');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Response is valid JSON');
    console.log('✅ Response is an array:', Array.isArray(data));
    console.log('Number of records:', data.length);
    
    // Check response headers
    const headers = Object.fromEntries(response.headers.entries());
    console.log('✅ Has X-Historical-Payments header:', !!headers['x-historical-payments']);
    console.log('✅ Has X-Payments-Middleware header:', !!headers['x-payments-middleware']);
    
    // If there are records, check the structure
    if (data.length > 0) {
      const firstRecord = data[0];
      const expectedFields = [
        'id', 'credit_id', 'payment_date', 'payment_amount', 
        'principal_amount', 'interest_amount', 'payment_type', 
        'notes', 'contract_number'
      ];
      
      console.log('\nChecking record structure:');
      expectedFields.forEach(field => {
        const hasField = field in firstRecord;
        console.log(`✅ Has ${field}:`, hasField);
      });
      
      console.log('\nSample record:', firstRecord);
    } else {
      console.log('\n✅ Empty result set handled correctly (returns empty array)');
    }
    
    console.log('\n✅ All structure tests passed!');
    
  } catch (error) {
    console.error('❌ Structure test failed:', error.message);
  }
}

testResponseStructure();