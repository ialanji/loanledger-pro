// Debug script to test updating credit_payment directly via PostgreSQL
// Usage: node debug_payment_update.cjs

const dotenv = require('dotenv');
const { Pool } = require('pg');

(async () => {
  try {
    dotenv.config();
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    let poolConfig;
    if (connectionString) {
      poolConfig = { connectionString };
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
        process.exit(1);
      }
      poolConfig = cfg;
    }

    const pool = new Pool(poolConfig);
    const client = await pool.connect();
    try {
      const id = '8988627c-18c1-474f-a5a0-5a161830a3fb';
      const status = 'paid';
      const paidAmountNum = 77254.79;

      console.log('Attempting direct SQL update for credit_payment...', { id, status, paidAmountNum });

      const sql = `
        UPDATE credit_payment
        SET status = $1::varchar(20),
            paid_amount = COALESCE($2::numeric, total_due, paid_amount),
            paid_at = CASE WHEN $1::varchar(20) IN ('paid'::varchar(20),'partial'::varchar(20)) THEN NOW() ELSE paid_at END,
            updated_at = NOW()
        WHERE id = $3::uuid
        RETURNING *
      `;

      const result = await client.query(sql, [status, paidAmountNum, id]);
      console.log('Update result rowCount:', result.rowCount);
      console.log('Updated row:', result.rows[0]);
    } catch (err) {
      console.error('Direct SQL update error:', {
        name: err?.name,
        code: err?.code,
        message: err?.message,
        detail: err?.detail,
        hint: err?.hint,
        position: err?.position,
        routine: err?.routine,
        schema: err?.schema,
        table: err?.table,
        column: err?.column,
        dataType: err?.dataType,
        constraint: err?.constraint,
        stack: err?.stack,
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (fatal) {
    console.error('Fatal error in debug script:', fatal);
    process.exit(1);
  }
})();