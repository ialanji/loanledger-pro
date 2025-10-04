const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function testDirectInsert() {
  const client = await pool.connect();
  
  try {
    // Get a valid bank_id first
    const bankResult = await client.query('SELECT id FROM banks LIMIT 1');
    if (bankResult.rows.length === 0) {
      console.log('No banks found. Creating a test bank...');
      const newBank = await client.query(`
        INSERT INTO banks (name, code) 
        VALUES ('Test Bank', 'TEST') 
        RETURNING id
      `);
      var bankId = newBank.rows[0].id;
    } else {
      var bankId = bankResult.rows[0].id;
    }
    
    console.log('Using bank ID:', bankId);
    
    // Test 1: Insert with investment type
    console.log('\n=== Test 1: Insert with investment type ===');
    try {
      const result1 = await client.query(`
        INSERT INTO credits (
          contract_number, principal, currency_code, bank_id, method,
          start_date, term_months, credit_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, contract_number, credit_type
      `, [
        `TEST-INV-${Date.now()}`,
        1000000,
        'MDL',
        bankId,
        'classic_annuity',
        '2025-01-15',
        24,
        'investment'
      ]);
      
      console.log('✓ SUCCESS:', result1.rows[0]);
    } catch (err) {
      console.log('✗ FAILED:', err.message);
    }
    
    // Test 2: Insert with working_capital type
    console.log('\n=== Test 2: Insert with working_capital type ===');
    try {
      const result2 = await client.query(`
        INSERT INTO credits (
          contract_number, principal, currency_code, bank_id, method,
          start_date, term_months, credit_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, contract_number, credit_type
      `, [
        `TEST-WC-${Date.now()}`,
        1000000,
        'MDL',
        bankId,
        'classic_annuity',
        '2025-01-15',
        24,
        'working_capital'
      ]);
      
      console.log('✓ SUCCESS:', result2.rows[0]);
    } catch (err) {
      console.log('✗ FAILED:', err.message);
    }
    
    // Test 3: Insert without credit_type (should use default)
    console.log('\n=== Test 3: Insert without credit_type (default) ===');
    try {
      const result3 = await client.query(`
        INSERT INTO credits (
          contract_number, principal, currency_code, bank_id, method,
          start_date, term_months
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, contract_number, credit_type
      `, [
        `TEST-DEF-${Date.now()}`,
        1000000,
        'MDL',
        bankId,
        'classic_annuity',
        '2025-01-15',
        24
      ]);
      
      console.log('✓ SUCCESS:', result3.rows[0]);
    } catch (err) {
      console.log('✗ FAILED:', err.message);
    }
    
    // Test 4: Insert with invalid credit_type (should fail)
    console.log('\n=== Test 4: Insert with invalid credit_type ===');
    try {
      const result4 = await client.query(`
        INSERT INTO credits (
          contract_number, principal, currency_code, bank_id, method,
          start_date, term_months, credit_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, contract_number, credit_type
      `, [
        `TEST-INVALID-${Date.now()}`,
        1000000,
        'MDL',
        bankId,
        'classic_annuity',
        '2025-01-15',
        24,
        'invalid_type'
      ]);
      
      console.log('✗ UNEXPECTED SUCCESS:', result4.rows[0]);
    } catch (err) {
      if (err.message.includes('check constraint')) {
        console.log('✓ CORRECTLY REJECTED:', err.message);
      } else {
        console.log('✗ FAILED WITH UNEXPECTED ERROR:', err.message);
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testDirectInsert();
