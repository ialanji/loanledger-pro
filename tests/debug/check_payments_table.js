// Check the structure of payments table
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkPaymentsTable() {
  try {
    console.log('Checking payments table structure...');
    
    // Get table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      ORDER BY ordinal_position;
    `;
    
    const structure = await pool.query(structureQuery);
    console.log('\nPayments table columns:');
    structure.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Get sample data
    const sampleQuery = `SELECT * FROM payments LIMIT 3`;
    const sample = await pool.query(sampleQuery);
    
    console.log('\nSample payments data:');
    if (sample.rows.length > 0) {
      console.log(JSON.stringify(sample.rows[0], null, 2));
    } else {
      console.log('No data found in payments table');
    }
    
    // Count total payments
    const countQuery = `SELECT COUNT(*) as total FROM payments`;
    const count = await pool.query(countQuery);
    console.log(`\nTotal payments in table: ${count.rows[0].total}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPaymentsTable();