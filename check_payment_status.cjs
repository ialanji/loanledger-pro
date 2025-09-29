const { Pool } = require('pg');
require('dotenv').config();

async function checkPaymentStatus() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  let poolConfig;

  if (connectionString) {
    poolConfig = { connectionString };
  } else {
    const cfg = {
      user: process.env.POSTGRES_USER || process.env.DB_USER,
      host: process.env.POSTGRES_HOST || process.env.DB_HOST,
      database: process.env.POSTGRES_DATABASE || process.env.DB_NAME,
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
      port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT),
    };

    const missing = Object.entries(cfg)
      .filter(([key, val]) => (key === 'port' ? Number.isNaN(val) || !val : val === undefined || val === ''))
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error(`Database configuration is incomplete. Missing: ${missing.join(', ')}`);
      process.exit(1);
    }

    poolConfig = cfg;
  }

  const pool = new Pool(poolConfig);

  try {
    const client = await pool.connect();
    
    console.log('Подключен к базе данных PostgreSQL');
    
    // Проверяем последние созданные платежи
    const query = `
      SELECT id, credit_id, period_number, status, created_at, due_date, principal_due, interest_due, total_due
      FROM credit_payment 
      WHERE credit_id = 'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df' 
      ORDER BY created_at DESC 
      LIMIT 10;
    `;
    
    const result = await client.query(query);
    
    console.log('\n=== ПОСЛЕДНИЕ ПЛАТЕЖИ ===');
    console.log(`Найдено ${result.rows.length} платежей:`);
    
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Платеж ID: ${row.id}`);
      console.log(`   Период: ${row.period_number}`);
      console.log(`   СТАТУС: ${row.status}`);
      console.log(`   Создан: ${row.created_at}`);
      console.log(`   Дата платежа: ${row.due_date}`);
      console.log(`   Сумма: ${row.total_due}`);
    });

    // Проверяем статистику по статусам
    const statsQuery = `
      SELECT status, COUNT(*) as count
      FROM credit_payment 
      WHERE credit_id = 'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df'
      GROUP BY status
      ORDER BY count DESC;
    `;
    
    const statsResult = await client.query(statsQuery);
    
    console.log('\n=== СТАТИСТИКА ПО СТАТУСАМ ===');
    statsResult.rows.forEach(row => {
      console.log(`${row.status}: ${row.count} платежей`);
    });

    client.release();
    
  } catch (error) {
    console.error('Ошибка при проверке статусов платежей:', error);
  } finally {
    await pool.end();
  }
}

checkPaymentStatus();