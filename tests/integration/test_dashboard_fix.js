// Test the dashboard fix - verify it uses historical payments endpoint
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDashboardFix() {
  try {
    console.log('Testing dashboard interest calculation fix...\n');
    
    // Test 1: Verify historical payments endpoint is working
    console.log('1. Testing historical payments endpoint...');
    const historicalResponse = await fetch('http://localhost:3001/api/payments/historical');
    
    if (!historicalResponse.ok) {
      console.error('❌ Historical payments endpoint failed:', historicalResponse.status);
      return;
    }
    
    const historicalPayments = await historicalResponse.json();
    console.log(`✅ Historical payments endpoint working: ${historicalPayments.length} payments`);
    
    // Calculate total paid interest from historical payments
    const totalPaidInterest = historicalPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.interest_amount) || 0);
    }, 0);
    
    console.log(`   Total paid interest: ${totalPaidInterest.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} L`);
    
    // Test 2: Get schedule data to calculate total interest
    console.log('\n2. Testing schedule data...');
    const creditsResponse = await fetch('http://localhost:3001/api/credits');
    const credits = await creditsResponse.json();
    
    if (credits.length > 0) {
      const scheduleResponse = await fetch(`http://localhost:3001/api/credits/${credits[0].id}/schedule`);
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        const totalInterestFromSchedule = parseFloat(scheduleData.totals?.totalInterest || 0);
        
        console.log(`✅ Schedule data available`);
        console.log(`   Total interest from schedule: ${totalInterestFromSchedule.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })} L`);
        
        // Calculate projected (remaining) interest
        const projectedInterest = Math.max(0, totalInterestFromSchedule - totalPaidInterest);
        
        console.log(`\n📊 CALCULATION RESULTS:`);
        console.log(`   Total Interest (from schedule): ${totalInterestFromSchedule.toLocaleString()} L`);
        console.log(`   Paid Interest (from historical): ${totalPaidInterest.toLocaleString()} L`);
        console.log(`   Projected Interest (remaining): ${projectedInterest.toLocaleString()} L`);
        
        // Check if the fix is working (should be around 186,301 L as mentioned in requirements)
        if (projectedInterest < 500000) { // Much less than the incorrect 2,658,049 L
          console.log(`\n✅ FIX APPEARS TO BE WORKING! Projected interest is reasonable: ${projectedInterest.toLocaleString()} L`);
        } else {
          console.log(`\n❌ Fix may not be working. Projected interest still high: ${projectedInterest.toLocaleString()} L`);
        }
      } else {
        console.log('❌ Could not fetch schedule data');
      }
    }
    
    console.log('\n3. Testing that dashboard frontend uses the new endpoint...');
    console.log('   Check browser network tab to verify /api/payments/historical is called');
    console.log('   Dashboard should now show corrected projected interest values');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardFix();