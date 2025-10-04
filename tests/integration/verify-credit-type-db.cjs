/**
 * Quick database verification for credit_type column
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'backup.nanu.md',
  port: 5433,
  database: 'Finance_NANU',
  user: 'postgres',
  password: 'Nanu4ever',
});

async function verify() {
  try {
    console.log('Checking credit_type column in database...\n');
    
    // Get credits with credit_type
    const result = await pool.query(`
      SELECT id, contract_number, credit_type
      FROM credits
      LIMIT 5
    `);
    
    console.log(`Found ${result.rows.length} credits:`);
    result.rows.forEach(credit => {
      console.log(`  - ${credit.contract_number}: ${credit.credit_type}`);
    });
    
    console.log('\n✓ Database has credit_type column and data');
    console.log('\nNote: If API is not returning credit_type, the server needs to be restarted.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
