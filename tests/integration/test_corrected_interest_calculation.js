// Test the corrected interest calculation - should show total interest from all schedules
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testCorrectedInterestCalculation() {
  try {
    console.log('Testing corrected interest calculation (total from all schedules)...\n');
    
    // Get all credits
    console.log('1. Fetching all credits...');
    const creditsResponse = await fetch('http://localhost:3001/api/credits');
    const credits = await creditsResponse.json();
    console.log(`✅ Found ${credits.length} credits`);
    
    // Get schedule data for each credit
    console.log('\n2. Fetching schedule data for each credit...');
    let totalInterestFromAllSchedules = 0;
    
    for (const credit of credits) {
      try {
        const scheduleResponse = await fetch(`http://localhost:3001/api/credits/${credit.id}/schedule`);
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          const creditInterest = parseFloat(scheduleData.totals?.totalInterest || 0);
          totalInterestFromAllSchedules += creditInterest;
          
          console.log(`   Credit ${credit.contractNumber}: ${creditInterest.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} L`);
        } else {
          console.log(`   ❌ Could not fetch schedule for credit ${credit.contractNumber}`);
        }
      } catch (error) {
        console.log(`   ❌ Error fetching schedule for credit ${credit.contractNumber}:`, error.message);
      }
    }
    
    console.log(`\n📊 TOTAL INTEREST FROM ALL SCHEDULES: ${totalInterestFromAllSchedules.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} L`);
    
    // Check if this matches the expected value
    const expectedValue = 2202688; // Expected value from requirements
    const tolerance = 50000; // Allow some tolerance
    
    if (Math.abs(totalInterestFromAllSchedules - expectedValue) <= tolerance) {
      console.log(`\n✅ SUCCESS! Total interest (${totalInterestFromAllSchedules.toLocaleString()} L) is close to expected value (${expectedValue.toLocaleString()} L)`);
    } else {
      console.log(`\n⚠️  Total interest (${totalInterestFromAllSchedules.toLocaleString()} L) differs from expected value (${expectedValue.toLocaleString()} L)`);
      console.log(`   Difference: ${Math.abs(totalInterestFromAllSchedules - expectedValue).toLocaleString()} L`);
    }
    
    // Test historical payments for comparison
    console.log('\n3. Checking historical payments for reference...');
    const historicalResponse = await fetch('http://localhost:3001/api/payments/historical');
    const historicalPayments = await historicalResponse.json();
    
    const totalPaidInterest = historicalPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.interest_amount) || 0);
    }, 0);
    
    console.log(`   Total paid interest: ${totalPaidInterest.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} L`);
    
    const remainingInterest = totalInterestFromAllSchedules - totalPaidInterest;
    console.log(`   Remaining interest to pay: ${remainingInterest.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} L`);
    
    console.log('\n4. Dashboard should now show:');
    console.log(`   ПРОЦЕНТЫ (total): ${totalInterestFromAllSchedules.toLocaleString()} L`);
    console.log('   This represents the total interest cost over the life of all credits');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCorrectedInterestCalculation();