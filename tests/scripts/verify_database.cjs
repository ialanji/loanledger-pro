const { Pool } = require('pg');
require('dotenv').config();

async function verifyDatabase() {
  console.log('Проверяем структуру базы данных и тестируем операции...');
  
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
    
    // 1. Проверяем структуру таблиц
    console.log('\n=== СТРУКТУРА ТАБЛИЦ ===');
    const tables = ['banks', 'credits', 'credit_rates', 'credit_payment', 'payments', 'principal_adjustments'];
    
    for (const table of tables) {
      console.log(`\nТаблица: ${table}`);
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);
      
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    
    // 2. Проверяем индексы
    console.log('\n=== ИНДЕКСЫ ===');
    const indexes = await client.query(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    indexes.rows.forEach(idx => {
      console.log(`${idx.tablename}.${idx.indexname}`);
    });
    
    // 3. Проверяем внешние ключи
    console.log('\n=== ВНЕШНИЕ КЛЮЧИ ===');
    const foreignKeys = await client.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    foreignKeys.rows.forEach(fk => {
      console.log(`${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    // 4. Тестируем базовые операции
    console.log('\n=== ТЕСТИРОВАНИЕ ОПЕРАЦИЙ ===');
    
    // Тест SELECT
    console.log('Тест SELECT операций:');
    const bankTest = await client.query('SELECT COUNT(*) as count FROM banks');
    console.log(`  - Банков: ${bankTest.rows[0].count}`);
    
    const creditTest = await client.query('SELECT COUNT(*) as count FROM credits');
    console.log(`  - Кредитов: ${creditTest.rows[0].count}`);
    
    const paymentTest = await client.query('SELECT COUNT(*) as count FROM credit_payment');
    console.log(`  - Платежей: ${paymentTest.rows[0].count}`);
    
    // Тест JOIN
    console.log('\nТест JOIN операций:');
    const joinTest = await client.query(`
      SELECT 
        c.contract_number,
        b.name as bank_name,
        COUNT(cp.id) as payment_count,
        COUNT(CASE WHEN cp.status = 'paid' THEN 1 END) as paid_count
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      LEFT JOIN credit_payment cp ON c.id = cp.credit_id
      GROUP BY c.id, c.contract_number, b.name
    `);
    
    joinTest.rows.forEach(row => {
      console.log(`  - Кредит ${row.contract_number} (${row.bank_name}): ${row.payment_count} платежей, ${row.paid_count} оплачено`);
    });
    
    // Тест конкретного кредита для отладки
    console.log('\nДетали кредита GA202503S805/3524/2:');
    const creditDetails = await client.query(`
      SELECT 
        c.id,
        c.contract_number,
        c.principal,
        c.term_months,
        c.start_date,
        b.name as bank_name
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      WHERE c.contract_number = 'GA202503S805/3524/2'
    `);
    
    if (creditDetails.rows.length > 0) {
      const credit = creditDetails.rows[0];
      console.log(`  - ID: ${credit.id}`);
      console.log(`  - Номер: ${credit.contract_number}`);
      console.log(`  - Сумма: ${credit.principal}`);
      console.log(`  - Срок: ${credit.term_months} месяцев`);
      console.log(`  - Дата начала: ${credit.start_date}`);
      console.log(`  - Банк: ${credit.bank_name}`);
      
      // Проверяем платежи по этому кредиту
      const creditPayments = await client.query(`
        SELECT 
          period_number,
          due_date,
          principal_due,
          interest_due,
          total_due,
          status,
          paid_amount,
          paid_at
        FROM credit_payment
        WHERE credit_id = $1
        ORDER BY period_number
      `, [credit.id]);
      
      console.log(`\n  Платежи (${creditPayments.rows.length} шт.):`);
      creditPayments.rows.forEach(payment => {
        console.log(`    Период ${payment.period_number}: ${payment.due_date}, ${payment.total_due} руб., статус: ${payment.status}`);
      });
    }
    
    console.log('\n✅ Проверка базы данных завершена успешно!');
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Ошибка при проверке базы данных:', err.message);
    console.error('Детали ошибки:', err);
    return false;
  } finally {
    await pool.end();
  }
}

verifyDatabase().then(success => {
  process.exit(success ? 0 : 1);
});