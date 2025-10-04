-- Add credit_type column to credits table
-- This migration adds support for credit type classification (investment vs working capital)

-- Add credit_type column with CHECK constraint and default value
ALTER TABLE credits 
ADD COLUMN credit_type VARCHAR(50) NOT NULL DEFAULT 'investment'
CHECK (credit_type IN ('investment', 'working_capital'));

-- Add index for potential filtering by credit type
CREATE INDEX IF NOT EXISTS idx_credits_credit_type ON credits(credit_type);

-- Add comment to document the column
COMMENT ON COLUMN credits.credit_type IS 'Type of credit: investment (Инвестиционный) or working_capital (Оборотные средства)';
