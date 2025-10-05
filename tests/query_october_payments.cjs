#!/usr/bin/env node

require('dotenv').config({ path: 'c:\\site\\loanledger-pro\\.env' });

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function queryOctoberPayments() {
  console.log('Script started');
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT *
      FROM credit_payment
      WHERE credit_id = '2ceff137-41e9-4616-8465-900a76e607ef'
      ORDER BY period_number;
    `;
    
    const result = await client.query(query);
    
    console.log('October 2025 payments for credit:');
    console.log(result.rows);
    
    client.release();
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await pool.end();
  }
}

queryOctoberPayments();