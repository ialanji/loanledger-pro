const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function buildClientConfig(preferDatabase) {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (connectionString) {
    // If connection string is provided, allow overriding database if preferDatabase is passed
    return preferDatabase ? { connectionString, database: preferDatabase } : { connectionString };
  }
  const cfg = {
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    host: process.env.POSTGRES_HOST || process.env.DB_HOST,
    database: preferDatabase || process.env.POSTGRES_DATABASE || process.env.DB_NAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
  const missing = Object.entries(cfg)
    .filter(([key, val]) => (key === 'port' ? Number.isNaN(val) || !val : val === undefined || val === ''))
    .map(([key]) => key);
  if (missing.length > 0) {
    console.error(`Database configuration is incomplete. Missing: ${missing.join(', ')}`);
    throw new Error('Set POSTGRES_* or DB_* variables in .env or provide POSTGRES_URL/DATABASE_URL.');
  }
  return cfg;
}

async function connectAndCreateTable() {
  // Connect to target DB defined in .env
  const client = new Client(buildClientConfig());

  try {
    console.log('Подключение к PostgreSQL...');
    await client.connect();
    console.log('✅ Успешно подключен к базе данных');

    // Читаем SQL файл
    const sqlFile = path.join(__dirname, 'create_expense_sources.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Выполнение SQL скрипта...');
    await client.query(sql);
    console.log('✅ Таблица expense_sources успешно создана');

    // Проверяем что таблица создалась
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'expense_sources'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Таблица expense_sources найдена в базе данных');
      
      // Проверяем данные
      const dataResult = await client.query('SELECT * FROM expense_sources');
      console.log(`📊 Найдено ${dataResult.rows.length} записей в таблице expense_sources`);
      
      if (dataResult.rows.length > 0) {
        console.log('Первые записи:');
        dataResult.rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.category} - ${row.sheet_name}`);
        });
      }
    } else {
      console.log('❌ Таблица expense_sources не найдена');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.code) {
      console.error('Код ошибки:', error.code);
    }
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('Соединение закрыто');
  }
}

connectAndCreateTable();