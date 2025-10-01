const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkCreditPayment() {
  try {
    const query = `
      SELECT credit_id, period_number, status, payment_date 
      FROM credit_payment 
      WHERE credit_id = 'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df' 
      AND status = 'paid' 
      ORDER BY period_number 
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    console.log('Paid periods in credit_payment table:');
    console.log(result.rows);
    
    // Also check if there are any records at all for this credit
    const allQuery = `
      SELECT credit_id, period_number, status, payment_date 
      FROM credit_payment 
      WHERE credit_id = 'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df' 
      ORDER BY period_number 
      LIMIT 10
    `;
    
    const allResult = await pool.query(allQuery);
    console.log('\nAll periods in credit_payment table for this credit:');
    console.log(allResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCreditPayment();