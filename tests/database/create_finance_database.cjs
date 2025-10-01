const { Client } = require('pg');
require('dotenv').config();

function buildClientConfig({ databaseOverride } = {}) {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (connectionString) {
    // When creating a DB, we may need to connect to 'postgres' first
    return databaseOverride ? { connectionString, database: databaseOverride } : { connectionString };
  }
  const cfg = {
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    host: process.env.POSTGRES_HOST || process.env.DB_HOST,
    database: databaseOverride || process.env.POSTGRES_DATABASE || process.env.DB_NAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT),
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

async function createFinanceDatabase() {
  // Step 1: connect to system DB (postgres) to create target DB if needed
  const systemClient = new Client(buildClientConfig({ databaseOverride: 'postgres' }));

  try {
    console.log('Подключение к PostgreSQL серверу...');
    await systemClient.connect();
    console.log('✅ Успешно подключен к PostgreSQL серверу');

    const targetDb = process.env.POSTGRES_DATABASE || process.env.DB_NAME;
    if (!targetDb) {
      throw new Error('Не указано имя целевой базы данных (POSTGRES_DATABASE/DB_NAME)');
    }

    console.log(`Проверка существования базы данных ${targetDb}...`);
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1;`;
    const checkResult = await systemClient.query(checkDbQuery, [targetDb]);

    if (checkResult.rows.length > 0) {
      console.log(`⚠️  База данных ${targetDb} уже существует`);
    } else {
      console.log(`Создание новой базы данных ${targetDb}...`);
      await systemClient.query(`CREATE DATABASE "${targetDb}" WITH TEMPLATE template0 ENCODING 'UTF8';`);
      console.log(`✅ База данных ${targetDb} успешно создана`);
    }

    await systemClient.end();

    // Step 2: connect to target DB to verify
    const newDbClient = new Client(buildClientConfig());

    console.log(`Подключение к новой базе данных ${targetDb}...`);
    await newDbClient.connect();
    console.log(`✅ Успешно подключен к базе данных ${targetDb}`);

    const dbInfoQuery = `
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        version() as postgresql_version;
    `;
    const dbInfo = await newDbClient.query(dbInfoQuery);
    console.log('📊 Информация о базе данных:');
    console.log(`   Название: ${dbInfo.rows[0].database_name}`);
    console.log(`   Пользователь: ${dbInfo.rows[0].current_user}`);
    console.log(`   Версия PostgreSQL: ${dbInfo.rows[0].postgresql_version.split(' ')[0]}`);

    await newDbClient.end();
    console.log('Соединение закрыто');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

createFinanceDatabase();