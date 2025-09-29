const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Читаем .env файл
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

envLines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      value = value.replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  }
});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTable() {
  try {
    console.log('Проверяю подключение к Supabase...');
    const { data, error } = await supabase.from('expense_sources').select('*').limit(1);
    
    if (error) {
      console.log('❌ Ошибка при обращении к таблице expense_sources:');
      console.log('Код ошибки:', error.code);
      console.log('Сообщение:', error.message);
      console.log('Детали:', error.details);
      
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('\n🔍 Таблица expense_sources НЕ СУЩЕСТВУЕТ в базе данных');
        console.log('Необходимо выполнить SQL скрипт manual_table_creation.sql в Supabase Dashboard');
      }
    } else {
      console.log('✅ Таблица expense_sources существует');
      console.log('Количество записей:', data ? data.length : 0);
      if (data && data.length > 0) {
        console.log('Первая запись:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.log('❌ Критическая ошибка:', err.message);
  }
}

checkTable();