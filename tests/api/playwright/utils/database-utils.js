import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

let pool = null;

export function getPool() {
  if (!pool) {
    const poolConfig = {
      user: process.env.POSTGRES_USER || process.env.DB_USER,
      host: process.env.POSTGRES_HOST || process.env.DB_HOST,
      database: process.env.POSTGRES_DATABASE || process.env.DB_NAME,
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
      port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT),
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    
    pool = new Pool(poolConfig);
  }
  
  return pool;
}

export async function cleanupTestData() {
  const pool = getPool();
  
  try {
    // Clean up test data (data with 'Test' prefix)
    await pool.query("DELETE FROM aliases WHERE source_value LIKE 'Test%'");
    await pool.query("DELETE FROM expenses WHERE source LIKE 'Test%' OR description LIKE '%test%'");
    
    console.log('[DB CLEANUP] Test data cleaned up successfully');
  } catch (error) {
    console.error('[DB CLEANUP] Error cleaning up test data:', error);
    throw error;
  }
}

export async function setupTestData() {
  const pool = getPool();
  
  try {
    // Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS aliases (
        id SERIAL PRIMARY KEY,
        source_value VARCHAR(255) NOT NULL,
        normalized_value VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'supplier',
        is_group BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        source VARCHAR(255),
        date DATE NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'MDL',
        department VARCHAR(255),
        supplier VARCHAR(255),
        category VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('[DB SETUP] Test tables ensured to exist');
  } catch (error) {
    console.error('[DB SETUP] Error setting up test data:', error);
    throw error;
  }
}

export async function insertTestAlias(aliasData) {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'INSERT INTO aliases (source_value, normalized_value, type, is_group) VALUES ($1, $2, $3, $4) RETURNING *',
      [aliasData.source_value, aliasData.normalized_value, aliasData.type, aliasData.is_group]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('[DB INSERT] Error inserting test alias:', error);
    throw error;
  }
}

export async function insertTestExpense(expenseData) {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'INSERT INTO expenses (source, date, amount, currency, department, supplier, category, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        expenseData.source,
        expenseData.date,
        expenseData.amount,
        expenseData.currency,
        expenseData.department,
        expenseData.supplier,
        expenseData.category,
        expenseData.description
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('[DB INSERT] Error inserting test expense:', error);
    throw error;
  }
}

export async function getTableRowCount(tableName) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error(`[DB COUNT] Error getting row count for ${tableName}:`, error);
    return 0;
  }
}

export async function checkTableExists(tableName) {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
      [tableName]
    );
    
    return result.rows[0].exists;
  } catch (error) {
    console.error(`[DB CHECK] Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}