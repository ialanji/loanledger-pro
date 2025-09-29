import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool;

if (connectionString) {
  pool = new Pool({ connectionString });
} else {
  const cfg = {
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    host: process.env.POSTGRES_HOST || process.env.DB_HOST,
    database: process.env.POSTGRES_DATABASE || process.env.DB_NAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT),
  };

  const missing = Object.entries(cfg)
    .filter(([key, val]) => (key === 'port' ? Number.isNaN(val) || !val : val === undefined || val === ''))
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(`Database configuration is incomplete. Missing: ${missing.join(', ')}`);
    throw new Error('Set POSTGRES_* or DB_* variables in .env or provide POSTGRES_URL/DATABASE_URL.');
  }

  pool = new Pool(cfg);
}

async function migrateExpenseSources() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: ensure expense_sources has all required columns...');

    // Ensure table exists minimally (do not create if missing; assume it exists). If it doesn't, script will fail gracefully on first ALTER.

    // import_mode
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS import_mode VARCHAR NOT NULL 
      DEFAULT 'google_sheets' 
      CHECK (import_mode IN ('google_sheets', 'file'));
    `);
    console.log('✔ ensured column: import_mode');

    // sheet_name
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS sheet_name VARCHAR;
    `);
    console.log('✔ ensured column: sheet_name');

    // range_start
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS range_start VARCHAR DEFAULT 'A2';
    `);
    console.log('✔ ensured column: range_start');

    // range_end
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS range_end VARCHAR;
    `);
    console.log('✔ ensured column: range_end');

    // column_mapping
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS column_mapping JSONB DEFAULT '{}'::jsonb;
    `);
    console.log('✔ ensured column: column_mapping');

    // is_active
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
    console.log('✔ ensured column: is_active');

    // import_settings
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS import_settings JSONB DEFAULT '{}'::jsonb;
    `);
    console.log('✔ ensured column: import_settings');

    // validation_rules
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT '{}'::jsonb;
    `);
    console.log('✔ ensured column: validation_rules');

    // last_import_at
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS last_import_at TIMESTAMPTZ;
    `);
    console.log('✔ ensured column: last_import_at');

    // created_at
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('✔ ensured column: created_at');

    // updated_at
    await client.query(`
      ALTER TABLE expense_sources 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('✔ ensured column: updated_at');

    // Create dept_aliases table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS dept_aliases (
        id SERIAL PRIMARY KEY,
        raw TEXT NOT NULL,
        canonical TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dept_aliases_raw ON dept_aliases (raw);`);
    console.log('✔ ensured table: dept_aliases');

    // Create supplier_aliases table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_aliases (
        id SERIAL PRIMARY KEY,
        raw TEXT NOT NULL,
        canonical TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_aliases_raw ON supplier_aliases (raw);`);
    console.log('✔ ensured table: supplier_aliases');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateExpenseSources();