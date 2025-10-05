require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST, 
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function testFixedEndpoint() {
  try {
    console.log('=== TESTING FIXED HISTORICAL PAYMENTS ENDPOINT ===');
    
    // Simulate the fixed endpoint logic
    const whereClauses = [];
    const params = [];
    
    // Always filter for paid payments only
    whereClauses.push(`p.status = 'paid'`);
    
    const where = `WHERE ${whereClauses.join(' AND ')}`;

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
      ${where}
      ORDER BY p.due_date DESC
    `;

    console.log('Executing query:', query);
    console.log('Query params:', params);
    
    const result = await pool.query(query, params);
    
    console.log('Found', result.rows.length, 'historical payments');
    
    // Calculate total paid interest
    const totalPaidInterest = result.rows.reduce((sum, row) => sum + parseFloat(row.interest_amount || 0), 0);
    console.log('Total paid interest:', totalPaidInterest);
    
    // Show first few records
    console.log('First 3 records:');
    result.rows.slice(0, 3).forEach((row, index) => {
      console.log(`${index + 1}. Credit: ${row.credit_id}, Interest: ${row.interest_amount}, Date: ${row.payment_date}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFixedEndpoint();