// Читаем переменные из .env файла вручную
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Убираем кавычки если они есть
      process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Установлен' : 'Не установлен');

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('🔄 Создание таблицы expense_sources...');
  
  try {
    // Создание таблицы напрямую через SQL
    const { data, error } = await supabase
      .from('_sql')
      .select('*')
      .eq('query', `
        CREATE TABLE IF NOT EXISTS expense_sources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category VARCHAR NOT NULL UNIQUE CHECK (category IN ('salary', 'transport', 'supplies', 'other')),
          sheet_url TEXT NOT NULL,
          import_mode VARCHAR NOT NULL DEFAULT 'google_sheets' CHECK (import_mode IN ('google_sheets', 'file')),
          sheet_name VARCHAR,
          range_start VARCHAR DEFAULT 'A2',
          range_end VARCHAR,
          column_mapping JSONB,
          is_active BOOLEAN DEFAULT true,
          last_import_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          import_settings JSONB DEFAULT '{}',
          validation_rules JSONB DEFAULT '{}'
        );
      `);
    
    if (error) {
      console.error('❌ Ошибка создания таблицы:', error);
      
      // Попробуем альтернативный способ - через REST API
      console.log('🔄 Пробуем альтернативный способ...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          sql: `
            CREATE TABLE IF NOT EXISTS expense_sources (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              category VARCHAR NOT NULL UNIQUE CHECK (category IN ('salary', 'transport', 'supplies', 'other')),
              sheet_url TEXT NOT NULL,
              import_mode VARCHAR NOT NULL DEFAULT 'google_sheets' CHECK (import_mode IN ('google_sheets', 'file')),
              sheet_name VARCHAR,
              range_start VARCHAR DEFAULT 'A2',
              range_end VARCHAR,
              column_mapping JSONB,
              is_active BOOLEAN DEFAULT true,
              last_import_at TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              import_settings JSONB DEFAULT '{}',
              validation_rules JSONB DEFAULT '{}'
            );
          `
        })
      });
      
      if (!response.ok) {
        console.error('❌ Ошибка REST API:', await response.text());
        return;
      }
      
      console.log('✅ Таблица создана через REST API');
    } else {
      console.log('✅ Таблица expense_sources создана');
    }
    
    // Проверка таблицы
    const { data: testData, error: testError } = await supabase
      .from('expense_sources')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Ошибка проверки таблицы:', testError);
    } else {
      console.log('✅ Таблица expense_sources доступна для запросов');
      console.log('Количество записей:', testData.length);
    }
    
  } catch (err) {
    console.error('❌ Общая ошибка:', err);
  }
}

createTable().catch(console.error);