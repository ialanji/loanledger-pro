// Browser verification test for dashboard interest calculation fix
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDashboardBrowserVerification() {
  try {
    console.log('🌐 DASHBOARD BROWSER VERIFICATION TEST\n');
    
    console.log('1. ✅ Backend Server Status');
    
    // Test server endpoints
    const endpoints = [
      { name: 'Credits', url: 'http://localhost:3001/api/credits' },
      { name: 'Historical Payments', url: 'http://localhost:3001/api/payments/historical' },
      { name: 'Scheduled Payments', url: 'http://localhost:3001/api/payments' },
      { name: 'Credit Totals', url: 'http://localhost:3001/api/credits/totals-by-type' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ ${endpoint.name}: ${Array.isArray(data) ? data.length + ' items' : 'OK'}`);
        } else {
          console.log(`   ❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.name}: ${error.message}`);
      }
    }
    
    console.log('\n2. 📊 Expected Dashboard Values');
    
    // Calculate expected values
    const creditsResponse = await fetch('http://localhost:3001/api/credits');
    const credits = await creditsResponse.json();
    
    const historicalResponse = await fetch('http://localhost:3001/api/payments/historical');
    const historicalPayments = await historicalResponse.json();
    
    // Get total interest from all schedules
    let totalInterestFromAllSchedules = 0;
    for (const credit of credits) {
      try {
        const scheduleResponse = await fetch(`http://localhost:3001/api/credits/${credit.id}/schedule`);
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          totalInterestFromAllSchedules += parseFloat(scheduleData.totals?.totalInterest || 0);
        }
      } catch (error) {
        // Skip if error
      }
    }
    
    const totalPaidInterest = historicalPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.interest_amount) || 0);
    }, 0);
    
    const remainingInterest = Math.max(0, totalInterestFromAllSchedules - totalPaidInterest);
    
    console.log('   Expected values on dashboard:');
    console.log(`   📈 ПРОЦЕНТЫ: ${remainingInterest.toLocaleString()} L`);
    console.log(`   📋 Total Credits: ${credits.length}`);
    console.log(`   📋 Active Credits: ${credits.filter(c => c.status === 'active').length}`);
    
    console.log('\n3. 🔍 Browser Verification Checklist');
    console.log('   Open browser and navigate to: http://localhost:8092/dashboard');
    console.log('   ');
    console.log('   ✅ Check that dashboard loads without errors');
    console.log('   ✅ Check "ПРОЦЕНТЫ" value in "Общая информация по кредитам" section');
    console.log(`   ✅ Should show: ~${Math.round(remainingInterest).toLocaleString()} L`);
    console.log('   ✅ Check browser network tab shows calls to:');
    console.log('      - /api/credits');
    console.log('      - /api/payments/historical (NEW!)');
    console.log('      - /api/payments (for scheduled payments)');
    console.log('      - /api/credits/totals-by-type');
    console.log('      - /api/credits/{id}/schedule (for each credit)');
    console.log('   ');
    console.log('   ❌ Should NOT show the old incorrect value: 2,658,049 L');
    console.log('   ❌ Should NOT show only schedule total: 4,674,433 L');
    
    console.log('\n4. 🧪 Technical Verification');
    console.log('   Open browser console and check for logs:');
    console.log('   - "Fetched historical payments: 32"');
    console.log('   - "SCHEDULE-BASED calculation method"');
    console.log('   - "totalProjectedInterest" value');
    console.log('   - No error messages');
    
    console.log('\n✅ If all checks pass, the dashboard interest calculation fix is complete!');
    
  } catch (error) {
    console.error('❌ Verification test failed:', error.message);
  }
}

testDashboardBrowserVerification();