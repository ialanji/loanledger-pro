-- Create import_logs table for tracking expense import operations
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id UUID REFERENCES expense_sources(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'completed_with_errors', 'failed')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_details JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
-- CREATE INDEX IF NOT EXISTS idx_import_logs_source_id ON import_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_started_at ON import_logs(started_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_import_logs_updated_at ON import_logs;
CREATE TRIGGER update_import_logs_updated_at 
    BEFORE UPDATE ON import_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Policy for all users to access import logs (simplified for dev)
DROP POLICY IF EXISTS "Allow all access to import logs" ON import_logs;
CREATE POLICY "Allow all access to import logs" ON import_logs
    FOR ALL USING (true);