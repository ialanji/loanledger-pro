-- Создание таблицы expense_sources для управления источниками данных Google Sheets
-- Основано на требованиях из TZ_Full.md

-- Создание таблицы expense_sources
CREATE TABLE IF NOT EXISTS expense_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR NOT NULL UNIQUE CHECK (category IN ('salary', 'transport', 'supplies', 'other', 'office', 'marketing')),
  sheet_url TEXT NOT NULL,
  import_mode VARCHAR NOT NULL DEFAULT 'google_sheets' CHECK (import_mode IN ('google_sheets', 'file')),
  sheet_name VARCHAR, -- название листа в Google Sheets
  range_start VARCHAR DEFAULT 'A2', -- начальная ячейка для импорта (пропускаем заголовки)
  range_end VARCHAR, -- конечная ячейка (если не указана, импортируем до конца)
  column_mapping JSONB, -- маппинг колонок Google Sheets на поля БД
  is_active BOOLEAN DEFAULT true,
  last_import_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Метаданные для настройки импорта
  import_settings JSONB DEFAULT '{}', -- дополнительные настройки импорта
  validation_rules JSONB DEFAULT '{}' -- правила валидации данных
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_expense_sources_category ON expense_sources(category);
CREATE INDEX IF NOT EXISTS idx_expense_sources_is_active ON expense_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_sources_last_import_at ON expense_sources(last_import_at);

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_expense_sources_updated_at ON expense_sources;
CREATE TRIGGER update_expense_sources_updated_at 
    BEFORE UPDATE ON expense_sources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security
ALTER TABLE expense_sources ENABLE ROW LEVEL SECURITY;

-- Политики доступа для expense_sources
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to expense sources" ON expense_sources;
CREATE POLICY "Allow all access to expense sources" ON expense_sources
  FOR ALL USING (true);

-- Вставка начальных данных согласно TZ_Full.md
INSERT INTO expense_sources (category, sheet_url, sheet_name, column_mapping) VALUES
(
  'salary',
  'https://docs.google.com/spreadsheets/d/17so5yEGE_R7BKNGoPfpXtma9c1zCi43B8l9BqDIgJuE/edit?usp=drive_link',
  'Salariul',
  '{
    "date": "A",
    "employee": "B", 
    "department": "C",
    "amount": "D",
    "description": "E"
  }'::jsonb
),
(
  'transport',
  'https://docs.google.com/spreadsheets/d/19DI-2d2rORVNg9yiox7z5L0OeJAYXnAF5CmNWQTbF30/edit?usp=drive_link',
  'Transport',
  '{
    "date": "A",
    "vehicle": "B",
    "route": "C", 
    "amount": "D",
    "description": "E"
  }'::jsonb
),
(
  'office',
  'https://docs.google.com/spreadsheets/d/1Aw8Aw8Aw8Aw8Aw8Aw8Aw8Aw8Aw8Aw8Aw8Aw8/edit?usp=drive_link',
  'Office',
  '{
    "date": "A",
    "category": "B",
    "supplier": "C",
    "amount": "D",
    "description": "E"
  }'::jsonb
),
(
  'marketing',
  'https://docs.google.com/spreadsheets/d/1Mk8Mk8Mk8Mk8Mk8Mk8Mk8Mk8Mk8Mk8Mk8Mk8Mk8/edit?usp=drive_link',
  'Marketing',
  '{
    "date": "A",
    "campaign": "B",
    "channel": "C",
    "amount": "D",
    "description": "E"
  }'::jsonb
)
ON CONFLICT (category) DO NOTHING;