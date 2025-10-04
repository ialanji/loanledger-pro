const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function fixConstraint() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Dropping existing constraint...');
    await client.query(`
      ALTER TABLE credits 
      DROP CONSTRAINT IF EXISTS credits_credit_type_check
    `);
    
    console.log('Adding correct constraint with lowercase values...');
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
    // First update any NULL values
    await client.query(`
      UPDATE credits 
      SET credit_type = 'investment' 
      WHERE credit_type IS NULL
    `);
    
    await client.query(`
      ALTER TABLE credits 
      ALTER COLUMN credit_type SET NOT NULL
    `);
    
    await client.query('COMMIT');
    console.log('\n✓ Constraint fixed successfully!');
    
    // Verify
    console.log('\nVerifying constraint...');
    const result = await pool.query(`
      SELECT pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'credits' AND con.conname = 'credits_credit_type_check'
    `);
    
    console.log('New constraint:', result.rows[0]?.definition);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraint();
