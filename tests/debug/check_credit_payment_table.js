// Check the structure of credit_payment table
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

async function checkCreditPaymentTable() {
  try {
    console.log('Checking credit_payment table structure...');
    
    // Get table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'credit_payment' 
      ORDER BY ordinal_position;
    `;
    
    const structure = await pool.query(structureQuery);
    console.log('\nCredit_payment table columns:');
    structure.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Count total payments by status
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM credit_payment 
      GROUP BY status 
      ORDER BY count DESC
    `;
    const statusCount = await pool.query(statusQuery);
    
    console.log('\nPayments by status:');
    statusCount.rows.forEach(row => {
      console.log(`- ${row.status}: ${row.count}`);
    });
    
    // Get sample paid payment
    const sampleQuery = `
      SELECT * FROM credit_payment 
      WHERE status = 'paid' 
      LIMIT 1
    `;
    const sample = await pool.query(sampleQuery);
    
    console.log('\nSample paid payment:');
    if (sample.rows.length > 0) {
      console.log(JSON.stringify(sample.rows[0], null, 2));
    } else {
      console.log('No paid payments found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCreditPaymentTable();