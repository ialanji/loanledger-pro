-- Создание таблицы expense_sources для управления источниками данных Google Sheets

-- Создание функции для обновления updated_at (если не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание таблицы expense_sources
CREATE TABLE IF NOT EXISTS expense_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR NOT NULL UNIQUE CHECK (category IN ('salary', 'transport', 'supplies', 'other')),
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

-- Вставка тестовых данных
INSERT INTO expense_sources (category, sheet_url, sheet_name, column_mapping) VALUES
(
  'salary',
  'https://docs.google.com/spreadsheets/d/17so5yEGE_R7BKNGoPfpXtma9c1zCi43B8l9BqDIgJuE/edit?usp=drive_link',
  'Salariul',
  '{
    "date": "A",
    "employee": "B", 
    "amount": "C",
    "department": "D",
    "description": "E"
  }'::jsonb
),
(
  'transport',
  'https://docs.google.com/spreadsheets/d/17so5yEGE_R7BKNGoPfpXtma9c1zCi43B8l9BqDIgJuE/edit?usp=drive_link',
  'Transport',
  '{
    "date": "A",
    "vehicle": "B",
    "amount": "C",
    "department": "D",
    "description": "E"
  }'::jsonb
),
(
  'supplies',
  'https://docs.google.com/spreadsheets/d/17so5yEGE_R7BKNGoPfpXtma9c1zCi43B8l9BqDIgJuE/edit?usp=drive_link',
  'Supplies',
  '{
    "date": "A",
    "item": "B",
    "amount": "C",
    "supplier": "D",
    "description": "E"
  }'::jsonb
)
ON CONFLICT (category) DO NOTHING;