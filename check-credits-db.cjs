const {Pool} = require('pg');

const pool = new Pool({
  host: 'backup.nanu.md',
  port: 5433,
  database: 'Finance_NANU',
  user: 'postgres',
  password: 'Nanu4ever'
});

async function check() {
  try {
    const result = await pool.query(`
      SELECT contract_number, credit_type, created_at
      FROM credits
      ORDER BY created_at DESC
    `);
    
    console.log('\n=== Credits in Database ===\n');
    result.rows.forEach(credit => {
      console.log(`${credit.contract_number}: ${credit.credit_type}`);
    });
    
    console.log(`\nTotal: ${result.rows.length} credits\n`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
