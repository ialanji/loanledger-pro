const API_BASE = 'http://localhost:3001';

async function testCreditCreation() {
  console.log('🧪 Testing Credit Creation with Existing Banks...\n');

  try {
    // First, get existing banks
    console.log('📋 Getting existing banks...');
    const banksResponse = await fetch(`${API_BASE}/api/banks`);
    const banks = await banksResponse.json();
    
    if (banks.length === 0) {
      console.log('❌ No banks found. Creating a test bank first...');
      
      const bankResponse = await fetch(`${API_BASE}/api/banks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Bank for Credits',
          code: 'TESTBANK',
          country: 'RU',
          currencyCode: 'RUB'
        })
      });
      
      if (bankResponse.ok) {
        const newBank = await bankResponse.json();
        banks.push(newBank);
        console.log('✅ Test bank created:', newBank.name);
      } else {
        console.log('❌ Failed to create test bank');
        return;
      }
    }

    const testBank = banks[0];
    console.log(`📋 Using bank: ${testBank.name} (ID: ${testBank.id})\n`);

    // Test 1: Create Classic Credit
    console.log('🧪 Testing Create Classic Credit...');
    const classicCreditData = {
      contractNumber: 'CR-CLASSIC-001',
      principal: 500000,
      currencyCode: 'RUB',
      bankId: testBank.id,
      method: 'CLASSIC_ANNUITY',
      paymentDay: 15,
      startDate: '2024-01-01',
      termMonths: 36,
      defermentMonths: 0,
      initialRate: 12.5,
      rateEffectiveDate: '2024-01-01',
      notes: 'Test classic credit'
    };

    const classicResponse = await fetch(`${API_BASE}/api/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classicCreditData)
    });

    console.log(`   Status: ${classicResponse.status}`);
    const classicResult = await classicResponse.json();
    console.log('   Response:', JSON.stringify(classicResult, null, 2));
    
    if (classicResponse.status === 201) {
      console.log('   ✅ Create Classic Credit - SUCCESS\n');
    } else {
      console.log('   ❌ Create Classic Credit - FAILED\n');
    }

    // Test 2: Create Floating Credit
    console.log('🧪 Testing Create Floating Credit...');
    const floatingCreditData = {
      contractNumber: 'CR-FLOATING-001',
      principal: 750000,
      currencyCode: 'RUB',
      bankId: testBank.id,
      method: 'FLOATING_ANNUITY',
      paymentDay: 20,
      startDate: '2024-01-01',
      termMonths: 24,
      defermentMonths: 3,
      initialRate: 8.75,
      rateEffectiveDate: '2024-01-01',
      notes: 'Test floating rate credit',
      rateHistory: [
        {
          annualPercent: 8.75,
          effectiveDate: '2024-01-01',
          note: 'Initial rate'
        },
        {
          annualPercent: 9.25,
          effectiveDate: '2024-06-01',
          note: 'Rate increase'
        }
      ]
    };

    const floatingResponse = await fetch(`${API_BASE}/api/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(floatingCreditData)
    });

    console.log(`   Status: ${floatingResponse.status}`);
    const floatingResult = await floatingResponse.json();
    console.log('   Response:', JSON.stringify(floatingResult, null, 2));
    
    if (floatingResponse.status === 201) {
      console.log('   ✅ Create Floating Credit - SUCCESS\n');
    } else {
      console.log('   ❌ Create Floating Credit - FAILED\n');
    }

    // Test 3: Get all credits
    console.log('🧪 Testing Get All Credits...');
    const creditsResponse = await fetch(`${API_BASE}/api/credits`);
    const credits = await creditsResponse.json();
    
    console.log(`   Status: ${creditsResponse.status}`);
    console.log(`   Found ${credits.length} credits`);
    
    if (credits.length > 0) {
      console.log('   Sample credit:', JSON.stringify(credits[0], null, 2));
      console.log('   ✅ Get All Credits - SUCCESS');
    } else {
      console.log('   ⚠️  No credits found');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testCreditCreation();