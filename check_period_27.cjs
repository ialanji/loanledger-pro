const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

console.log('Проверяем платежи с периодом 27...');

db.all(`
  SELECT id, period_number, status, created_at, total_due 
  FROM credit_payment 
  WHERE period_number = 27 
  ORDER BY created_at DESC 
  LIMIT 5
`, (err, rows) => {
  if (err) {
    console.error('Ошибка:', err);
  } else {
    console.log(`Найдено ${rows.length} платежей с периодом 27:`);
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Период: ${row.period_number}`);
      console.log(`   СТАТУС: ${row.status}`);
      console.log(`   Создан: ${new Date(row.created_at)}`);
      console.log(`   Сумма: ${row.total_due}`);
      console.log('');
    });
  }
  
  db.close();
});