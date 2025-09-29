-- Создание таблиц для банковского модуля
-- Основано на архитектуре из tasks.md и типах из types.ts

-- Создание таблицы banks
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  code VARCHAR UNIQUE,
  country VARCHAR,
  currency_code VARCHAR(3) DEFAULT 'RUB',
  contact_info JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT banks_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT banks_currency_code_valid CHECK (LENGTH(currency_code) = 3)
);

-- Создание таблицы credits
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR NOT NULL UNIQUE,
  principal DECIMAL(15,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'RUB',
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  method VARCHAR NOT NULL CHECK (method IN ('fixed', 'floating')),
  payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 31),
  start_date DATE NOT NULL,
  term_months INTEGER NOT NULL,
  deferment_months INTEGER DEFAULT 0,
  initial_rate DECIMAL(5,4),
  rate_effective_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT credits_principal_positive CHECK (principal > 0),
  CONSTRAINT credits_term_months_positive CHECK (term_months > 0),
  CONSTRAINT credits_deferment_months_non_negative CHECK (deferment_months >= 0),
  CONSTRAINT credits_initial_rate_positive CHECK (initial_rate IS NULL OR initial_rate > 0),
  CONSTRAINT credits_currency_code_valid CHECK (LENGTH(currency_code) = 3)
);

-- Создание таблицы credit_rates для истории изменения ставок
CREATE TABLE IF NOT EXISTS credit_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  rate DECIMAL(5,4) NOT NULL,
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT credit_rates_rate_positive CHECK (rate > 0),
  
  -- Уникальность по кредиту и дате
  UNIQUE(credit_id, effective_date)
);

-- Создание таблицы payments для платежей по кредитам
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  principal_amount DECIMAL(15,2),
  interest_amount DECIMAL(15,2),
  payment_type VARCHAR DEFAULT 'regular' CHECK (payment_type IN ('regular', 'early', 'penalty', 'fee')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT payments_amount_positive CHECK (amount > 0),
  CONSTRAINT payments_principal_amount_non_negative CHECK (principal_amount IS NULL OR principal_amount >= 0),
  CONSTRAINT payments_interest_amount_non_negative CHECK (interest_amount IS NULL OR interest_amount >= 0)
);

-- Создание таблицы principal_adjustments для корректировок основного долга
CREATE TABLE IF NOT EXISTS principal_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  adjustment_type VARCHAR NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT principal_adjustments_amount_positive CHECK (amount > 0)
);

-- Создание индексов для оптимизации запросов

-- Индексы для banks
CREATE INDEX IF NOT EXISTS idx_banks_name ON banks(name);
CREATE INDEX IF NOT EXISTS idx_banks_code ON banks(code);
CREATE INDEX IF NOT EXISTS idx_banks_country ON banks(country);

-- Индексы для credits
CREATE INDEX IF NOT EXISTS idx_credits_contract_number ON credits(contract_number);
CREATE INDEX IF NOT EXISTS idx_credits_bank_id ON credits(bank_id);
CREATE INDEX IF NOT EXISTS idx_credits_method ON credits(method);
CREATE INDEX IF NOT EXISTS idx_credits_start_date ON credits(start_date);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at);

-- Индексы для credit_rates
CREATE INDEX IF NOT EXISTS idx_credit_rates_credit_id ON credit_rates(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_rates_effective_date ON credit_rates(effective_date);

-- Индексы для payments
CREATE INDEX IF NOT EXISTS idx_payments_credit_id ON payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);

-- Индексы для principal_adjustments
CREATE INDEX IF NOT EXISTS idx_principal_adjustments_credit_id ON principal_adjustments(credit_id);
CREATE INDEX IF NOT EXISTS idx_principal_adjustments_adjustment_date ON principal_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_principal_adjustments_adjustment_type ON principal_adjustments(adjustment_type);

-- Функция для автоматического обновления updated_at уже существует из предыдущей миграции

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_banks_updated_at ON banks;
CREATE TRIGGER update_banks_updated_at 
    BEFORE UPDATE ON banks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credits_updated_at ON credits;
CREATE TRIGGER update_credits_updated_at 
    BEFORE UPDATE ON credits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_rates_updated_at ON credit_rates;
CREATE TRIGGER update_credit_rates_updated_at 
    BEFORE UPDATE ON credit_rates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_principal_adjustments_updated_at ON principal_adjustments;
CREATE TRIGGER update_principal_adjustments_updated_at 
    BEFORE UPDATE ON principal_adjustments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE principal_adjustments ENABLE ROW LEVEL SECURITY;

-- Политики доступа для banks
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to banks" ON banks;
CREATE POLICY "Allow all access to banks" ON banks
  FOR ALL USING (true);

-- Политики доступа для credits
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to credits" ON credits;
CREATE POLICY "Allow all access to credits" ON credits
  FOR ALL USING (true);

-- Политики доступа для credit_rates
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to credit rates" ON credit_rates;
CREATE POLICY "Allow all access to credit rates" ON credit_rates
  FOR ALL USING (true);

-- Политики доступа для payments
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to payments" ON payments;
CREATE POLICY "Allow all access to payments" ON payments
  FOR ALL USING (true);

-- Политики доступа для principal_adjustments
-- Разрешаем доступ всем пользователям (для простоты в dev среде)
DROP POLICY IF EXISTS "Allow all access to principal adjustments" ON principal_adjustments;
CREATE POLICY "Allow all access to principal adjustments" ON principal_adjustments
  FOR ALL USING (true);

-- Вставка тестовых данных для банков
INSERT INTO banks (name, code, country, currency_code, contact_info, notes) VALUES
('Сбербанк', 'SBER', 'RU', 'RUB', '{"phone": "+7 (495) 500-55-50", "website": "sberbank.ru"}', 'Крупнейший банк России'),
('ВТБ', 'VTB', 'RU', 'RUB', '{"phone": "+7 (495) 739-77-99", "website": "vtb.ru"}', 'Второй по величине банк России'),
('Газпромбанк', 'GPB', 'RU', 'RUB', '{"phone": "+7 (495) 913-74-74", "website": "gazprombank.ru"}', 'Универсальный банк'),
('Альфа-Банк', 'ALFA', 'RU', 'RUB', '{"phone": "+7 (495) 788-88-78", "website": "alfabank.ru"}', 'Частный банк'),
('Райффайзенбанк', 'RZBR', 'RU', 'RUB', '{"phone": "+7 (495) 721-99-00", "website": "raiffeisen.ru"}', 'Дочерний банк австрийской группы')
ON CONFLICT (code) DO NOTHING;