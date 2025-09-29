-- Создание таблицы expenses с полной схемой
-- Основано на архитектуре из tasks.md

-- Создание таблицы aliases для справочников
CREATE TABLE IF NOT EXISTS aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('department', 'supplier', 'project')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(name, type)
);

-- Создание таблицы expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR NOT NULL,
  department_id UUID REFERENCES aliases(id),
  supplier_id UUID REFERENCES aliases(id),
  date DATE NOT NULL,
  description TEXT,
  source VARCHAR DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Дополнительные поля для расширенной функциональности
  project_id UUID,
  tags TEXT[],
  receipt_url TEXT,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  
  -- Поля для дедупликации
  row_hash VARCHAR UNIQUE,
  source_row_id VARCHAR,
  
  -- Индексы для производительности
  CONSTRAINT expenses_amount_positive CHECK (amount > 0)
);

-- Создание таблицы import_logs для отслеживания импорта
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  created_rows INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Создание таблицы import_cursors для инкрементального импорта
CREATE TABLE IF NOT EXISTS import_cursors (
  source VARCHAR PRIMARY KEY,
  last_row_index INTEGER DEFAULT 0,
  last_import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sheet_version VARCHAR,
  metadata JSONB
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_department_id ON expenses(department_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_row_hash ON expenses(row_hash);

-- Создание индексов для import_logs
CREATE INDEX IF NOT EXISTS idx_import_logs_source ON import_logs(source);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_started_at ON import_logs(started_at);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at 
    BEFORE UPDATE ON expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Триггер для aliases
DROP TRIGGER IF EXISTS update_aliases_updated_at ON aliases;
CREATE TRIGGER update_aliases_updated_at 
    BEFORE UPDATE ON aliases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security
ALTER TABLE aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_cursors ENABLE ROW LEVEL SECURITY;

-- Политики доступа для aliases
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to aliases" ON aliases;
CREATE POLICY "Allow all access to aliases" ON aliases
  FOR ALL USING (true);

-- Политики доступа для expenses
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to expenses" ON expenses;
CREATE POLICY "Allow all access to expenses" ON expenses
  FOR ALL USING (true);

-- Политики доступа для import_logs
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to import logs" ON import_logs;
CREATE POLICY "Allow all access to import logs" ON import_logs
  FOR ALL USING (true);

-- Политики доступа для import_cursors
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to import cursors" ON import_cursors;
CREATE POLICY "Allow all access to import cursors" ON import_cursors
  FOR ALL USING (true);

-- Комментарии к таблицам
COMMENT ON TABLE expenses IS 'Таблица расходов с поддержкой импорта и дедупликации';
COMMENT ON TABLE import_logs IS 'Логи процессов импорта данных';
COMMENT ON TABLE import_cursors IS 'Курсоры для инкрементального импорта';

-- Комментарии к ключевым полям
COMMENT ON COLUMN expenses.row_hash IS 'Хеш для дедупликации записей';
COMMENT ON COLUMN expenses.source_row_id IS 'ID строки в источнике данных';
COMMENT ON COLUMN expenses.tags IS 'Массив тегов для категоризации';
COMMENT ON COLUMN expenses.receipt_url IS 'URL чека или документа';