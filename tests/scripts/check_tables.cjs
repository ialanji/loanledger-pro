const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

console.log('Проверяем структуру базы данных...');

db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, rows) => {
  if (err) {
    console.error('Ошибка:', err);
  } else {
    console.log('Таблицы в базе данных:');
    rows.forEach(row => {
      console.log('- ' + row.name);
    });
  }
  
  db.close();
});