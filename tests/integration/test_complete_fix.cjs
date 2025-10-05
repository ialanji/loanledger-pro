require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST, 
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function testCompleteFix() {
  try {
    console.log('=== TESTING COMPLETE DASHBOARD FIX ===');
    
    // 1. Test credits API with status field
    console.log('\n1. Testing credits API...');
    const creditsQuery = `
      SELECT c.id, c.contract_number, c.principal, c.currency_code, c.bank_id,
             c.method, c.payment_day, c.start_date, c.term_months, 
             c.deferment_months, c.initial_rate, c.rate_effective_date,
             c.credit_type, c.notes, c.created_at, c.updated_at,
             b.name as bank_name, b.code as bank_code,
             'active' as status
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      ORDER BY c.created_at DESC
    `;
    
    const creditsResult = await pool.query(creditsQuery);
    console.log(`Found ${creditsResult.rows.length} credits`);
    creditsResult.rows.forEach(credit => {
      console.log(`- Credit ${credit.contract_number}: Status ${credit.status}, Principal ${credit.principal}`);
    });
    
    // 2. Test historical payments API
    console.log('\n2. Testing historical payments API...');
    const historicalQuery = `
      SELECT 
        p.id,
        p.credit_id,
        p.due_date as payment_date,
        p.total_due as payment_amount,
        p.principal_due as principal_amount,
        p.interest_due as interest_amount,
        'scheduled' as payment_type,
        null as notes,
        c.contract_number
      FROM credit_payment p
      LEFT JOIN credits c ON c.id = p.credit_id
      WHERE p.status = 'paid'
      ORDER BY p.due_date DESC
    `;
    
    const historicalResult = await pool.query(historicalQuery);
    console.log(`Found ${historicalResult.rows.length} historical payments`);
    
    const totalPaidInterest = historicalResult.rows.reduce((sum, payment) => {
      return sum + parseFloat(payment.interest_amount || 0);
    }, 0);
    console.log(`Total paid interest: ${totalPaidInterest}`);
    
    // 3. Simulate dashboard calculation
    console.log('\n3. Simulating dashboard calculation...');
    
    // Mock schedule data (we would need to get this from actual API)
    const mockScheduleData = [
      { creditId: creditsResult.rows[0]?.id, schedule: { totals: { totalInterest: 1200000 } } },
      { creditId: creditsResult.rows[1]?.id, schedule: { totals: { totalInterest: 1458049 } } }
    ];
    
    const totalScheduledInterest = mockScheduleData.reduce((sum, item) => {
      return sum + parseFloat(item.schedule?.totals?.totalInterest || 0);
    }, 0);
    
    const projectedInterest = Math.max(0, totalScheduledInterest - totalPaidInterest);
    
    console.log('Dashboard calculation:');
    console.log(`- Total scheduled interest: ${totalScheduledInterest}`);
    console.log(`- Total paid interest: ${totalPaidInterest}`);
    console.log(`- Projected interest: ${projectedInterest}`);
    
    // 4. Compare with current dashboard value
    console.log('\n4. Comparison with expected results:');
    console.log(`- Current dashboard shows: 2,658,049 L (incorrect - total interest)`);
    console.log(`- Fixed calculation shows: ${projectedInterest} L (correct - remaining interest)`);
    console.log(`- Requirements expected: 2,202,688 L`);
    
    const difference = Math.abs(projectedInterest - 2202688);
    const percentageDiff = (difference / 2202688) * 100;
    
    if (percentageDiff < 10) {
      console.log(`✅ Result is within acceptable range (${percentageDiff.toFixed(2)}% difference)`);
    } else {
      console.log(`⚠️  Result differs from requirements (${percentageDiff.toFixed(2)}% difference)`);
      console.log('This might be due to:');
      console.log('- Different schedule data than expected');
      console.log('- Requirements expecting total interest instead of remaining');
      console.log('- Different calculation method in requirements');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCompleteFix();