const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST, 
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function checkTables() {
  try {
    console.log('=== CHECKING TABLES ===');
    
    // Check if payments table exists and has data
    try {
      const paymentsCount = await pool.query('SELECT COUNT(*) as count FROM payments');
      console.log('payments table count:', paymentsCount.rows[0].count);
    } catch (e) {
      console.log('payments table error:', e.message);
    }
    
    // Check if credit_payment table exists and has data  
    try {
      const creditPaymentCount = await pool.query('SELECT COUNT(*) as count FROM credit_payment');
      console.log('credit_payment table count:', creditPaymentCount.rows[0].count);
    } catch (e) {
      console.log('credit_payment table error:', e.message);
    }
    
    // Check structure of credit_payment
    try {
      const sample = await pool.query("SELECT * FROM credit_payment WHERE status = 'paid' LIMIT 3");
      console.log('Sample credit_payment records:');
      sample.rows.forEach(row => {
        console.log('- ID:', row.id, 'Credit:', row.credit_id, 'Interest:', row.interest_due, 'Status:', row.status);
      });
    } catch (e) {
      console.log('credit_payment sample error:', e.message);
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTables();