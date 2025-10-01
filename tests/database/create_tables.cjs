const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createTables() {
  console.log('Создаём таблицы в базе данных Finance_NANU...');
  
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Подключение к базе данных Finance_NANU успешно!');
    
    // Создаём функцию для обновления updated_at
    console.log('Создаём функцию update_updated_at_column...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Читаем и выполняем миграцию для банковских таблиц
    console.log('Создаём банковские таблицы...');
    const bankingMigration = fs.readFileSync(
      path.join(__dirname, 'supabase', 'migrations', '20250123_create_banking_tables.sql'),
      'utf8'
    );
    await client.query(bankingMigration);
    console.log('✅ Банковские таблицы созданы');
    
    // Читаем и выполняем миграцию для таблицы credit_payment
    console.log('Создаём таблицу credit_payment...');
    const creditPaymentMigration = fs.readFileSync(
      path.join(__dirname, 'supabase', 'migrations', '20250125_create_credit_payment_table.sql'),
      'utf8'
    );
    await client.query(creditPaymentMigration);
    console.log('✅ Таблица credit_payment создана');
    
    // Проверяем созданные таблицы
    console.log('Проверяем созданные таблицы...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Созданные таблицы:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Ошибка при создании таблиц:', err.message);
    console.error('Детали ошибки:', err);
    return false;
  } finally {
    await pool.end();
  }
}

createTables().then(success => {
  process.exit(success ? 0 : 1);
});