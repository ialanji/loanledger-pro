const {Pool} = require('pg');

const pool = new Pool({
  host: 'backup.nanu.md',
  port: 5433,
  database: 'Finance_NANU',
  user: 'postgres',
  password: 'Nanu4ever'
});

async function testQuery() {
  try {
    console.log('\n=== Testing totals-by-type query ===\n');
    
    const result = await pool.query(`
      SELECT 
        credit_type,
        COALESCE(SUM(principal), 0) as total
      FROM credits
      GROUP BY credit_type
    `);
    
    console.log('Query result:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Process like the endpoint does
    let investmentTotal = 0;
    let workingCapitalTotal = 0;
    
    result.rows.forEach(row => {
      const total = parseFloat(row.total) || 0;
      console.log(`\nProcessing: ${row.credit_type} = ${row.total} (parsed: ${total})`);
      
      if (row.credit_type === 'investment') {
        investmentTotal = total;
      } else if (row.credit_type === 'working_capital') {
        workingCapitalTotal = total;
      }
    });
    
    const overallTotal = investmentTotal + workingCapitalTotal;
    
    console.log('\n=== Final result ===');
    console.log(JSON.stringify({
      investment: investmentTotal,
      working_capital: workingCapitalTotal,
      total: overallTotal
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testQuery();
