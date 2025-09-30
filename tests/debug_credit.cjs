const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
});

async function checkCreditData() {
  try {
    // Получаем кредит
    const creditResult = await pool.query('SELECT * FROM credits WHERE id = $1', ['a0e3cd5b-b9f9-42b0-9103-4af862a1d9df']);
    const credit = creditResult.rows[0];
    console.log('Credit data:', {
      id: credit.id,
      principal: credit.principal,
      term_months: credit.term_months,
      method: credit.method,
      start_date: credit.start_date,
      deferment_months: credit.deferment_months,
      payment_day: credit.payment_day
    });

    // Получаем ставки
    const ratesResult = await pool.query('SELECT * FROM credit_rates WHERE credit_id = $1 ORDER BY effective_date', [credit.id]);
    console.log('Rates data:', ratesResult.rows.map(r => ({
      rate: r.rate,
      effective_date: r.effective_date
    })));

    // Получаем корректировки
    const adjustmentsResult = await pool.query('SELECT * FROM credit_adjustments WHERE credit_id = $1 ORDER BY effective_date', [credit.id]);
    console.log('Adjustments data:', adjustmentsResult.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCreditData();