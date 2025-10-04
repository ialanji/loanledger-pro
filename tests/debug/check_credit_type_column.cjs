const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function checkColumn() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'credits' AND column_name = 'credit_type'
    `);
    
    console.log('Credit type column info:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    if (result.rows.length === 0) {
      console.log('\n❌ Column credit_type does NOT exist in credits table');
      console.log('Migration needs to be applied!');
    } else {
      console.log('\n✓ Column credit_type exists');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumn();
