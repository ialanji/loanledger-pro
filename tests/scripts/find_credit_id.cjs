const dotenv = require('dotenv');
dotenv.config();

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
});

async function findCreditId() {
  try {
    const result = await pool.query(
      "SELECT id, contract_number FROM credits WHERE contract_number LIKE '%3524/27' ORDER BY contract_number"
    );
    console.log('Found credits:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, Contract: ${row.contract_number}`);
    });
    if (result.rows.length === 0) {
      console.log('No matching credits found.');
    }
  } catch (err) {
    console.error('Error querying credits:', err);
  } finally {
    await pool.end();
  }
}

findCreditId();