const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkInterestData() {
  try {
    console.log('=== Проверка данных по процентам ===');
    
    // Проверяем все платежи
    const paymentsResult = await pool.query(`
      SELECT 
        id,
        credit_id,
        due_date,
        principal_due,
        interest_due,
        total_due,
        status,
        paid_amount,
        paid_at
      FROM credit_payment 
      ORDER BY due_date
    `);
    
    console.log('Все платежи:');
    paymentsResult.rows.forEach(payment => {
      console.log(`ID: ${payment.id}, Дата: ${payment.due_date}, Основной долг: ${payment.principal_due}, Проценты: ${payment.interest_due}, Статус: ${payment.status}`);
    });
    
    // Рассчитываем общие проценты
    const totalInterest = paymentsResult.rows.reduce((sum, payment) => {
      return sum + parseFloat(payment.interest_due || 0);
    }, 0);
    
    // Рассчитываем оплаченные проценты
    const paidInterest = paymentsResult.rows
      .filter(p => p.status === 'paid')
      .reduce((sum, payment) => {
        return sum + parseFloat(payment.interest_due || 0);
      }, 0);
    
    // Рассчитываем оставшиеся проценты
    const remainingInterest = totalInterest - paidInterest;
    
    console.log('\n=== Расчет процентов ===');
    console.log('Общие проценты по всем платежам:', totalInterest);
    console.log('Оплаченные проценты:', paidInterest);
    console.log('Оставшиеся проценты к доплате:', remainingInterest);
    
    // Проверяем структуру таблиц
    console.log('\n=== Структура таблицы credits ===');
    const creditsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'credits'
    `);
    
    creditsColumns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n=== Структура таблицы credit_payment ===');
    const paymentsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'credit_payment'
    `);
    
    paymentsColumns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    // Проверяем кредиты
    const creditsResult = await pool.query(`
      SELECT 
        id,
        contract_number,
        principal
      FROM credits
    `);
    
    console.log('\n=== Кредиты ===');
    creditsResult.rows.forEach(credit => {
      console.log(`ID: ${credit.id}, Номер: ${credit.contract_number}, Сумма: ${credit.principal}`);
    });
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await pool.end();
  }
}

checkInterestData();