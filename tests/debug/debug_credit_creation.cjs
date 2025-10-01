const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

// Database connection using environment variables
const pool = new Pool({
  user: process.env.POSTGRES_USER || process.env.DB_USER,
  host: process.env.POSTGRES_HOST || process.env.DB_HOST,
  database: process.env.POSTGRES_DATABASE || process.env.DB_NAME,
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT),
});

async function debugCreditCreation() {
  console.log('🔍 Debugging Credit Creation...\n');

  try {
    // First, check if we have any banks
    console.log('1. Checking available banks...');
    const banksResult = await pool.query('SELECT id, name FROM banks ORDER BY name');
    console.log(`   Found ${banksResult.rows.length} banks:`);
    banksResult.rows.forEach(bank => {
      console.log(`   - ${bank.name} (ID: ${bank.id})`);
    });

    if (banksResult.rows.length === 0) {
      console.log('   Creating a test bank...');
      const bankResult = await pool.query(`
        INSERT INTO banks (name, code, country, currency_code)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name
      `, ['Test Bank', 'TESTBANK', 'MD', 'MDL']);
      console.log(`   Created bank: ${bankResult.rows[0].name} (ID: ${bankResult.rows[0].id})`);
      banksResult.rows.push(bankResult.rows[0]);
    }

    const testBank = banksResult.rows[0];
    console.log(`\n2. Using bank: ${testBank.name} (ID: ${testBank.id})`);

    // Check credits table structure
    console.log('\n3. Checking credits table structure...');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'credits'
      ORDER BY ordinal_position
    `);
    console.log('   Credits table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Test credit creation with minimal data
    console.log('\n4. Testing credit creation with minimal data...');
    const testCreditData = {
      contractNumber: 'TEST-' + Date.now(),
      principal: 100000,
      currencyCode: 'MDL',
      bankId: testBank.id,
      method: 'fixed',
      startDate: '2024-01-01',
      termMonths: 12
    };

    console.log('   Test data:', JSON.stringify(testCreditData, null, 2));

    // Simulate the API call logic
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        contractNumber,
        principal,
        currencyCode,
        bankId,
        method,
        paymentDay,
        startDate,
        termMonths,
        defermentMonths,
        initialRate,
        rateEffectiveDate,
        notes
      } = testCreditData;

      console.log('\n5. Executing INSERT query...');
      const creditResult = await client.query(`
        INSERT INTO credits (
          contract_number, principal, currency_code, bank_id, method, 
          payment_day, start_date, term_months, deferment_months, 
          initial_rate, rate_effective_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        contractNumber, principal, currencyCode, bankId, method,
        paymentDay || null, startDate, termMonths, defermentMonths || 0,
        initialRate || null, rateEffectiveDate || null, notes || null
      ]);

      console.log('   ✅ Credit created successfully!');
      console.log('   Created credit:', JSON.stringify(creditResult.rows[0], null, 2));

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('   ❌ Error during credit creation:', error);
      console.error('   Error code:', error.code);
      console.error('   Error detail:', error.detail);
      console.error('   Error hint:', error.hint);
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  } finally {
    await pool.end();
  }
}

debugCreditCreation();