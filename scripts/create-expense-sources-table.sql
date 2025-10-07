-- Create expense_sources table for managing data import sources
CREATE TABLE IF NOT EXISTS expense_sources (
    id SERIAL PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    sheet_url TEXT NOT NULL,
    import_mode VARCHAR(50) DEFAULT 'google_sheets',
    sheet_name VARCHAR(255),
    range_start VARCHAR(20),
    range_end VARCHAR(20),
    column_mapping JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    import_settings JSONB DEFAULT '{}',
    validation_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_expense_sources_category ON expense_sources(category);
CREATE INDEX IF NOT EXISTS idx_expense_sources_active ON expense_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_sources_created_at ON expense_sources(created_at);

-- Add comments for documentation
COMMENT ON TABLE expense_sources IS 'Configuration table for expense data import sources (Google Sheets, etc.)';
COMMENT ON COLUMN expense_sources.category IS 'Expense category for imported data';
COMMENT ON COLUMN expense_sources.sheet_url IS 'URL of the Google Sheets document';
COMMENT ON COLUMN expense_sources.import_mode IS 'Import method: google_sheets, csv, etc.';
COMMENT ON COLUMN expense_sources.sheet_name IS 'Name of the specific sheet/tab to import from';
COMMENT ON COLUMN expense_sources.range_start IS 'Starting cell range (e.g., A2)';
COMMENT ON COLUMN expense_sources.range_end IS 'Ending column range (e.g., Z)';
COMMENT ON COLUMN expense_sources.column_mapping IS 'JSON mapping of sheet columns to database fields';
COMMENT ON COLUMN expense_sources.is_active IS 'Whether this source is currently active for imports';
COMMENT ON COLUMN expense_sources.import_settings IS 'Additional import configuration settings';
COMMENT ON COLUMN expense_sources.validation_rules IS 'Data validation rules for imported data';