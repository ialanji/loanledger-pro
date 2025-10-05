require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST, 
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function testQuery() {
  try {
    console.log('=== TESTING HISTORICAL PAYMENTS QUERY ===');
    
    const query = `
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
      LIMIT 5
    `;

    console.log('Executing query:', query);
    const result = await pool.query(query);
    
    console.log('Found', result.rows.length, 'historical payments');
    console.log('Sample records:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Credit: ${row.credit_id}, Interest: ${row.interest_amount}, Date: ${row.payment_date}`);
    });
    
    // Calculate total paid interest
    const totalPaidInterest = result.rows.reduce((sum, row) => sum + parseFloat(row.interest_amount || 0), 0);
    console.log('Total paid interest from sample:', totalPaidInterest);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testQuery();