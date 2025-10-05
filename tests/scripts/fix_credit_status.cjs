require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST, 
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function fixCreditStatus() {
  try {
    console.log('=== CHECKING CREDIT STATUS ===');
    
    // Check current status
    const currentStatus = await pool.query('SELECT id, status, principal FROM credits');
    console.log('Current credit statuses:');
    currentStatus.rows.forEach(row => {
      console.log(`- Credit ${row.id}: Status "${row.status}", Principal ${row.principal}`);
    });
    
    // Update credits with empty status to 'active'
    const updateResult = await pool.query(`
      UPDATE credits 
      SET status = 'active' 
      WHERE status IS NULL OR status = ''
    `);
    
    console.log(`Updated ${updateResult.rowCount} credits to active status`);
    
    // Check updated status
    const updatedStatus = await pool.query('SELECT id, status, principal FROM credits');
    console.log('Updated credit statuses:');
    updatedStatus.rows.forEach(row => {
      console.log(`- Credit ${row.id}: Status "${row.status}", Principal ${row.principal}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixCreditStatus();