const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('Тестируем подключение к базе данных...');
  console.log(`Хост: ${process.env.POSTGRES_HOST}`);
  console.log(`Порт: ${process.env.POSTGRES_PORT}`);
  console.log(`База данных: ${process.env.POSTGRES_DATABASE}`);
  console.log(`Пользователь: ${process.env.POSTGRES_USER}`);
  
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Успешное подключение к базе данных!');
    
    // Проверяем версию PostgreSQL
    const result = await client.query('SELECT version()');
    console.log('Версия PostgreSQL:', result.rows[0].version);
    
    // Проверяем существующие базы данных
    const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('Существующие базы данных:');
    dbResult.rows.forEach(row => {
      console.log(`  - ${row.datname}`);
    });
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
    return false;
  } finally {
    await pool.end();
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});