const { Pool } = require('pg');
require('dotenv').config();

async function insertSampleData() {
  console.log('Добавляем тестовые данные в базу данных...');
  
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Подключение к базе данных успешно!');
    
    // Добавляем банк
    console.log('Добавляем банк...');
    const bankResult = await client.query(`
      INSERT INTO banks (id, name, code, country, currency_code, contact_info, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (code) DO NOTHING
      RETURNING id
    `, [
      '550e8400-e29b-41d4-a716-446655440000',
      'Тестовый Банк',
      'TEST_BANK',
      'Россия',
      'RUB',
      JSON.stringify({
        phone: '+7 (495) 123-45-67',
        email: 'info@testbank.ru',
        address: 'г. Москва, ул. Тестовая, д. 1'
      }),
      'Тестовый банк для демонстрации'
    ]);
    
    if (bankResult.rows.length > 0) {
      console.log('✅ Банк добавлен');
    } else {
      console.log('ℹ️ Банк уже существует');
    }
    
    // Добавляем кредит
    console.log('Добавляем кредит...');
    const creditResult = await client.query(`
      INSERT INTO credits (
        id, contract_number, principal, currency_code, bank_id, 
        method, payment_day, start_date, term_months, deferment_months, 
        initial_rate, rate_effective_date, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (contract_number) DO NOTHING
      RETURNING id
    `, [
      'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df',
      'GA202503S805/3524/2',
      1000000.00,
      'RUB',
      '550e8400-e29b-41d4-a716-446655440000',
      'fixed',
      20,
      '2025-01-01',
      36,
      0,
      0.1200,
      '2025-01-01',
      'Тестовый кредит для демонстрации'
    ]);
    
    if (creditResult.rows.length > 0) {
      console.log('✅ Кредит добавлен');
    } else {
      console.log('ℹ️ Кредит уже существует');
    }
    
    // Добавляем ставку кредита
    console.log('Добавляем ставку кредита...');
    await client.query(`
      INSERT INTO credit_rates (credit_id, rate, effective_date, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (credit_id, effective_date) DO NOTHING
    `, [
      'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df',
      0.1200,
      '2025-01-01',
      'Начальная ставка'
    ]);
    console.log('✅ Ставка кредита добавлена');
    
    // Добавляем несколько платежей в credit_payment
    console.log('Добавляем платежи...');
    const payments = [
      { period: 1, due_date: '2025-01-20', principal: 25000.00, interest: 10000.00, status: 'paid', paid_amount: 35000.00, paid_at: '2025-01-20' },
      { period: 2, due_date: '2025-02-20', principal: 25200.00, interest: 9800.00, status: 'paid', paid_amount: 35000.00, paid_at: '2025-02-20' },
      { period: 3, due_date: '2025-03-20', principal: 25400.00, interest: 9600.00, status: 'paid', paid_amount: 35000.00, paid_at: '2025-03-20' },
      { period: 4, due_date: '2025-04-20', principal: 25600.00, interest: 9400.00, status: 'scheduled', paid_amount: null, paid_at: null },
      { period: 5, due_date: '2025-05-20', principal: 25800.00, interest: 9200.00, status: 'scheduled', paid_amount: null, paid_at: null }
    ];
    
    for (const payment of payments) {
      await client.query(`
        INSERT INTO credit_payment (
          credit_id, due_date, period_number, principal_due, interest_due, 
          total_due, status, paid_amount, paid_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (credit_id, period_number, recalculated_version) DO NOTHING
      `, [
        'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df',
        payment.due_date,
        payment.period,
        payment.principal,
        payment.interest,
        payment.principal + payment.interest,
        payment.status,
        payment.paid_amount,
        payment.paid_at
      ]);
    }
    console.log('✅ Платежи добавлены');
    
    // Проверяем данные
    console.log('Проверяем добавленные данные...');
    
    const bankCount = await client.query('SELECT COUNT(*) FROM banks');
    console.log(`Банков в базе: ${bankCount.rows[0].count}`);
    
    const creditCount = await client.query('SELECT COUNT(*) FROM credits');
    console.log(`Кредитов в базе: ${creditCount.rows[0].count}`);
    
    const paymentCount = await client.query('SELECT COUNT(*) FROM credit_payment');
    console.log(`Платежей в базе: ${paymentCount.rows[0].count}`);
    
    const paidPaymentCount = await client.query("SELECT COUNT(*) FROM credit_payment WHERE status = 'paid'");
    console.log(`Оплаченных платежей: ${paidPaymentCount.rows[0].count}`);
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Ошибка при добавлении данных:', err.message);
    console.error('Детали ошибки:', err);
    return false;
  } finally {
    await pool.end();
  }
}

insertSampleData().then(success => {
  process.exit(success ? 0 : 1);
});