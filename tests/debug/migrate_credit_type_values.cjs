const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function migrateValues() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Checking current credit_type values...');
    const checkResult = await client.query(`
      SELECT credit_type, COUNT(*) as count
      FROM credits
      GROUP BY credit_type
    `);
    
    console.log('Current values:');
    console.log(checkResult.rows);
    
    console.log('\nDropping old constraint first...');
    await client.query(`
      ALTER TABLE credits 
      DROP CONSTRAINT IF EXISTS credits_credit_type_check
    `);
    
    console.log('Updating INVESTMENT to investment...');
    const result1 = await client.query(`
      UPDATE credits 
      SET credit_type = 'investment' 
      WHERE credit_type = 'INVESTMENT'
    `);
    console.log(`Updated ${result1.rowCount} rows`);
    
    console.log('Updating WORKING_CAPITAL to working_capital...');
    const result2 = await client.query(`
      UPDATE credits 
      SET credit_type = 'working_capital' 
      WHERE credit_type = 'WORKING_CAPITAL'
    `);
    console.log(`Updated ${result2.rowCount} rows`);
    
    console.log('Updating NULL to investment...');
    const result3 = await client.query(`
      UPDATE credits 
      SET credit_type = 'investment' 
      WHERE credit_type IS NULL
    `);
    console.log(`Updated ${result3.rowCount} rows`);
    
    console.log('Adding new constraint with lowercase values...');
    await client.query(`
      ALTER TABLE credits 
      ADD CONSTRAINT credits_credit_type_check 
      CHECK (credit_type IN ('investment', 'working_capital'))
    `);
    
    console.log('Setting default value...');
    await client.query(`
      ALTER TABLE credits 
      ALTER COLUMN credit_type SET DEFAULT 'investment'
    `);
    
    console.log('Setting NOT NULL constraint...');
    await client.query(`
      ALTER TABLE credits 
      ALTER COLUMN credit_type SET NOT NULL
    `);
    
    await client.query('COMMIT');
    console.log('\n✓ Migration completed successfully!');
    
    // Verify
    console.log('\nVerifying final state...');
    const finalResult = await pool.query(`
      SELECT credit_type, COUNT(*) as count
      FROM credits
      GROUP BY credit_type
    `);
    
    console.log('Final values:');
    console.log(finalResult.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateValues();
