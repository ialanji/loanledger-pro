require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST, 
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function checkCreditsStructure() {
  try {
    console.log('=== CHECKING CREDITS TABLE STRUCTURE ===');
    
    // Get table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'credits'
      ORDER BY ordinal_position
    `);
    
    console.log('Credits table columns:');
    structure.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Get sample data
    const sample = await pool.query('SELECT * FROM credits LIMIT 2');
    console.log('\nSample credit records:');
    sample.rows.forEach((row, index) => {
      console.log(`Credit ${index + 1}:`, row);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCreditsStructure();