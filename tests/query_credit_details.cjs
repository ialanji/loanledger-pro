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

async function queryCreditDetails() {
  const creditId = '2ceff137-41e9-4616-8465-900a76e607ef';
  try {
    const result = await pool.query(
      `SELECT * FROM credits WHERE id = $1`,
      [creditId]
    );
    if (result.rows.length > 0) {
      console.log('Credit details:', result.rows[0]);
    } else {
      console.log('Credit not found.');
    }
  } catch (err) {
    console.error('Error querying credit:', err);
  } finally {
    await pool.end();
  }
}

queryCreditDetails();