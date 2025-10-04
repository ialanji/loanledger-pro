const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function checkConstraints() {
  try {
    // Check constraints
    const constraintResult = await pool.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'credits' AND con.conname LIKE '%credit_type%'
    `);
    
    console.log('Credit type constraints:');
    console.log(JSON.stringify(constraintResult.rows, null, 2));
    
    // Try to insert a test record with invalid credit_type
    console.log('\n--- Testing validation ---');
    try {
      await pool.query(`
        INSERT INTO credits (
          contract_number, principal, currency_code, bank_id, method,
          start_date, term_months, credit_type
        ) VALUES (
          'TEST-INVALID', 100000, 'MDL', 1, 'classic_annuity',
          '2025-01-01', 12, 'invalid_type'
        )
      `);
      console.log('❌ Invalid credit_type was accepted (constraint missing!)');
    } catch (err) {
      if (err.message.includes('violates check constraint')) {
        console.log('✓ CHECK constraint is working');
      } else {
        console.log('Error:', err.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();
