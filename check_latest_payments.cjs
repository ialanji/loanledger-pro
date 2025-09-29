require('dotenv').config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
});

async function checkLatestPayments() {
  try {
    const client = await pool.connect();
    
    console.log("=== ПОСЛЕДНИЕ 5 ПЛАТЕЖЕЙ ===");
    const result = await client.query(`
      SELECT id, credit_id, period_number, status, due_date, created_at, total_due
      FROM credit_payment 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    result.rows.forEach((payment, index) => {
      console.log(`${index + 1}. ID: ${payment.id}`);
      console.log(`   Кредит: ${payment.credit_id}`);
      console.log(`   Период: ${payment.period_number}`);
      console.log(`   СТАТУС: ${payment.status}`);
      console.log(`   Дата создания: ${payment.created_at}`);
      console.log(`   Сумма: ${payment.total_due}`);
      console.log("");
    });
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error("Ошибка:", error.message);
  }
}

checkLatestPayments();