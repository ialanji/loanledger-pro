// Final test for dashboard interest calculation fix
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFinalDashboardFix() {
  try {
    console.log('🧪 FINAL TEST: Dashboard Interest Calculation Fix\n');
    
    // Get all credits
    const creditsResponse = await fetch('http://localhost:3001/api/credits');
    const credits = await creditsResponse.json();
    console.log(`📋 Found ${credits.length} credits`);
    
    // Get schedule data for all credits
    let totalInterestFromAllSchedules = 0;
    console.log('\n📊 Schedule Data:');
    
    for (const credit of credits) {
      try {
        const scheduleResponse = await fetch(`http://localhost:3001/api/credits/${credit.id}/schedule`);
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          const creditInterest = parseFloat(scheduleData.totals?.totalInterest || 0);
          totalInterestFromAllSchedules += creditInterest;
          
          console.log(`   ${credit.contractNumber}: ${creditInterest.toLocaleString()} L`);
        }
      } catch (error) {
        console.log(`   ❌ Error for ${credit.contractNumber}: ${error.message}`);
      }
    }
    
    console.log(`   ➡️  TOTAL: ${totalInterestFromAllSchedules.toLocaleString()} L`);
    
    // Get historical payments
    const historicalResponse = await fetch('http://localhost:3001/api/payments/historical');
    const historicalPayments = await historicalResponse.json();
    
    const totalPaidInterest = historicalPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.interest_amount) || 0);
    }, 0);
    
    console.log(`\n💰 Historical Payments:`);
    console.log(`   Paid Interest: ${totalPaidInterest.toLocaleString()} L`);
    
    // Calculate remaining interest (what should be shown on dashboard)
    const remainingInterest = Math.max(0, totalInterestFromAllSchedules - totalPaidInterest);
    
    console.log(`\n🎯 FINAL CALCULATION:`);
    console.log(`   Total Interest (all schedules): ${totalInterestFromAllSchedules.toLocaleString()} L`);
    console.log(`   Minus Paid Interest:           -${totalPaidInterest.toLocaleString()} L`);
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   REMAINING INTEREST:             ${remainingInterest.toLocaleString()} L`);
    
    // Check against expected value
    const expectedValue = 2202688;
    const difference = Math.abs(remainingInterest - expectedValue);
    
    if (difference <= 100) { // Allow small rounding differences
      console.log(`\n✅ SUCCESS! Remaining interest (${remainingInterest.toLocaleString()} L) matches expected value (${expectedValue.toLocaleString()} L)`);
      console.log(`   Difference: ${difference.toLocaleString()} L (within tolerance)`);
    } else {
      console.log(`\n⚠️  Remaining interest (${remainingInterest.toLocaleString()} L) differs from expected (${expectedValue.toLocaleString()} L)`);
      console.log(`   Difference: ${difference.toLocaleString()} L`);
    }
    
    console.log(`\n🖥️  Dashboard should now display:`);
    console.log(`   ПРОЦЕНТЫ: ${remainingInterest.toLocaleString()} L`);
    console.log(`   (This represents remaining interest to be paid)`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFinalDashboardFix();