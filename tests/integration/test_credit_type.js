/**
 * Integration test for credit type classification feature
 * Tests POST /api/credits endpoint with creditType support
 */

const BASE_URL = 'http://localhost:3001';

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  
  return { status: response.status, data };
}

// Get a valid bank ID first
let validBankId = null;

async function getValidBankId() {
  if (validBankId) return validBankId;
  
  const result = await apiCall('/api/banks', 'GET');
  if (result.status === 200 && result.data.length > 0) {
    validBankId = result.data[0].id;
    return validBankId;
  }
  throw new Error('No banks found in database');
}

// Test data
const getBaseCreditData = async () => {
  const bankId = await getValidBankId();
  return {
    contractNumber: `CR-TEST-${Date.now()}`,
    principal: 5000000,
    currencyCode: 'MDL',
    bankId: bankId,
    method: 'classic_annuity',
    paymentDay: 15,
    startDate: '2025-01-15',
    termMonths: 24,
    defermentMonths: 0,
    initialRate: 8.5,
    rateEffectiveDate: '2025-01-15',
    notes: 'Test credit for credit type validation'
  };
};

// Test 1: Create credit with investment type
async function testCreateWithInvestmentType() {
  console.log('\n=== Test 1: Create credit with investment type ===');
  
  const baseCreditData = await getBaseCreditData();
  const creditData = {
    ...baseCreditData,
    contractNumber: `CR-INV-${Date.now()}`,
    creditType: 'investment'
  };
  
  const result = await apiCall('/api/credits', 'POST', creditData);
  
  if (result.status === 201 && result.data.credit_type === 'investment') {
    console.log('✓ PASS: Credit created with investment type');
    console.log('  Credit ID:', result.data.id);
    console.log('  Credit Type:', result.data.credit_type);
    return result.data.id;
  } else {
    console.log('✗ FAIL: Expected status 201 and credit_type "investment"');
    console.log('  Status:', result.status);
    console.log('  Response:', result.data);
    return null;
  }
}

// Test 2: Create credit with working_capital type
async function testCreateWithWorkingCapitalType() {
  console.log('\n=== Test 2: Create credit with working_capital type ===');
  
  const baseCreditData = await getBaseCreditData();
  const creditData = {
    ...baseCreditData,
    contractNumber: `CR-WC-${Date.now()}`,
    creditType: 'working_capital'
  };
  
  const result = await apiCall('/api/credits', 'POST', creditData);
  
  if (result.status === 201 && result.data.credit_type === 'working_capital') {
    console.log('✓ PASS: Credit created with working_capital type');
    console.log('  Credit ID:', result.data.id);
    console.log('  Credit Type:', result.data.credit_type);
    return result.data.id;
  } else {
    console.log('✗ FAIL: Expected status 201 and credit_type "working_capital"');
    console.log('  Status:', result.status);
    console.log('  Response:', result.data);
    return null;
  }
}

// Test 3: Create credit without creditType (should default to investment)
async function testCreateWithoutCreditType() {
  console.log('\n=== Test 3: Create credit without creditType (default) ===');
  
  const baseCreditData = await getBaseCreditData();
  const creditData = {
    ...baseCreditData,
    contractNumber: `CR-DEF-${Date.now()}`
    // No creditType specified
  };
  
  const result = await apiCall('/api/credits', 'POST', creditData);
  
  if (result.status === 201 && result.data.credit_type === 'investment') {
    console.log('✓ PASS: Credit created with default investment type');
    console.log('  Credit ID:', result.data.id);
    console.log('  Credit Type:', result.data.credit_type);
    return result.data.id;
  } else {
    console.log('✗ FAIL: Expected status 201 and default credit_type "investment"');
    console.log('  Status:', result.status);
    console.log('  Response:', result.data);
    return null;
  }
}

// Test 4: Create credit with invalid creditType (should return 400)
async function testCreateWithInvalidCreditType() {
  console.log('\n=== Test 4: Create credit with invalid creditType ===');
  
  const baseCreditData = await getBaseCreditData();
  const creditData = {
    ...baseCreditData,
    contractNumber: `CR-INV-${Date.now()}`,
    creditType: 'invalid_type'
  };
  
  const result = await apiCall('/api/credits', 'POST', creditData);
  
  if (result.status === 400 && result.data.error) {
    console.log('✓ PASS: Invalid credit type rejected with 400 error');
    console.log('  Error message:', result.data.error);
    return true;
  } else {
    console.log('✗ FAIL: Expected status 400 with error message');
    console.log('  Status:', result.status);
    console.log('  Response:', result.data);
    return false;
  }
}

// Test 5: Verify credit_type is included in response
async function testCreditTypeInResponse(creditId) {
  console.log('\n=== Test 5: Verify credit_type in GET response ===');
  
  if (!creditId) {
    console.log('✗ SKIP: No credit ID provided');
    return false;
  }
  
  const result = await apiCall(`/api/credits/${creditId}`, 'GET');
  
  if (result.status === 200 && result.data.credit_type) {
    console.log('✓ PASS: credit_type included in GET response');
    console.log('  Credit Type:', result.data.credit_type);
    return true;
  } else {
    console.log('✗ FAIL: credit_type not found in response');
    console.log('  Status:', result.status);
    console.log('  Response:', result.data);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('========================================');
  console.log('Credit Type Classification - API Tests');
  console.log('========================================');
  
  try {
    // Test creating credits with different types
    const investmentId = await testCreateWithInvestmentType();
    const workingCapitalId = await testCreateWithWorkingCapitalType();
    const defaultId = await testCreateWithoutCreditType();
    
    // Test validation
    await testCreateWithInvalidCreditType();
    
    // Test response includes credit_type
    if (investmentId) {
      await testCreditTypeInResponse(investmentId);
    }
    
    // Test updating credit type
    await testUpdateCreditTypeWithoutPayments();
    await testUpdateCreditTypeWithPayments();
    await testUpdateCreditTypeWithInvalidValue();
    
    console.log('\n========================================');
    console.log('Tests completed');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n✗ Test execution failed:', error.message);
    console.error(error);
  }
}

// Execute tests
runTests();

// Test 6: Update credit type when no payments exist
async function testUpdateCreditTypeWithoutPayments() {
  console.log('\n=== Test 6: Update credit type when no payments exist ===');
  
  // First create a credit with investment type
  const baseCreditData = await getBaseCreditData();
  const creditData = {
    ...baseCreditData,
    contractNumber: `CR-UPD-${Date.now()}`,
    creditType: 'investment'
  };
  
  const createResult = await apiCall('/api/credits', 'POST', creditData);
  
  if (createResult.status !== 201) {
    console.log('✗ FAIL: Could not create test credit');
    return false;
  }
  
  const creditId = createResult.data.id;
  console.log('  Created credit ID:', creditId);
  
  // Now update the credit type to working_capital
  const updateData = {
    creditType: 'working_capital',
    notes: 'Updated credit type'
  };
  
  const updateResult = await apiCall(`/api/credits/${creditId}`, 'PUT', updateData);
  
  if (updateResult.status === 200 && updateResult.data.credit_type === 'working_capital') {
    console.log('✓ PASS: Credit type updated successfully');
    console.log('  New Credit Type:', updateResult.data.credit_type);
    return creditId;
  } else {
    console.log('✗ FAIL: Expected status 200 and credit_type "working_capital"');
    console.log('  Status:', updateResult.status);
    console.log('  Response:', updateResult.data);
    return null;
  }
}

// Test 7: Attempt to update credit type when payments exist (should fail)
async function testUpdateCreditTypeWithPayments() {
  console.log('\n=== Test 7: Attempt to update credit type when payments exist ===');
  
  // First create a credit
  const baseCreditData = await getBaseCreditData();
  const creditData = {
    ...baseCreditData,
    contractNumber: `CR-PAY-${Date.now()}`,
    creditType: 'investment'
  };
  
  const createResult = await apiCall('/api/credits', 'POST', creditData);
  
  if (createResult.status !== 201) {
    console.log('✗ FAIL: Could not create test credit');
    return false;
  }
  
  const creditId = createResult.data.id;
  console.log('  Created credit ID:', creditId);
  
  // Create a payment for this credit
  const paymentData = {
    credit_id: creditId,
    due_date: '2025-02-15',
    period_number: 1,
    principal_due: 200000,
    interest_due: 35000,
    total_due: 235000,
    status: 'scheduled'
  };
  
  const paymentResult = await apiCall('/api/payments', 'POST', paymentData);
  
  if (paymentResult.status !== 201) {
    console.log('  Warning: Could not create test payment, skipping test');
    return false;
  }
  
  console.log('  Created payment for credit');
  
  // Now attempt to update the credit type (should fail)
  const updateData = {
    creditType: 'working_capital',
    notes: 'Attempting to update credit type'
  };
  
  const updateResult = await apiCall(`/api/credits/${creditId}`, 'PUT', updateData);
  
  if (updateResult.status === 400 && updateResult.data.error && 
      updateResult.data.error.includes('Cannot change credit type when payments exist')) {
    console.log('✓ PASS: Credit type update correctly prevented when payments exist');
    console.log('  Error message:', updateResult.data.error);
    return true;
  } else {
    console.log('✗ FAIL: Expected status 400 with appropriate error message');
    console.log('  Status:', updateResult.status);
    console.log('  Response:', updateResult.data);
    return false;
  }
}

// Test 8: Update credit type with invalid value (should fail)
async function testUpdateCreditTypeWithInvalidValue() {
  console.log('\n=== Test 8: Update credit type with invalid value ===');
  
  // First create a credit
  const baseCreditData = await getBaseCreditData();
  const creditData = {
    ...baseCreditData,
    contractNumber: `CR-INVUPD-${Date.now()}`,
    creditType: 'investment'
  };
  
  const createResult = await apiCall('/api/credits', 'POST', creditData);
  
  if (createResult.status !== 201) {
    console.log('✗ FAIL: Could not create test credit');
    return false;
  }
  
  const creditId = createResult.data.id;
  console.log('  Created credit ID:', creditId);
  
  // Attempt to update with invalid credit type
  const updateData = {
    creditType: 'invalid_type',
    notes: 'Attempting invalid update'
  };
  
  const updateResult = await apiCall(`/api/credits/${creditId}`, 'PUT', updateData);
  
  if (updateResult.status === 400 && updateResult.data.error) {
    console.log('✓ PASS: Invalid credit type correctly rejected');
    console.log('  Error message:', updateResult.data.error);
    return true;
  } else {
    console.log('✗ FAIL: Expected status 400 with error message');
    console.log('  Status:', updateResult.status);
    console.log('  Response:', updateResult.data);
    return false;
  }
}
