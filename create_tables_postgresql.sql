-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание таблицы expense_sources
CREATE TABLE IF NOT EXISTS expense_sources (
    id SERIAL PRIMARY KEY,
    category VARCHAR(255) UNIQUE NOT NULL,
    sheet_url TEXT NOT NULL,
    column_mapping JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_expense_sources_category ON expense_sources(category);
CREATE INDEX IF NOT EXISTS idx_expense_sources_active ON expense_sources(is_active);

-- Создание триггера для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_expense_sources_updated_at ON expense_sources;
CREATE TRIGGER update_expense_sources_updated_at
    BEFORE UPDATE ON expense_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Вставка тестовых данных
INSERT INTO expense_sources (category, sheet_url, column_mapping) VALUES
('Зарплата', 'https://docs.google.com/spreadsheets/d/17oq5yGE_RTBNG5PqYmXaP-1C4188R8qPqjuEA', '{"amount": "B", "date": "A", "description": "C"}'),
('Транспорт', 'https://docs.google.com/spreadsheets/d/17oq5yGE_RTBNG5PqYmXaP-1C4188R8qPqjuEA', '{"amount": "B", "date": "A", "description": "C"}'),
('Канцтовары', 'https://docs.google.com/spreadsheets/d/17oq5yGE_RTBNG5PqYmXaP-1C4188R8qPqjuEA', '{"amount": "B", "date": "A", "description": "C"}')
ON CONFLICT (category) DO NOTHING;

-- Создание таблицы expenses (если нужна)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    category VARCHAR(255),
    source_id INTEGER REFERENCES expense_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для expenses
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_source_id ON expenses(source_id);

-- Создание триггера для expenses
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();