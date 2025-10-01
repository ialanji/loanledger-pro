const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'backup.nanu.md',
  database: 'Finance_NANU',
  password: 'Nanu4ever',
  port: 5433
});

async function debugCredit() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('Database connected successfully:', testResult.rows[0]);
    
    // Check if credit exists
    const creditId = 'aae42c3b-253c-4bd1-be0e-71ec2a48fd4c';
    console.log('\nChecking credit:', creditId);
    
    const creditResult = await pool.query('SELECT * FROM credits WHERE id = $1', [creditId]);
    console.log('Credit data:', JSON.stringify(creditResult.rows, null, 2));
    
    // Check credit_rates
    console.log('\nChecking credit_rates...');
    const ratesResult = await pool.query('SELECT * FROM credit_rates WHERE credit_id = $1', [creditId]);
    console.log('Credit rates:', JSON.stringify(ratesResult.rows, null, 2));
    
    // Check if tables exist
    console.log('\nChecking available tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Available tables:', tablesResult.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugCredit();