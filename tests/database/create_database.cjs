const { Pool } = require('pg');
require('dotenv').config();

async function createDatabase() {
  console.log('Создаём базу данных Finance_NANU...');
  
  // Подключаемся к системной базе данных postgres для создания новой базы
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: 'postgres', // Подключаемся к системной базе
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Подключение к серверу PostgreSQL успешно!');
    
    // Проверяем, существует ли база данных
    const checkResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ['Finance_NANU']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('ℹ️ База данных Finance_NANU уже существует');
    } else {
      // Создаём базу данных
      await client.query('CREATE DATABASE "Finance_NANU"');
      console.log('✅ База данных Finance_NANU успешно создана!');
    }
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Ошибка при создании базы данных:', err.message);
    return false;
  } finally {
    await pool.end();
  }
}

createDatabase().then(success => {
  process.exit(success ? 0 : 1);
});