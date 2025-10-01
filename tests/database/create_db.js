import dotenv from 'dotenv';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build pool using connection string if provided, otherwise env vars
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

async function runMigrations() {
  try {
    console.log('Connecting to database...');
    
    // Get all migration files from supabase/migrations directory
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('Migrations directory not found:', migrationsDir);
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort chronologically by filename
    
    if (migrationFiles.length === 0) {
      console.log('No migration files found in', migrationsDir);
      return;
    }
    
    console.log(`Found ${migrationFiles.length} migration files:`);
    migrationFiles.forEach(file => console.log(`  - ${file}`));
    
    // Execute each migration file
    for (const file of migrationFiles) {
      console.log(`\nExecuting migration: ${file}`);
      
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`✓ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`✗ Migration ${file} failed:`, error.message);
        throw error; // Stop on first failure
      }
    }
    
    console.log('\n✓ All migrations completed successfully!');
    
    // Test the connection
    const result = await pool.query('SELECT 1 AS ok');
    console.log('Database connection test successful:', result.rows[0]);
    
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();