const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Читаем .env файл
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    // Убираем кавычки если есть
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  try {
    console.log('Checking expense_sources table...');
    
    // Проверяем существование таблицы
    const { data, error } = await supabase
      .from('expense_sources')
      .select('count')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('❌ Table expense_sources does not exist');
      console.log('Need to create it manually in Supabase dashboard');
      
      // Читаем SQL файл
      const sql = fs.readFileSync('create_expense_sources.sql', 'utf8');
      console.log('\nSQL to execute:');
      console.log('================');
      console.log(sql);
    } else if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Table expense_sources exists');
      
      // Проверяем данные в таблице
      const { data: sources, error: selectError } = await supabase
        .from('expense_sources')
        .select('*');
        
      if (selectError) {
        console.error('❌ Error selecting data:', selectError);
      } else {
        console.log(`📊 Found ${sources.length} expense sources:`);
        sources.forEach(source => {
          console.log(`  - ${source.category}: ${source.sheet_url}`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkTable();