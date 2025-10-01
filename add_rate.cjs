const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'backup.nanu.md',
  database: 'Finance_NANU',
  password: 'Nanu4ever',
  port: 5433
});

async function addRate() {
  try {
    console.log('Adding credit rate...');
    
    const creditId = 'aae42c3b-253c-4bd1-be0e-71ec2a48fd4c';
    const rate = 0.1500;
    const effectiveDate = '2025-10-01';
    
    const result = await pool.query(
      'INSERT INTO credit_rates (credit_id, rate, effective_date) VALUES ($1, $2, $3) RETURNING *',
      [creditId, rate, effectiveDate]
    );
    
    console.log('Rate added successfully:', result.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addRate();