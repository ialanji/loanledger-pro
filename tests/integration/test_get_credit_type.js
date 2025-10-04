/**
 * Simple test to verify GET endpoints return credit_type
 * Run this after restarting the server
 */

const BASE_URL = 'http://localhost:3001';

async function testGetAllCredits() {
  console.log('\n=== Testing GET /api/credits ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/credits`);
    const credits = await response.json();
    
    if (credits.length === 0) {
      console.log('⚠ No credits found in database');
      return;
    }
    
    const firstCredit = credits[0];
    console.log('First credit:', {
      id: firstCredit.id,
      contract_number: firstCredit.contract_number,
      credit_type: firstCredit.credit_type
    });
    
    if (firstCredit.credit_type) {
      console.log('✓ PASS: credit_type is included in GET /api/credits response');
    } else {
      console.log('✗ FAIL: credit_type is missing from GET /api/credits response');
    }
    
    return firstCredit.id;
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

async function testGetSingleCredit(creditId) {
  console.log('\n=== Testing GET /api/credits/:id ===');
  
  if (!creditId) {
    console.log('⚠ No credit ID to test');
    return;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/credits/${creditId}`);
    const credit = await response.json();
    
    console.log('Credit:', {
      id: credit.id,
      contract_number: credit.contract_number,
      credit_type: credit.credit_type
    });
    
    if (credit.credit_type) {
      console.log('✓ PASS: credit_type is included in GET /api/credits/:id response');
    } else {
      console.log('✗ FAIL: credit_type is missing from GET /api/credits/:id response');
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

async function runTests() {
  console.log('========================================');
  console.log('GET Endpoints Credit Type Test');
  console.log('========================================');
  console.log('\nNOTE: Make sure the server has been restarted after code changes!\n');
  
  const creditId = await testGetAllCredits();
  await testGetSingleCredit(creditId);
  
  console.log('\n========================================');
  console.log('Tests completed');
  console.log('========================================\n');
}

runTests();
