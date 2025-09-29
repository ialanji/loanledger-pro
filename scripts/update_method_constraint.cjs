require('dotenv').config();
const { Client } = require('pg');

(async () => {
  try {
    // Build connection config similar to server.js
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    let client;

    if (connectionString && String(connectionString).trim()) {
      client = new Client({ connectionString });
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
        throw new Error(`Database configuration is incomplete. Missing: ${missing.join(', ')}. Set POSTGRES_* or DB_* variables in .env or provide POSTGRES_URL/DATABASE_URL.`);
      }

      client = new Client(cfg);
    }

    await client.connect();
    console.log('Connected to DB');

    // Use transaction to safely rewrite data + constraint
    await client.query('BEGIN');

    // Drop old constraint if exists
    await client.query('ALTER TABLE credits DROP CONSTRAINT IF EXISTS credits_method_check;');
    console.log('Dropped old credits_method_check (if existed)');

    // Normalize legacy/uppercase/unknown values to the four explicit lowercase methods
    await client.query("UPDATE credits SET method = 'classic_annuity' WHERE method IN ('fixed','FIXED','CLASSIC_ANNUITY')");
    await client.query("UPDATE credits SET method = 'classic_differentiated' WHERE method IN ('CLASSIC_DIFFERENTIATED')");
    await client.query("UPDATE credits SET method = 'floating_annuity' WHERE method IN ('floating','FLOATING','FLOATING_ANNUITY')");
    await client.query("UPDATE credits SET method = 'floating_differentiated' WHERE method IN ('FLOATING_DIFFERENTIATED')");

    // Set default for null/empty/other unexpected values
    await client.query("UPDATE credits SET method = 'classic_annuity' WHERE method IS NULL OR TRIM(method) = '' OR method NOT IN ('classic_annuity','classic_differentiated','floating_annuity','floating_differentiated')");

    // Add new strict constraint supporting only four explicit methods
    await client.query(
      "ALTER TABLE credits ADD CONSTRAINT credits_method_check CHECK (method IN ('classic_annuity','classic_differentiated','floating_annuity','floating_differentiated'))"
    );
    console.log('Added new credits_method_check with four explicit methods');

    await client.query('COMMIT');
    await client.end();
    process.exit(0);
  } catch (e) {
    try { await client?.query('ROLLBACK'); } catch {}
    console.error('Migration error:', e);
    process.exit(1);
  }
})();