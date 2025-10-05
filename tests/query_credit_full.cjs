require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
});

async function queryCreditFull() {
  try {
    const res = await pool.query("SELECT * FROM credits WHERE id = '2ceff137-41e9-4616-8465-900a76e607ef'");
    console.log('Credit details:', res.rows[0]);
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await pool.end();
  }
}

queryCreditFull();