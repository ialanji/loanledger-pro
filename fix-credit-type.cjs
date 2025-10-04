/**
 * Fix credit type for GA202503S805/3524/2
 * Changes from 'investment' to 'working_capital'
 */

const {Pool} = require('pg');

const pool = new Pool({
  host: 'backup.nanu.md',
  port: 5433,
  database: 'Finance_NANU',
  user: 'postgres',
  password: 'Nanu4ever'
});

async function fixCreditType() {
  try {
    console.log('\n=== Fixing Credit Type ===\n');
    
    // Check current type
    const before = await pool.query(`
      SELECT contract_number, credit_type
      FROM credits
      WHERE contract_number = 'GA202503S805/3524/2'
    `);
    
    if (before.rows.length === 0) {
      console.log('❌ Credit GA202503S805/3524/2 not found');
      return;
    }
    
    console.log(`Current type: ${before.rows[0].credit_type}`);
    
    if (before.rows[0].credit_type === 'working_capital') {
      console.log('✅ Credit already has correct type (working_capital)');
      return;
    }
    
    // Update type
    await pool.query(`
      UPDATE credits
      SET credit_type = 'working_capital'
      WHERE contract_number = 'GA202503S805/3524/2'
    `);
    
    // Verify update
    const after = await pool.query(`
      SELECT contract_number, credit_type
      FROM credits
      WHERE contract_number = 'GA202503S805/3524/2'
    `);
    
    console.log(`Updated type: ${after.rows[0].credit_type}`);
    console.log('\n✅ Credit type fixed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixCreditType();
