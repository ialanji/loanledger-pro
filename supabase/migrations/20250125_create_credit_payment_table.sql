-- Создание таблицы credit_payment для платежей по кредитам согласно ТЗ №2
CREATE TABLE IF NOT EXISTS credit_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  period_number INTEGER NOT NULL,
  principal_due DECIMAL(19,2) NOT NULL DEFAULT 0,
  interest_due DECIMAL(19,2) NOT NULL DEFAULT 0,
  total_due DECIMAL(19,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paid', 'partial', 'overdue', 'canceled')),
  paid_amount DECIMAL(19,2) DEFAULT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  recalculated_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT credit_payment_principal_due_non_negative CHECK (principal_due >= 0),
  CONSTRAINT credit_payment_interest_due_non_negative CHECK (interest_due >= 0),
  CONSTRAINT credit_payment_total_due_positive CHECK (total_due > 0),
  CONSTRAINT credit_payment_paid_amount_non_negative CHECK (paid_amount IS NULL OR paid_amount >= 0),
  CONSTRAINT credit_payment_period_number_positive CHECK (period_number > 0),
  CONSTRAINT credit_payment_recalculated_version_positive CHECK (recalculated_version > 0),
  
  -- Уникальность комбинации кредит + период + версия пересчета
  UNIQUE(credit_id, period_number, recalculated_version)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_credit_payment_credit_id ON credit_payment(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_payment_due_date ON credit_payment(due_date);
CREATE INDEX IF NOT EXISTS idx_credit_payment_status ON credit_payment(status);
CREATE INDEX IF NOT EXISTS idx_credit_payment_period_number ON credit_payment(period_number);
CREATE INDEX IF NOT EXISTS idx_credit_payment_recalculated_version ON credit_payment(recalculated_version);

-- Создание составного индекса для поиска актуальных платежей
CREATE INDEX IF NOT EXISTS idx_credit_payment_credit_period_version ON credit_payment(credit_id, period_number, recalculated_version DESC);

-- Создание триггера для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_credit_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_credit_payment_updated_at ON credit_payment;
CREATE TRIGGER update_credit_payment_updated_at
  BEFORE UPDATE ON credit_payment
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_payment_updated_at();

-- Настройка Row Level Security (RLS)
ALTER TABLE credit_payment ENABLE ROW LEVEL SECURITY;

-- Создание политики доступа (разрешить все операции для всех пользователей)
-- В реальном проекте здесь должны быть более строгие правила доступа
DROP POLICY IF EXISTS "Allow all access to credit_payment" ON credit_payment;
CREATE POLICY "Allow all access to credit_payment" ON credit_payment
  FOR ALL USING (true) WITH CHECK (true);

-- Комментарии к таблице и полям
COMMENT ON TABLE credit_payment IS 'Таблица платежей по кредитам с поддержкой версионности для пересчетов';
COMMENT ON COLUMN credit_payment.id IS 'Уникальный идентификатор платежа';
COMMENT ON COLUMN credit_payment.credit_id IS 'Ссылка на кредит';
COMMENT ON COLUMN credit_payment.due_date IS 'Дата платежа';
COMMENT ON COLUMN credit_payment.period_number IS 'Номер периода платежа';
COMMENT ON COLUMN credit_payment.principal_due IS 'Сумма основного долга к погашению';
COMMENT ON COLUMN credit_payment.interest_due IS 'Сумма процентов к погашению';
COMMENT ON COLUMN credit_payment.total_due IS 'Общая сумма к погашению';
COMMENT ON COLUMN credit_payment.status IS 'Статус платежа: scheduled, paid, partial, overdue, canceled';
COMMENT ON COLUMN credit_payment.paid_amount IS 'Фактически уплаченная сумма';
COMMENT ON COLUMN credit_payment.paid_at IS 'Дата фактической оплаты';
COMMENT ON COLUMN credit_payment.recalculated_version IS 'Версия пересчета для поддержки изменений ставок';