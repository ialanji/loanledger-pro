import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { google } from 'googleapis';
import { ScheduleEngine } from './src/services/schedule-engine.js';
import { initializePaymentProcessingJob, setupPaymentProcessingRoutes } from './src/jobs/ProcessDuePaymentsJob.js';
import cron from 'node-cron';

dotenv.config();

console.log('[BOOT]', { moduleUrl: import.meta.url, pid: process.pid, node: process.version });
+console.log('[BOOT PATHS]', { cwd: process.cwd(), argv: process.argv });

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8091' : '');

const app = express();

// Принудительная инициализация роутера Express через первый маршрут
app.get('/_init_router', (req, res) => res.status(404).end());
console.log('[ROUTER INIT] Router initialized via dummy route:', !!app._router);
const port = process.env.PORT || 3001;
const host = process.env.BIND_HOST || '127.0.0.1';

// Middleware
app.use(cors());
// Wrapped JSON parser with error handling
app.use((req, res, next) => {
  const jsonMiddleware = express.json();
  jsonMiddleware(req, res, (err) => {
    if (err) {
      console.error('[JSON Parse Error]', { method: req.method, url: req.url, message: err?.message, stack: err?.stack });
      res.set('X-Error-Handler', 'json-parser');
      return res.status(400).json({ error: 'Invalid JSON', details: err?.message });
    }
    next();
  });
});

// Global request logger for debugging
app.use((req, res, next) => {
  res.set('X-Global-Logger', 'active');
  console.log(`[REQ] ${req.method} ${req.url}`, { headers: req.headers });
  
  // Специальная отладка для admin routes
  if (req.url.startsWith('/api/admin')) {
    console.log(`[GLOBAL ADMIN DEBUG] URL: ${req.url}, Path: ${req.path}, Method: ${req.method}`);
    console.log(`[GLOBAL ADMIN DEBUG] About to call next() - should reach admin middleware`);
  }
  
  // Перехватываем res.end, res.send, res.json для отслеживания где завершается запрос
  const originalEnd = res.end;
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.end = function(...args) {
    if (req.url.startsWith('/api/admin')) {
      console.log(`[GLOBAL DEBUG] Request ${req.url} ended with res.end() - INTERCEPTED!`);
    }
    return originalEnd.apply(this, args);
  };
  
  res.send = function(...args) {
    if (req.url.startsWith('/api/admin')) {
      console.log(`[GLOBAL DEBUG] Request ${req.url} ended with res.send() - INTERCEPTED!`);
    }
    return originalSend.apply(this, args);
  };
  
  res.json = function(...args) {
    if (req.url.startsWith('/api/admin')) {
      console.log(`[GLOBAL DEBUG] Request ${req.url} ended with res.json() - INTERCEPTED!`, args[0]);
    }
    return originalJson.apply(this, args);
  };
  
  next();
});

// Path-specific middleware for /api/payments to verify routing
app.use('/api/payments', (req, res, next) => {
  res.set('X-Payments-Middleware', 'active');
  console.log(`[PAYMENTS] ${req.method} ${req.originalUrl}`);
  next();
});

// Временно удаляем admin middleware отсюда - переместим его перед fallback

// ProcessDuePaymentsJob API endpoints - УДАЛЯЕМ ОТСЮДА, ПЕРЕМЕЩАЕМ ПЕРЕД FALLBACK

console.log('[SERVER] ProcessDuePaymentsJob API endpoints configured directly');

// Debug ping routes for /api/payments
app.get('/api/payments/ping', (req, res) => {
  res.set('X-Payments-Ping', 'active');
  res.json({ ok: true, method: req.method, url: req.originalUrl });
});

app.put('/api/payments/ping', (req, res) => {
  res.set('X-Payments-Ping', 'active');
  res.json({ ok: true, method: req.method, url: req.originalUrl });
});

// Server version/debug endpoint
const __serverBootTime = new Date().toISOString();
app.get('/api/version', (req, res) => {
  res.json({ bootTime: __serverBootTime, hasPingRoutes: true });
});

// Startup route introspection
setTimeout(() => {
  try {
    console.log('[ROUTER DEBUG]', {
      hasRouter: !!app.router,
      routerStack: app.router?.stack?.length || 0,
      appKeys: Object.keys(app).filter(k => k.includes('router') || k.includes('stack')),
      appType: typeof app,
      appConstructor: app.constructor?.name
    });

    const routes = [];
    const visit = (stack) => {
      if (!Array.isArray(stack)) return;
      for (const layer of stack) {
        try {
          // Direct route layer
          if (layer?.route?.path) {
            const methods = Object.keys(layer.route.methods || {}).filter(m => layer.route.methods[m]);
            routes.push({ path: layer.route.path, methods });
            continue;
          }
          // Nested router layers (Express 5)
          if (Array.isArray(layer?.handle?.stack)) {
            visit(layer.handle.stack);
            continue;
          }
          // Fallback nested stacks
          if (Array.isArray(layer?.stack)) {
            visit(layer.stack);
            continue;
          }
        } catch {}
      }
    };
    visit(app?.router?.stack || []);

    console.log('[ROUTES DEBUG]', {
      total: routes.length,
      hasPingGet: routes.some(r => r.path === '/api/payments/ping' && r.methods.includes('get')),
      hasPingPut: routes.some(r => r.path === '/api/payments/ping' && r.methods.includes('put')),
      hasVersion: routes.some(r => r.path === '/api/version' && r.methods.includes('get')),
      hasAdminStatus: routes.some(r => r.path === '/api/admin/payments/process-due-job/status' && r.methods.includes('get')),
      hasAdminTrigger: routes.some(r => r.path === '/api/admin/payments/process-due-job' && r.methods.includes('post')),
      sample: routes.slice(0, 25)
    });
  } catch (err) {
    console.error('[ROUTES DEBUG ERROR]', err);
  }
}, 5000);

// PostgreSQL connection
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
    .filter(([key, val]) =>
      key === 'port' ? Number.isNaN(val) || !val : val === undefined || val === ''
    )
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(`Database configuration is incomplete. Missing: ${missing.join(', ')}`);
    throw new Error('Set POSTGRES_* or DB_* variables in .env or provide POSTGRES_URL/DATABASE_URL.');
  }

  poolConfig = cfg;
}

const pool = new Pool(poolConfig);

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Connected to PostgreSQL database');
    release();
  }
});

// Scheduled jobs
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('[GenerateScheduledPaymentsJob] Started at 09:00');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const creditsRes = await client.query('SELECT * FROM credits WHERE status = $1', ['active']);
      const credits = creditsRes.rows;
      for (const credit of credits) {
        const rawMethod = credit.calculation_method || credit.method;
        const normalizedMethod = (rawMethod === 'floating_annuity' || rawMethod === 'FLOATING_ANNUITY')
          ? 'floating_annuity'
          : (rawMethod === 'floating_differentiated' || rawMethod === 'FLOATING_DIFFERENTIATED')
            ? 'floating_differentiated'
            : (rawMethod === 'classic_differentiated' || rawMethod === 'CLASSIC_DIFFERENTIATED')
              ? 'classic_differentiated'
              : 'classic_annuity';
        const creditData = {
          id: credit.id,
          contractNumber: credit.number || credit.contract_number,
          principal: parseFloat(credit.principal),
          termMonths: parseInt(credit.term_months),
          startDate: new Date(credit.start_date),
          method: normalizedMethod,
          defermentMonths: parseInt(credit.deferment_months) || 0,
          paymentDay: parseInt(credit.payment_day) || 1,
          bankId: credit.bank_id
        };
        const ratesRes = await client.query('SELECT rate, effective_date FROM credit_rates WHERE credit_id = $1 ORDER BY effective_date ASC', [credit.id]);
        const rates = ratesRes.rows.map(r => ({
          annualPercent: parseFloat(r.rate) * 100,
          effectiveDate: r.effective_date ? new Date(r.effective_date) : undefined
        })).filter(r => r.effectiveDate instanceof Date && !isNaN(r.effectiveDate.getTime()));
        const adjustmentsRes = await client.query('SELECT * FROM principal_adjustments WHERE credit_id = $1 ORDER BY adjustment_date ASC', [credit.id]);
        const adjustments = adjustmentsRes.rows.map(adj => ({
          id: adj.id,
          loanId: adj.loan_id,
          amount: parseFloat(adj.amount),
          effectiveDate: new Date(adj.adjustment_date || adj.effective_date),
          type: adj.type
        })).filter(a => a.effectiveDate instanceof Date && !isNaN(a.effectiveDate.getTime()));
        const scheduleResponse = ScheduleEngine.generatePaymentScheduleResponse(creditData, rates, adjustments);
        const dueToday = scheduleResponse.schedule.filter(item => {
          const d = new Date(item.dueDate);
          const ds = d.toISOString().slice(0, 10);
          return ds === todayStr;
        });
        for (const item of dueToday) {
          const insertQuery = `
            INSERT INTO credit_payment (credit_id, due_date, period_number, principal_due, interest_due, total_due, status, recalculated_version)
            VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', 1)
            ON CONFLICT (credit_id, period_number, recalculated_version) DO NOTHING
          `;
          await client.query(insertQuery, [
            credit.id,
            new Date(item.dueDate).toISOString().slice(0, 10),
            item.periodNumber,
            item.principalDue,
            item.interestDue,
            item.totalDue
          ]);
        }
      }
      await client.query('COMMIT');
      console.log('[GenerateScheduledPaymentsJob] Completed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[GenerateScheduledPaymentsJob] Error:', err);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[GenerateScheduledPaymentsJob] Fatal error:', error);
  }
}, { timezone: 'Europe/Chisinau' });

// API Routes

// Import endpoints - MOVED TO TOP FOR PRIORITY
app.post('/api/expense-import/test', async (req, res) => {
  try {
    const { source_id } = req.body;
    console.log(`[IMPORT TEST] Source ID: ${source_id}, IP: ${req.ip}, Body:`, req.body);

    if (!source_id) {
      return res.status(400).json({ error: 'source_id is required' });
    }

    // Get source from database
    const sourceResult = await pool.query(
      'SELECT * FROM expense_sources WHERE id = $1 AND is_active = true',
      [source_id]
    );
    
    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Expense source not found or inactive' });
    }

    const source = sourceResult.rows[0];
    const spreadsheetId = extractSpreadsheetId(source.sheet_url);
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Invalid spreadsheet URL' });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: './credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    let range;
    if (source.range_start && String(source.range_start).trim()) {
      const end = (source.range_end && String(source.range_end).trim()) ? String(source.range_end).trim() : 'Z';
      range = `${String(source.range_start).trim()}:${end}`;
    } else if (source.range_end && String(source.range_end).trim()) {
      range = `A:${String(source.range_end).trim()}`;
    } else {
      range = 'A:Z';
    }
    const sheetName = source.sheet_name || 'Sheet1';
    const fullRange = `${sheetName}!${range}`;

    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange,
    });

    const rawData = response.data.values || [];
    const parsedData = parseSheetData(rawData, source.column_mapping || {}, source.category);

    const errors = [];
    const warnings = [];

    if (parsedData.length === 0) {
      warnings.push('No valid data rows found');
    }

    const emptyDescriptions = parsedData.filter(row => !row.description).length;
    if (emptyDescriptions > 0) {
      warnings.push(`Found ${emptyDescriptions} records with empty descriptions`);
    }

    const zeroAmounts = parsedData.filter(row => row.amount === 0).length;
    if (zeroAmounts > 0) {
      warnings.push(`Found ${zeroAmounts} records with zero amounts`);
    }

    const invalidDates = parsedData.filter(row => !row.date).length;
    if (invalidDates > 0) {
      errors.push(`Found ${invalidDates} records with invalid dates`);
    }

    res.json({
      success: errors.length === 0,
      total_rows: parsedData.length,
      preview_data: parsedData.slice(0, 5),
      errors,
      warnings
    });
  } catch (error) {
    console.error('Error testing import:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/expense-import/run', async (req, res) => {
  try {
    const { source_id } = req.body;
    console.log(`[IMPORT RUN] Source ID: ${source_id}, IP: ${req.ip}, Body:`, req.body);
    
    if (!source_id) {
      return res.status(400).json({ error: 'source_id is required' });
    }

    // Get source from database
    const sourceResult = await pool.query(
      'SELECT * FROM expense_sources WHERE id = $1 AND is_active = true',
      [source_id]
    );
    
    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Expense source not found or inactive' });
    }

    const source = sourceResult.rows[0];
    const spreadsheetId = extractSpreadsheetId(source.sheet_url);
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Invalid spreadsheet URL' });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: './credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    let range;
    if (source.range_start && String(source.range_start).trim()) {
      const end = (source.range_end && String(source.range_end).trim()) ? String(source.range_end).trim() : 'Z';
      range = `${String(source.range_start).trim()}:${end}`;
    } else if (source.range_end && String(source.range_end).trim()) {
      range = `A:${String(source.range_end).trim()}`;
    } else {
      range = 'A:Z';
    }
    const sheetName = source.sheet_name || 'Sheet1';
    const fullRange = `${sheetName}!${range}`;

    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange,
    });

    const rawData = response.data.values || [];
    const parsedData = parseSheetData(rawData, source.column_mapping || {}, source.category);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];
    const warnings = [];

    for (const row of parsedData) {
      try {
        if (!row.date || row.amount <= 0) {
          skippedCount++;
          warnings.push(`Skipped row with invalid date or amount: ${JSON.stringify(row)}`);
          continue;
        }

        await pool.query(
          `INSERT INTO expenses (
            source, date, amount, currency, department, supplier, category, description, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            source.category, // or source.id?
            row.date,
            row.amount,
            'MDL', // assume currency, or from config
            row.department || null,
            row.supplier || null,
            row.category,
            row.description || ''
          ]
        );
        importedCount++;
      } catch (err) {
        errorCount++;
        errors.push(`Error inserting row: ${err.message} - Data: ${JSON.stringify(row)}`);
      }
    }

    res.json({
      success: errorCount === 0,
      imported_count: importedCount,
      skipped_count: skippedCount,
      error_count: errorCount,
      errors,
      warnings
    });
  } catch (error) {
    console.error('Error running import:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { source, date, amount, currency, department, supplier, category, description } = req.body;
    
    const result = await pool.query(
      `INSERT INTO expenses (source, date, amount, currency, department, supplier, category, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [source, date, amount, currency, department, supplier, category, description]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { source, date, amount, currency, department, supplier, category, description } = req.body;
    
    const result = await pool.query(
      `UPDATE expenses 
       SET source = $1, date = $2, amount = $3, currency = $4, department = $5, 
           supplier = $6, category = $7, description = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [source, date, amount, currency, department, supplier, category, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint for debugging forecast data
app.get('/api/test/forecast-data', async (req, res) => {
  try {
    // Простой запрос для проверки данных
    const creditsResult = await pool.query(`
      SELECT 
        c.id,
        c.contract_number,
        c.principal,
        c.start_date,
        b.name as bank_name
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      WHERE CAST(c.principal AS DECIMAL) > 0
      LIMIT 5
    `);
    
    const ratesResult = await pool.query(`
      SELECT credit_id, rate, effective_date
      FROM credit_rates
      LIMIT 5
    `);
    
    res.json({
      credits: creditsResult.rows,
      rates: ratesResult.rows,
      creditsCount: creditsResult.rows.length,
      ratesCount: ratesResult.rows.length
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get import logs
app.get('/api/import-logs', async (req, res) => {
  try {
    const rawLimit = (req.query && req.query.limit) ? String(req.query.limit) : '300'
    const limitParsed = parseInt(rawLimit, 10)
    const limit = Math.min(Number.isFinite(limitParsed) ? limitParsed : 300, 1000)

    const rawOrder = (req.query && req.query.order) ? String(req.query.order) : 'completed_at:desc'
    let [orderColumn, orderDirectionRaw] = rawOrder.split(':')
    // Map legacy/alias column names
    if (orderColumn === 'finished_at') orderColumn = 'completed_at'

    const allowedColumns = ['completed_at', 'started_at', 'created_at', 'updated_at', 'status']
    const orderColumnSafe = allowedColumns.includes(orderColumn) ? orderColumn : 'completed_at'
    const orderDir = (orderDirectionRaw || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const baseSelect = `SELECT 
      source_id as source,
      completed_at,
      status,
      COALESCE(error_message, error_details::text) as error
    FROM import_logs`

    const whereParts = []
    const params = []

    // Optional filter by source_id
    if (req.query && req.query.source_id) {
      whereParts.push('source_id = $1')
      params.push(String(req.query.source_id))
    }

    const whereClause = whereParts.length > 0 ? ` WHERE ${whereParts.join(' AND ')}` : ''
    const orderClause = ` ORDER BY ${orderColumnSafe} ${orderDir}`
    const limitClause = params.length > 0 ? ` LIMIT $2` : ` LIMIT $1`

    const query = baseSelect + whereClause + orderClause + limitClause

    const finalParams = params.length > 0 ? [...params, limit] : [limit]
    const result = await pool.query(query, finalParams)
    res.json(result.rows)
  } catch (error) {
    // Gracefully handle missing table or columns
    if (error && typeof error === 'object' && 'code' in error && (error.code === '42P01' || error.code === '42703')) {
      return res.json([])
    }
    console.error('Error fetching import logs:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Expense sources CRUD
app.get('/api/expense-sources', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expense_sources ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      // Table does not exist yet – return empty list so UI can proceed
      return res.json([])
    }
    console.error('Error fetching expense sources:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/expense-sources', async (req, res) => {
  try {
    const { category, sheet_url, import_mode, sheet_name, range_start, range_end, column_mapping, is_active, import_settings, validation_rules } = req.body;
    const result = await pool.query(
      `INSERT INTO expense_sources (
         category, sheet_url, import_mode, sheet_name, range_start, range_end, column_mapping, is_active, import_settings, validation_rules, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
       RETURNING *`,
      [
        category,
        sheet_url,
        import_mode || 'google_sheets',
        sheet_name || null,
        range_start || null,
        range_end || null,
        column_mapping || {},
        typeof is_active === 'boolean' ? is_active : true,
        import_settings || {},
        validation_rules || {}
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense source:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/expense-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, sheet_url, import_mode, sheet_name, range_start, range_end, column_mapping, is_active, import_settings, validation_rules } = req.body;

    const result = await pool.query(
      `UPDATE expense_sources SET 
         category = COALESCE($1, category),
         sheet_url = COALESCE($2, sheet_url),
         import_mode = COALESCE($3, import_mode),
         sheet_name = COALESCE($4, sheet_name),
         range_start = COALESCE($5, range_start),
         range_end = COALESCE($6, range_end),
         column_mapping = COALESCE($7, column_mapping),
         is_active = COALESCE($8, is_active),
         import_settings = COALESCE($9, import_settings),
         validation_rules = COALESCE($10, validation_rules),
         updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        category ?? null,
        sheet_url ?? null,
        import_mode ?? null,
        sheet_name ?? null,
        range_start ?? null,
        range_end ?? null,
        column_mapping ?? null,
        typeof is_active === 'boolean' ? is_active : null,
        import_settings ?? null,
        validation_rules ?? null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense source not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense source:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test import from expense source
app.post('/api/expense-sources/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the expense source configuration
    const sourceResult = await pool.query(
      'SELECT * FROM expense_sources WHERE id = $1',
      [id]
    );

    if (!sourceResult.rows.length) {
      return res.status(404).json({ error: 'Source configuration not found' });
    }

    const source = sourceResult.rows[0];

    if (!source.is_active) {
      return res.status(400).json({ error: 'Source is not active' });
    }

    // Mock test result for now - in production this would call actual import logic
    const testResult = {
      success: true,
      preview_count: 5,
      total_rows: 10,
      valid_rows: 8,
      invalid_rows: 2,
      errors: [],
      warnings: ['2 rows have missing data'],
      sample_data: [
        {
          date: '2024-01-15',
          amount: 1500.00,
          description: 'Sample expense 1',
          category: source.category
        },
        {
          date: '2024-01-16', 
          amount: 2300.50,
          description: 'Sample expense 2',
          category: source.category
        }
      ]
    };

    res.json(testResult);
  } catch (error) {
    console.error('Error testing import:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete expense source
app.delete('/api/expense-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM expense_sources WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense source not found' });
    }
    
    res.json({ message: 'Expense source deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense source:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alias management routes

// Get all aliases
app.get('/api/aliases', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aliases ORDER BY created_at DESC');
    const rows = (result.rows || []).map((r) => ({
      ...r,
      is_group: typeof r.is_group === 'boolean' ? r.is_group : r.alias === r.canonical_name,
    }));
    res.json(rows);
  } catch (error) {
    console.error('Error fetching aliases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new alias
app.post('/api/aliases', async (req, res) => {
  try {
    const { alias, canonical_name, type, is_group } = req.body;
    
    if (!alias || !canonical_name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const canonicalEffective = is_group ? alias : canonical_name;
    
    const result = await pool.query(
      'INSERT INTO aliases (alias, canonical_name, type) VALUES ($1, $2, $3) RETURNING *',
      [alias, canonicalEffective, type]
    );
    
    const row = result.rows[0];
    res.status(201).json({
      ...row,
      is_group: typeof row.is_group === 'boolean' ? row.is_group : row.alias === row.canonical_name,
    });
  } catch (error) {
    console.error('Error creating alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update alias
app.put('/api/aliases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { alias, canonical_name, type, is_group } = req.body;
    
    if (!alias || !canonical_name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const canonicalEffective = is_group ? alias : canonical_name;
    
    const result = await pool.query(
      'UPDATE aliases SET alias = $1, canonical_name = $2, type = $3 WHERE id = $4 RETURNING *',
      [alias, canonicalEffective, type, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alias not found' });
    }
    
    const row = result.rows[0];
    res.json({
      ...row,
      is_group: typeof row.is_group === 'boolean' ? row.is_group : row.alias === row.canonical_name,
    });
  } catch (error) {
    console.error('Error updating alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete alias
app.delete('/api/aliases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM aliases WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alias not found' });
    }
    
    res.json({ message: 'Alias deleted successfully' });
  } catch (error) {
    console.error('Error deleting alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Department aliases routes
app.get('/api/dept-aliases', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dept_aliases ORDER BY created_at DESC');
    const rows = (result.rows || []).map((r) => ({
      ...r,
      is_group: typeof r.is_group === 'boolean' ? r.is_group : r.raw === r.canonical,
    }));
    res.json(rows);
  } catch (error) {
    console.error('Error fetching dept aliases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/dept-aliases', async (req, res) => {
  try {
    const { raw, canonical, is_group } = req.body;
    
    if (!raw || !canonical) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const canonicalEffective = is_group ? raw : canonical;
    
    const result = await pool.query(
      'INSERT INTO dept_aliases (raw, canonical) VALUES ($1, $2) RETURNING *',
      [raw, canonicalEffective]
    );
    
    const row = result.rows[0];
    res.status(201).json({
      ...row,
      is_group: typeof row.is_group === 'boolean' ? row.is_group : row.raw === row.canonical,
    });
  } catch (error) {
    console.error('Error creating dept alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/dept-aliases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { raw, canonical, is_group } = req.body;
    
    if (!raw || !canonical) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const canonicalEffective = is_group ? raw : canonical;
    
    const result = await pool.query(
      'UPDATE dept_aliases SET raw = $1, canonical = $2 WHERE id = $3 RETURNING *',
      [raw, canonicalEffective, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dept alias not found' });
    }
    
    const row = result.rows[0];
    res.json({
      ...row,
      is_group: typeof row.is_group === 'boolean' ? row.is_group : row.raw === row.canonical,
    });
  } catch (error) {
    console.error('Error updating dept alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/dept-aliases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM dept_aliases WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dept alias not found' });
    }
    
    res.json({ message: 'Dept alias deleted successfully' });
  } catch (error) {
    console.error('Error deleting dept alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Supplier aliases routes
app.get('/api/supplier-aliases', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM supplier_aliases ORDER BY created_at DESC');
    const rows = (result.rows || []).map((r) => ({
      ...r,
      is_group: typeof r.is_group === 'boolean' ? r.is_group : r.raw === r.canonical,
    }));
    res.json(rows);
  } catch (error) {
    console.error('Error fetching supplier aliases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/supplier-aliases', async (req, res) => {
  try {
    const { raw, canonical, is_group } = req.body;
    
    if (!raw || !canonical) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const canonicalEffective = is_group ? raw : canonical;
    
    const result = await pool.query(
      'INSERT INTO supplier_aliases (raw, canonical) VALUES ($1, $2) RETURNING *',
      [raw, canonicalEffective]
    );
    
    const row = result.rows[0];
    res.status(201).json({
      ...row,
      is_group: typeof row.is_group === 'boolean' ? row.is_group : row.raw === row.canonical,
    });
  } catch (error) {
    console.error('Error creating supplier alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/supplier-aliases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { raw, canonical, is_group } = req.body;
    
    if (!raw || !canonical) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const canonicalEffective = is_group ? raw : canonical;
    
    const result = await pool.query(
      'UPDATE supplier_aliases SET raw = $1, canonical = $2 WHERE id = $3 RETURNING *',
      [raw, canonicalEffective, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier alias not found' });
    }
    
    const row = result.rows[0];
    res.json({
      ...row,
      is_group: typeof row.is_group === 'boolean' ? row.is_group : row.raw === row.canonical,
    });
  } catch (error) {
    console.error('Error updating supplier alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/supplier-aliases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM supplier_aliases WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier alias not found' });
    }
    
    res.json({ message: 'Supplier alias deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Banking endpoints
// GET /api/banks - Get all banks
app.get('/api/banks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, code, country, currency_code, contact_info, notes, 
             created_at, updated_at 
      FROM banks 
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    // Gracefully handle missing table
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return res.json([]);
    }
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/banks - Create a new bank
app.post('/api/banks', async (req, res) => {
  try {
    const { name, code, country, currencyCode, contactInfo, notes } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: 'Missing required field: name' 
      });
    }

    // Insert bank
    const result = await pool.query(`
      INSERT INTO banks (name, code, country, currency_code, contact_info, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, code || null, country || null, currencyCode || null, contactInfo || null, notes || null]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bank:', error);
    
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Bank name or code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// DELETE /api/banks/:id - Delete a bank
app.delete('/api/banks/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const bankId = req.params.id;
    
    // Check if bank exists
    const bankResult = await client.query('SELECT * FROM banks WHERE id = $1', [bankId]);
    if (bankResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bank not found' });
    }
    
    // Check if bank has credits - if yes, prevent deletion
    const creditsResult = await client.query('SELECT COUNT(*) FROM credits WHERE bank_id = $1', [bankId]);
    const hasCredits = parseInt(creditsResult.rows[0].count) > 0;
    
    if (hasCredits) {
      return res.status(400).json({ 
        error: 'Cannot delete bank with existing credits',
        message: 'Банк с существующими кредитами не может быть удален'
      });
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    try {
      // Delete the bank
      const deleteResult = await client.query('DELETE FROM banks WHERE id = $1 RETURNING *', [bankId]);
      
      await client.query('COMMIT');
      
      res.json({ 
        message: 'Bank deleted successfully',
        deletedBank: deleteResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting bank:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/credits - Get all credits with bank information
app.get('/api/credits', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.contract_number, c.principal, c.currency_code, c.bank_id,
             c.method, c.payment_day, c.start_date, c.term_months, 
             c.deferment_months, c.initial_rate, c.rate_effective_date,
             c.credit_type, c.notes, c.created_at, c.updated_at,
             b.name as bank_name, b.code as bank_code
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    // Gracefully handle missing table or columns
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '42P01') {
        // Table does not exist yet – return empty list so UI can proceed
        return res.json([]);
      }
      if (error.code === '42703') {
        // Missing column(s) – fallback to minimal selection
        try {
          const fallback = await pool.query(`
            SELECT c.id, c.contract_number, c.principal, c.currency_code, c.bank_id, c.method, c.payment_day, c.start_date, c.term_months, c.deferment_months, c.initial_rate, c.rate_effective_date, c.notes, c.created_at, c.updated_at
            FROM credits c
            ORDER BY c.created_at DESC
          `);
          return res.json(fallback.rows);
        } catch (e) {
          // If fallback also fails, return empty array
          return res.json([]);
        }
      }
    }
    console.error('Error fetching credits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TEST endpoint - simple version
app.get('/api/credits/totals-by-type-test', async (req, res) => {
  console.log('=== TEST endpoint called ===');
  res.json({ test: 'working', investment: 0, working_capital: 0, total: 0 });
});

// GET /api/credits/totals-by-type - Get credit totals aggregated by credit type
app.get('/api/credits/totals-by-type', async (req, res) => {
  console.log('=== GET /api/credits/totals-by-type called ===');
  try {
    console.log('Executing query...');
    const result = await pool.query(`
      SELECT 
        credit_type,
        COALESCE(SUM(principal), 0) as total
      FROM credits
      GROUP BY credit_type
    `);
    
    console.log('Query result:', JSON.stringify(result.rows));
    
    // Initialize totals
    let investmentTotal = 0;
    let workingCapitalTotal = 0;
    
    // Process results
    result.rows.forEach(row => {
      const total = parseFloat(row.total) || 0;
      console.log(`Processing row: ${row.credit_type} = ${total}`);
      if (row.credit_type === 'investment') {
        investmentTotal = total;
      } else if (row.credit_type === 'working_capital') {
        workingCapitalTotal = total;
      }
    });
    
    // Calculate overall total
    const overallTotal = investmentTotal + workingCapitalTotal;
    
    const response = {
      investment: investmentTotal,
      working_capital: workingCapitalTotal,
      total: overallTotal
    };
    
    console.log('Sending response:', JSON.stringify(response));
    res.json(response);
  } catch (error) {
    console.error('=== ERROR in /api/credits/totals-by-type ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
    // Gracefully handle missing table or columns
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '42P01' || error.code === '42703') {
        // Table or column does not exist - return zeros
        console.log('Returning zeros due to missing table/column');
        return res.json({
          investment: 0,
          working_capital: 0,
          total: 0
        });
      }
    }
    console.error('Returning 500 error');
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/credits/:id - Get a specific credit by ID
app.get('/api/credits/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Skip to next route for special endpoints
    if (id === 'by-contract' || id === 'totals-by-type' || id === 'totals-by-type-test') {
      return next();
    }
    
    let result;
    try {
      result = await pool.query(`
        SELECT c.id, c.contract_number, c.principal, c.currency_code, c.bank_id,
               c.method, c.payment_day, c.start_date, c.term_months, 
               c.deferment_months, c.initial_rate, c.rate_effective_date,
               c.credit_type, c.notes, c.created_at, c.updated_at,
               b.name as bank_name, b.code as bank_code
        FROM credits c
        LEFT JOIN banks b ON c.bank_id = b.id
        WHERE c.id = $1
      `, [id]);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '42P01') {
          return res.status(404).json({ error: 'Credit not found' });
        }
        if (error.code === '42703') {
          // Fallback to minimal schema when some columns are missing
          result = await pool.query(`
            SELECT c.id, c.contract_number, c.principal, c.currency_code, c.bank_id, c.method, c.payment_day, c.start_date, c.term_months, c.deferment_months, c.initial_rate, c.rate_effective_date, c.notes, c.created_at, c.updated_at
            FROM credits c
            WHERE c.id = $1
          `, [id]);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }

    const normalize = (m) => {
      if (!m) return 'classic_annuity';
      const v = String(m);
      if (v === 'CLASSIC_ANNUITY' || v === 'classic_annuity' || v === 'fixed') return 'classic_annuity';
      if (v === 'CLASSIC_DIFFERENTIATED' || v === 'classic_differentiated') return 'classic_differentiated';
      if (v === 'FLOATING_ANNUITY' || v === 'floating_annuity' || v === 'floating') return 'floating_annuity';
      if (v === 'FLOATING_DIFFERENTIATED' || v === 'floating_differentiated') return 'floating_differentiated';
      return 'classic_annuity';
    };

    const credit = result.rows[0];
    credit.method = normalize(credit.calculation_method || credit.method);
    
    res.json(credit);
  } catch (error) {
    console.error('Error fetching credit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/credits - Create a new credit
app.post('/api/credits', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      contractNumber,
      principal,
      currencyCode,
      bankId,
      method,
      paymentDay,
      startDate,
      termMonths,
      defermentMonths,
      initialRate,
      rateEffectiveDate,
      notes,
      rateHistory,
      creditType
    } = req.body;

    // Validate required fields
    if (!contractNumber || !principal || !currencyCode || !bankId || !method || !startDate || !termMonths) {
      return res.status(400).json({ 
        error: 'Missing required fields: contractNumber, principal, currencyCode, bankId, method, startDate, termMonths' 
      });
    }

    // Validate creditType if provided
    const validCreditTypes = ['investment', 'working_capital'];
    
    if (creditType && !validCreditTypes.includes(creditType)) {
      return res.status(400).json({ 
        error: 'Invalid credit type. Must be "investment" or "working_capital"' 
      });
    }
    
    const dbCreditType = creditType || 'investment'; // Default to 'investment'

    // Normalize method to four explicit values
    const normalizeMethod = (m) => {
      const v = (typeof m === 'string') ? m : String(m);
      if (v === 'CLASSIC_ANNUITY' || v === 'classic_annuity' || v === 'fixed') return 'classic_annuity';
      if (v === 'CLASSIC_DIFFERENTIATED' || v === 'classic_differentiated') return 'classic_differentiated';
      if (v === 'FLOATING_ANNUITY' || v === 'floating_annuity' || v === 'floating') return 'floating_annuity';
      if (v === 'FLOATING_DIFFERENTIATED' || v === 'floating_differentiated') return 'floating_differentiated';
      return 'classic_annuity';
    };
    const dbMethod = normalizeMethod(method);

    // Validate and convert initial rate (max 9.9999 for DECIMAL(5,4))
    let dbInitialRate = initialRate;
    if (initialRate && initialRate > 9.9999) {
      dbInitialRate = initialRate / 100; // Convert percentage to decimal
    }

    // Insert credit
    const creditResult = await client.query(`
      INSERT INTO credits (
        contract_number, principal, currency_code, bank_id, method, 
        payment_day, start_date, term_months, deferment_months, 
        initial_rate, rate_effective_date, notes, credit_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      contractNumber, principal, currencyCode, bankId, dbMethod,
      paymentDay, startDate, termMonths, defermentMonths,
      dbInitialRate, rateEffectiveDate, notes, dbCreditType
    ]);

    const credit = creditResult.rows[0];

    // Insert rate history if provided and method is floating
    const isFloatingMethod = (m) => {
      const v = String(m);
      return v === 'FLOATING_ANNUITY' || v === 'floating_annuity' || v === 'FLOATING_DIFFERENTIATED' || v === 'floating_differentiated';
    };
    if ((isFloatingMethod(method) || isFloatingMethod(dbMethod)) && rateHistory && Array.isArray(rateHistory)) {
      for (const rate of rateHistory) {
        const rateValue = rate.annualPercent || rate.rate;
        if (rateValue && rate.effectiveDate) {
          // Convert percentage to decimal if needed
          let dbRateValue = rateValue;
          if (rateValue > 9.9999) {
            dbRateValue = rateValue / 100;
          }
          
          await client.query(`
            INSERT INTO credit_rates (credit_id, rate, effective_date, notes)
            VALUES ($1, $2, $3, $4)
          `, [credit.id, dbRateValue, rate.effectiveDate, rate.note || rate.notes || null]);
        }
      }
    }

    await client.query('COMMIT');
    
    // Fetch the complete credit with bank info
    const completeResult = await pool.query(`
      SELECT c.*, b.name as bank_name, b.code as bank_code
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      WHERE c.id = $1
    `, [credit.id]);

    const normalize = (m) => {
      if (!m) return 'classic_annuity';
      const v = (typeof m === 'string') ? m : String(m);
      if (v === 'fixed' || v === 'CLASSIC_ANNUITY') return 'classic_annuity';
      if (v === 'classic_annuity') return 'classic_annuity';
      if (v === 'CLASSIC_DIFFERENTIATED' || v === 'classic_differentiated') return 'classic_differentiated';
      if (v === 'FLOATING_ANNUITY' || v === 'floating_annuity') return 'floating_annuity';
      if (v === 'FLOATING_DIFFERENTIATED' || v === 'floating_differentiated') return 'floating_differentiated';

      return 'classic_annuity';
    };

    const created = completeResult.rows[0];
    created.method = normalize(created.calculation_method || created.method);

    res.status(201).json(created);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating credit:', error);
    
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Contract number already exists' });
    } else if (error.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid bank ID' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    client.release();
  }
});

// GET /api/credits/:id/rates - Get credit rate history
app.get('/api/credits/:id/rates', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT id, rate,
             to_char(effective_date::date, 'YYYY-MM-DD') as effective_date,
             notes, created_at
      FROM credit_rates 
      WHERE credit_id = $1 
      ORDER BY effective_date ASC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching credit rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/credits/:id/payments - Get credit payment schedule
app.get('/api/credits/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the credit details
    const creditResult = await pool.query(`
      SELECT * FROM credits WHERE id = $1
    `, [id]);
    
    if (creditResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }
    
    const credit = creditResult.rows[0];
    
    // Get rate history for floating methods
    const ratesResult = await pool.query(`
      SELECT rate, effective_date, notes
      FROM credit_rates 
      WHERE credit_id = $1 
      ORDER BY effective_date ASC
    `, [id]);
    
    // Get principal adjustments (if any) to include in schedule generation
    const adjustmentsQuery = `
      SELECT * FROM principal_adjustments 
      WHERE credit_id = $1 
      ORDER BY adjustment_date ASC
    `;
    const adjustmentsResult = await pool.query(adjustmentsQuery, [id]);

    // Import ScheduleEngine for schedule calculation
    const { ScheduleEngine } = await import('./src/services/schedule-engine.js');
    
    // Normalize calculation method to one of four explicit values
    const rawMethod = credit.calculation_method || credit.method;
    const normalizedMethod = (rawMethod === 'floating_annuity' || rawMethod === 'FLOATING_ANNUITY')
      ? 'floating_annuity'
      : (rawMethod === 'floating_differentiated' || rawMethod === 'FLOATING_DIFFERENTIATED')
        ? 'floating_differentiated'
        : (rawMethod === 'classic_differentiated' || rawMethod === 'CLASSIC_DIFFERENTIATED')
          ? 'classic_differentiated'
          : 'classic_annuity';
    
    // Преобразуем данные в нужный формат (в соответствии с ScheduleEngine)
    const creditData = {
      id: credit.id,
      contractNumber: credit.contract_number,
      principal: parseFloat(credit.principal),
      termMonths: parseInt(credit.term_months),
      startDate: new Date(credit.start_date),
      method: normalizedMethod,
      defermentMonths: parseInt(credit.deferment_months) || 0,
      paymentDay: parseInt(credit.payment_day) || 1,
      bankId: credit.bank_id
    };
    
    const rates = Array.isArray(ratesResult.rows) ? ratesResult.rows.map(r => ({
      annualPercent: parseFloat(r.rate) * 100, // DB stores decimals (e.g., 0.155 => 15.5%)
      effectiveDate: r.effective_date ? new Date(r.effective_date) : undefined
    })).filter(r => r.effectiveDate instanceof Date && !isNaN(r.effectiveDate.getTime())) : [];
    
    const adjustments = Array.isArray(adjustmentsResult.rows) ? adjustmentsResult.rows.map(adj => ({
      id: adj.id,
      loanId: adj.loan_id,
      amount: parseFloat(adj.amount),
      effectiveDate: new Date(adj.adjustment_date || adj.effective_date),
      type: adj.type
    })).filter(a => a.effectiveDate instanceof Date && !isNaN(a.effectiveDate.getTime())) : [];
    
    // Генерируем полный ответ с графиком платежей
    const response = ScheduleEngine.generatePaymentScheduleResponse(
      creditData,
      rates,
      adjustments
    );
    
    res.json(response);
  } catch (error) {
    console.error('Error generating payment schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check credit_payment table
app.get('/api/debug/credit_payment/:creditId', async (req, res) => {
  try {
    const { creditId } = req.params;
    const query = `
      SELECT 
        id, credit_id, period_number, due_date, 
        principal_due, interest_due, total_due, 
        status, paid_amount, paid_at
      FROM credit_payment 
      WHERE credit_id = $1 
      ORDER BY period_number ASC
    `;
    const result = await pool.query(query, [creditId]);
    res.json({
      count: result.rows.length,
      payments: result.rows
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check payments table
app.get('/api/debug/payments/:creditId', async (req, res) => {
  try {
    const { creditId } = req.params;
    const query = `
      SELECT 
        id, credit_id, amount, 
        payment_date, created_at, updated_at
      FROM payments 
      WHERE credit_id = $1 
      ORDER BY payment_date ASC
    `;
    const result = await pool.query(query, [creditId]);
    res.json({
      count: result.rows.length,
      payments: result.rows
    });
  } catch (error) {
    console.error('Debug payments endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Additional payment endpoints

// GET /api/payments - List all payments (optionally filter by status or creditId)
app.get('/api/payments', async (req, res) => {
  try {
    const { status, creditId } = req.query;
    const params = [];
    const whereClauses = [];

    if (status) {
      whereClauses.push(`LOWER(cp.status) = LOWER($${params.length + 1})`);
      params.push(status);
    }
    if (creditId) {
      whereClauses.push(`cp.credit_id = $${params.length + 1}`);
      params.push(creditId);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        cp.id,
        cp.credit_id,
        cp.period_number,
        cp.due_date,
        cp.principal_due,
        cp.interest_due,
        cp.total_due,
        cp.status,
        c.contract_number
      FROM credit_payment cp
      LEFT JOIN credits c ON c.id = cp.credit_id
      ${where}
      ORDER BY cp.due_date DESC
    `;

    const result = await pool.query(query, params);
    res.set('X-Payments-List', 'active');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payments/historical - List historical payments from credit_payment table (actual paid payments)
app.get('/api/payments/historical', async (req, res) => {
  try {
    const { creditId } = req.query;
    const params = [];
    const whereClauses = ['cp.status = $1'];
    params.push('paid');

    if (creditId) {
      whereClauses.push(`cp.credit_id = $${params.length + 1}`);
      params.push(creditId);
    }

    const where = `WHERE ${whereClauses.join(' AND ')}`;

    const query = `
      SELECT 
        cp.id,
        cp.credit_id,
        cp.paid_amount as payment_amount,
        cp.interest_due as interest_amount,
        cp.principal_due as principal_amount,
        cp.paid_at as payment_date,
        cp.status,
        c.contract_number
      FROM credit_payment cp
      LEFT JOIN credits c ON c.id = cp.credit_id
      ${where}
      ORDER BY cp.paid_at DESC
    `;

    const result = await pool.query(query, params);
    res.set('X-Historical-Payments', 'active');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching historical payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/credits/by-contract - Resolve by contract number via query and redirect
app.get('/api/credits/by-contract', async (req, res) => {
  try {
    const contractNumber = typeof req.query.contractNumber === 'string' ? req.query.contractNumber : undefined;
    if (!contractNumber) {
      return res.status(400).json({ error: 'contractNumber query parameter is required' });
    }

    const result = await pool.query('SELECT id FROM credits WHERE contract_number = $1 LIMIT 1', [contractNumber]);
    if (!result || result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }

    const id = result.rows[0].id;
    const page = typeof req.query.page === 'string' ? req.query.page : 'manual-calculation';
    const allowed = new Set(['manual-calculation', 'schedule']);
    const target = allowed.has(page) ? page : 'manual-calculation';

    const buildRedirectUrl = (creditId, targetPage) => {
      const path = `/credits/${creditId}/${targetPage}`;
      if (FRONTEND_BASE_URL) {
        return `${FRONTEND_BASE_URL}${path}`;
      }
      return path;
    };

    const accepts = (req.headers.accept || '').toString();
    if (!accepts.includes('text/html')) {
      const path = `/credits/${id}/${target}`;
      const absolute = buildRedirectUrl(id, target);
      return res.json({ id, target, path, absolute });
    }
    const redirectUrl = buildRedirectUrl(id, target);
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error resolving credit by contract number (query):', err);
    return res.status(500).json({ error: 'Failed to resolve credit by contract number' });
  }
});

// GET /api/credits/by-contract/:contractNumber - Resolve by contract number in path and redirect
app.get('/api/credits/by-contract/:contractNumber', async (req, res) => {
  try {
    const { contractNumber } = req.params;
    const result = await pool.query('SELECT id FROM credits WHERE contract_number = $1 LIMIT 1', [contractNumber]);
    if (!result || result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }

    const id = result.rows[0].id;
    const page = typeof req.query.page === 'string' ? req.query.page : 'manual-calculation';
    const allowed = new Set(['manual-calculation', 'schedule']);
    const target = allowed.has(page) ? page : 'manual-calculation';

    const buildRedirectUrl = (creditId, targetPage) => {
      const path = `/credits/${creditId}/${targetPage}`;
      if (FRONTEND_BASE_URL) {
        return `${FRONTEND_BASE_URL}${path}`;
      }
      return path;
    };
    const redirectUrl = buildRedirectUrl(id, target);
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error resolving credit by contract number (path):', err);
    return res.status(500).json({ error: 'Failed to resolve credit by contract number' });
  }
});

// GET /api/credits/by-contract/:contractNumber/manual-calculation - Explicit target
app.get('/api/credits/by-contract/:contractNumber/manual-calculation', async (req, res) => {
  try {
    const { contractNumber } = req.params;
    const result = await pool.query('SELECT id FROM credits WHERE contract_number = $1 LIMIT 1', [contractNumber]);
    if (!result || result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }
    const id = result.rows[0].id;
    const buildRedirectUrl = (creditId, targetPage) => {
      const path = `/credits/${creditId}/${targetPage}`;
      if (FRONTEND_BASE_URL) {
        return `${FRONTEND_BASE_URL}${path}`;
      }
      return path;
    };
    const redirectUrl = buildRedirectUrl(id, 'manual-calculation');
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error resolving credit by contract number (manual-calculation):', err);
    return res.status(500).json({ error: 'Failed to resolve credit by contract number' });
  }
});

// GET /api/credits/by-contract/:contractNumber/schedule - Explicit target
app.get('/api/credits/by-contract/:contractNumber/schedule', async (req, res) => {
  try {
    const { contractNumber } = req.params;
    const result = await pool.query('SELECT id FROM credits WHERE contract_number = $1 LIMIT 1', [contractNumber]);
    if (!result || result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }
    const id = result.rows[0].id;
    const buildRedirectUrl = (creditId, targetPage) => {
      const path = `/credits/${creditId}/${targetPage}`;
      if (FRONTEND_BASE_URL) {
        return `${FRONTEND_BASE_URL}${path}`;
      }
      return path;
    };
    const redirectUrl = buildRedirectUrl(id, 'schedule');
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error resolving credit by contract number (schedule):', err);
    return res.status(500).json({ error: 'Failed to resolve credit by contract number' });
  }
});

// GET /api/credits/:id/payments/unprocessed - List unprocessed payments for a credit
app.get('/api/credits/:id/payments/unprocessed', async (req, res) => {
  try {
    console.log('=== ENDPOINT START: Unprocessed payments request ===');
    const { id } = req.params;
    console.log('Unprocessed payments request for credit ID:', id);
    // Фильтруем только неоплаченные платежи до текущего месяца
    const now = new Date();
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    console.log('End of current month:', endOfCurrentMonth.toISOString().slice(0, 10));
    
    // Сначала пытаемся получить существующие платежи
    const existingQuery = `
      SELECT 
        id,
        credit_id,
        period_number,
        due_date,
        principal_due,
        interest_due,
        total_due,
        status
      FROM credit_payment
      WHERE credit_id = $1
        AND LOWER(status) NOT IN ('paid', 'completed')
        AND due_date <= $2
      ORDER BY due_date ASC
    `;
    
    try {
      const result = await pool.query(existingQuery, [id, endOfCurrentMonth.toISOString().slice(0, 10)]);
      if (result.rows.length > 0) {
        return res.json(result.rows);
      }
      
      // Если нет неоплаченных платежей, проверим есть ли записи в credit_payment
      // и сколько периодов должно быть до текущего месяца
      const allPaymentsQuery = `
        SELECT period_number, status, due_date
        FROM credit_payment
        WHERE credit_id = $1
        AND due_date <= $2
        ORDER BY period_number ASC
      `;
      const allPaymentsResult = await pool.query(allPaymentsQuery, [id, endOfCurrentMonth.toISOString().slice(0, 10)]);
      
      if (allPaymentsResult.rows.length > 0) {
        // Есть записи в credit_payment для периодов до текущего месяца
        // Проверим, все ли они оплачены
        const unpaidCount = allPaymentsResult.rows.filter(p => 
          !['paid', 'completed'].includes(p.status.toLowerCase())
        ).length;
        
        if (unpaidCount === 0) {
          // Все платежи до текущего месяца оплачены - возвращаем пустой массив
          return res.json([]);
        }
      }
    } catch (tableError) {
      // Таблица может не существовать, продолжаем с генерацией из графика
      console.log('Error querying credit_payment table:', tableError.message);
      console.log('Continuing with schedule generation');
    }
    
    // Если нет существующих платежей, генерируем через ScheduleEngine
    // Но сначала получаем все существующие платежи (включая оплаченные) для исключения из списка
    const allExistingPaymentsQuery = `
      SELECT period_number, status
      FROM credit_payment
      WHERE credit_id = $1
    `;
    let existingPeriods = new Set();
    try {
      const allPaymentsResult = await pool.query(allExistingPaymentsQuery, [id]);
      existingPeriods = new Set(
        allPaymentsResult.rows
          .filter(p => p.status !== 'cancelled') // Не исключаем отмененные платежи
          .map(p => p.period_number)
      );
    } catch (error) {
      console.log('=== ERROR IN CREDIT_PAYMENT QUERY ===');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('Query was:', allExistingPaymentsQuery);
      console.log('Credit ID:', creditId);
      console.log('Could not fetch existing payments from credit_payment table:', error.message);
    }

    const creditQuery = `
      SELECT c.*, b.name as bank_name 
      FROM credits c 
      LEFT JOIN banks b ON c.bank_id = b.id 
      WHERE c.id = $1
    `;
    const creditResult = await pool.query(creditQuery, [id]);
    if (creditResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }
    const credit = creditResult.rows[0];

    const ratesQuery = `
      SELECT rate, effective_date FROM credit_rates 
      WHERE credit_id = $1 
      ORDER BY effective_date ASC
    `;
    const ratesResult = await pool.query(ratesQuery, [id]);
    const rates = Array.isArray(ratesResult.rows) ? ratesResult.rows.map(r => ({
      annualPercent: parseFloat(r.rate) * 100,
      effectiveDate: r.effective_date ? new Date(r.effective_date) : undefined
    })).filter(r => r.effectiveDate instanceof Date && !isNaN(r.effectiveDate.getTime())) : [];

    const adjustmentsQuery = `
      SELECT * FROM principal_adjustments 
      WHERE credit_id = $1 
      ORDER BY adjustment_date ASC
    `;
    const adjustmentsResult = await pool.query(adjustmentsQuery, [id]);
    const adjustments = Array.isArray(adjustmentsResult.rows) ? adjustmentsResult.rows.map(adj => ({
      id: adj.id,
      loanId: adj.loan_id,
      amount: parseFloat(adj.amount),
      effectiveDate: new Date(adj.adjustment_date || adj.effective_date),
      type: adj.type
    })).filter(a => a.effectiveDate instanceof Date && !isNaN(a.effectiveDate.getTime())) : [];

    const rawMethod = credit.calculation_method || credit.method;
    const normalizedMethod = (rawMethod === 'floating_annuity' || rawMethod === 'FLOATING_ANNUITY')
      ? 'floating_annuity'
      : (rawMethod === 'floating_differentiated' || rawMethod === 'FLOATING_DIFFERENTIATED')
        ? 'floating_differentiated'
        : (rawMethod === 'classic_differentiated' || rawMethod === 'CLASSIC_DIFFERENTIATED')
          ? 'classic_differentiated'
          : 'classic_annuity';

    const creditData = {
      id: credit.id,
      contractNumber: credit.number || credit.contract_number,
      principal: parseFloat(credit.principal),
      termMonths: parseInt(credit.term_months),
      startDate: new Date(credit.start_date),
      method: normalizedMethod,
      defermentMonths: parseInt(credit.deferment_months) || 0,
      paymentDay: parseInt(credit.payment_day) || 1,
      bankId: credit.bank_id
    };

    if (!Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({ error: 'No valid rates found for credit' });
    }

    const scheduleResponse = ScheduleEngine.generatePaymentScheduleResponse(creditData, rates, adjustments);
    const items = (scheduleResponse.schedule || [])
      .filter(i => i.dueDate <= endOfCurrentMonth)
      .filter(i => !existingPeriods.has(i.periodNumber)); // Исключаем периоды с существующими платежами

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const unprocessedPeriods = items.map(i => {
      const dueDate = new Date(i.dueDate);
      const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const status = dueDateStart < todayStart ? 'overdue' : 'scheduled';
      
      return {
        id: null,
        credit_id: parseInt(id),
        period_number: i.periodNumber,
        due_date: i.dueDate,
        principal_due: Math.round((i.principalDue || 0) * 100) / 100,
        interest_due: Math.round((i.interestDue || 0) * 100) / 100,
        total_due: Math.round((i.totalDue || 0) * 100) / 100,
        status: status
      };
    });

    res.json(unprocessedPeriods);
  } catch (error) {
    console.error('Error fetching unprocessed payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/credits/:id/payments/bulk - Create multiple scheduled payments from provided items
app.post('/api/credits/:id/payments/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { payments } = req.body || {};
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: 'payments array is required' });
    }
    await client.query('BEGIN');
    let createdCount = 0;
    for (const p of payments) {
      // Валидация данных платежа
      const principalDue = parseFloat(p.principalDue ?? p.principalAmount ?? 0);
      const interestDue = parseFloat(p.interestDue ?? p.interestAmount ?? 0);
      const totalDue = parseFloat(p.totalDue ?? p.amount ?? 0);
      
      if (isNaN(principalDue) || isNaN(interestDue) || isNaN(totalDue)) {
        console.error('Invalid payment values in bulk:', p);
        continue;
      }
      
      if (principalDue < 0 || interestDue < 0 || totalDue < 0) {
        console.error('Negative payment values in bulk:', p);
        continue;
      }
      
      const dueDate = p.dueDate || p.paymentDate;
      if (!dueDate || isNaN(new Date(dueDate).getTime())) {
        console.error('Invalid due date in bulk:', p);
        continue;
      }
      
      const status = p.status || 'scheduled';
      const insertQuery = `
        INSERT INTO credit_payment (credit_id, due_date, period_number, principal_due, interest_due, total_due, status, recalculated_version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 1))
        ON CONFLICT (credit_id, period_number, recalculated_version) DO NOTHING
      `;
      const result = await client.query(insertQuery, [
        id,
        new Date(dueDate).toISOString().slice(0, 10),
        p.periodNumber,
        Math.round(principalDue * 100) / 100,
        Math.round(interestDue * 100) / 100,
        Math.round(totalDue * 100) / 100,
        status,
        p.recalculatedVersion ?? 1
      ]);
      if (result.rowCount && result.rowCount > 0) createdCount += result.rowCount;
    }
    await client.query('COMMIT');
    res.json({ message: 'Bulk creation completed', createdCount, totalCount: payments.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk payments creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/credits/:id/payments/generate - Generate scheduled payments from schedule
app.post('/api/credits/:id/payments/generate', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { periodNumbers } = req.body || {};

    const creditResult = await client.query(`SELECT * FROM credits WHERE id = $1`, [id]);
    if (creditResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }
    const credit = creditResult.rows[0];

    const ratesResult = await client.query(`SELECT rate, effective_date FROM credit_rates WHERE credit_id = $1 ORDER BY effective_date ASC`, [id]);
    const rates = ratesResult.rows.map(r => ({
      annualPercent: parseFloat(r.rate) * 100,
      effectiveDate: r.effective_date ? new Date(r.effective_date) : undefined
    })).filter(r => r.effectiveDate instanceof Date && !isNaN(r.effectiveDate.getTime()));

    const adjustmentsRes = await client.query(`SELECT * FROM principal_adjustments WHERE credit_id = $1 ORDER BY adjustment_date ASC`, [id]);
    const adjustments = adjustmentsRes.rows.map(adj => ({
      id: adj.id,
      loanId: adj.loan_id,
      amount: parseFloat(adj.amount),
      effectiveDate: new Date(adj.adjustment_date || adj.effective_date),
      type: adj.type
    })).filter(a => a.effectiveDate instanceof Date && !isNaN(a.effectiveDate.getTime()));

    const rawMethod = credit.calculation_method || credit.method;
    const normalizedMethod = (rawMethod === 'floating_annuity' || rawMethod === 'FLOATING_ANNUITY')
      ? 'floating_annuity'
      : (rawMethod === 'floating_differentiated' || rawMethod === 'FLOATING_DIFFERENTIATED')
        ? 'floating_differentiated'
        : (rawMethod === 'classic_differentiated' || rawMethod === 'CLASSIC_DIFFERENTIATED')
          ? 'classic_differentiated'
          : 'classic_annuity';

    // Валидация данных кредита
    const principal = parseFloat(credit.principal);
    const termMonths = parseInt(credit.term_months);
    const startDate = new Date(credit.start_date);
    
    if (isNaN(principal) || principal <= 0) {
      return res.status(400).json({ error: 'Invalid principal amount' });
    }
    
    if (isNaN(termMonths) || termMonths <= 0) {
      return res.status(400).json({ error: 'Invalid term months' });
    }
    
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }
    
    // Проверка наличия ставок
    if (rates.length === 0) {
      return res.status(400).json({ error: 'No valid rates found for credit' });
    }

    const creditData = {
      id: credit.id,
      contractNumber: credit.number || credit.contract_number,
      principal,
      termMonths,
      startDate,
      method: normalizedMethod,
      defermentMonths: parseInt(credit.deferment_months) || 0,
      paymentDay: parseInt(credit.payment_day) || 1,
      bankId: credit.bank_id
    };

    const scheduleResponse = ScheduleEngine.generatePaymentScheduleResponse(creditData, rates, adjustments);
    let items = scheduleResponse.schedule;
    if (Array.isArray(periodNumbers) && periodNumbers.length > 0) {
      const set = new Set(periodNumbers);
      items = items.filter(i => set.has(i.periodNumber));
    } else {
      // default: include all items due up to the end of the current month
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      items = items.filter(i => new Date(i.dueDate) <= endOfMonth);
    }

    await client.query('BEGIN');
    let createdCount = 0;
    for (const item of items) {
      // Валидация значений платежа
      if (isNaN(item.principalDue) || isNaN(item.interestDue) || isNaN(item.totalDue)) {
        console.error('Invalid payment values:', item);
        continue;
      }
      
      if (item.principalDue < 0 || item.interestDue < 0 || item.totalDue < 0) {
        console.error('Negative payment values:', item);
        continue;
      }
      
      const insertQuery = `
        INSERT INTO credit_payment (credit_id, due_date, period_number, principal_due, interest_due, total_due, status, recalculated_version)
        VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', 1)
        ON CONFLICT (credit_id, period_number, recalculated_version) DO NOTHING
      `;
      const result = await client.query(insertQuery, [
        id,
        new Date(item.dueDate).toISOString().slice(0, 10),
        item.periodNumber,
        Math.round(item.principalDue * 100) / 100,
        Math.round(item.interestDue * 100) / 100,
        Math.round(item.totalDue * 100) / 100
      ]);
      if (result.rowCount && result.rowCount > 0) createdCount += result.rowCount;
    }
    await client.query('COMMIT');

    res.json({ message: 'Generate payments completed', createdCount, totalCount: items.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/payments/:id/status - Update payment status
app.put('/api/payments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paidAmount } = req.body || {};
    const allowed = new Set(['scheduled','paid','partial','overdue','canceled']);
    if (!allowed.has(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Debug header to verify route version in client
    res.set('X-Route-Version', 'v2');

    // Debug ping: quickly confirm route is reached without touching database
    if (req.query && req.query.debug === 'ping') {
      console.log('Debug ping hit for PUT /api/payments/:id/status', { id, status, paidAmount });
      return res.json({ ok: true, route: 'PUT /api/payments/:id/status', id, status, paidAmount });
    }

    // Приводим paidAmount к числу, иначе используем NULL, чтобы COALESCE корректно подставил total_due
    const paidAmountNum = typeof paidAmount === 'number' && Number.isFinite(paidAmount)
      ? paidAmount
      : (typeof paidAmount === 'string' && !isNaN(parseFloat(paidAmount)) ? parseFloat(paidAmount) : null);

    console.log('PUT /api/payments/:id/status request', { id, status, paidAmount, paidAmountNum });

    // Основное обновление: устанавливаем статус, сумму оплаты (по умолчанию = total_due), дату оплаты
    try {
      console.log('Attempt primary update for credit_payment', { id, status, paidAmountNum });
      const result = await pool.query(
        `UPDATE credit_payment
         SET status = $1::varchar(20),
             paid_amount = COALESCE($2::numeric, total_due, paid_amount),
             paid_at = CASE WHEN $1::varchar(20) IN ('paid'::varchar(20),'partial'::varchar(20)) THEN NOW() ELSE paid_at END,
             updated_at = NOW()
         WHERE id = $3::uuid
         RETURNING *`,
        [status, paidAmountNum, id]
      );
      if (result.rows.length === 0) {
        console.warn('Primary update returned 0 rows (not found)', { id });
        return res.status(404).json({ error: 'Payment not found' });
      }
      console.log('Primary update success', { id, status });
      res.json(result.rows[0]);
    } catch (err) {
      console.warn('Primary update failed, returning error details to client:', { code: err?.code, message: err?.message, stack: err?.stack });
      return res.status(500).json({ error: 'Internal server error', details: err?.message, code: err?.code });
    }
  } catch (error) {
    console.error('Error updating payment status (outer catch):', { code: error?.code, message: error?.message, stack: error?.stack });
    res.status(500).json({ error: 'Internal server error', details: error?.message, code: error?.code });
  }
});

// DELETE /api/payments/:id - Delete payment
app.delete('/api/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM credit_payment WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/credits/:id - Update a credit
app.put('/api/credits/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const creditId = req.params.id;
    const {
      paymentDay,
      termMonths,
      defermentMonths,
      initialRate,
      notes,
      rateHistory,
      creditType
    } = req.body;

    // First, get the current credit to check status and payments
    const currentCreditResult = await client.query(`
      SELECT c.*, 
             EXISTS(SELECT 1 FROM credit_payment p WHERE p.credit_id = c.id) as has_payments
      FROM credits c
      WHERE c.id = $1
    `, [creditId]);

    if (currentCreditResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }

    const currentCredit = currentCreditResult.rows[0];
    
    // Treat missing/undefined status as 'active' by default to allow edits on legacy schemas
    const currentStatus = currentCredit.status ?? 'active';
    
    // Check if credit is active
    if (currentStatus !== 'active') {
      return res.status(400).json({ 
        error: 'Only active credits can be edited' 
      });
    }

    // Determine what can be edited based on payment history
    const hasPayments = currentCredit.has_payments;
    
    // Validate creditType if provided
    if (creditType !== undefined) {
      const validCreditTypes = ['investment', 'working_capital'];
      if (!validCreditTypes.includes(creditType)) {
        return res.status(400).json({ 
          error: 'Invalid credit type. Must be \'investment\' or \'working_capital\'' 
        });
      }
      
      // Check if creditType is being changed and payments exist
      if (hasPayments && currentCredit.credit_type && creditType !== currentCredit.credit_type) {
        return res.status(400).json({ 
          error: 'Cannot change credit type when payments exist' 
        });
      }
    }
    
    // Build update query dynamically based on what can be changed
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // Notes can always be updated
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(notes);
      paramIndex++;
    }

    // Fields that can only be updated if no payments exist
    if (!hasPayments) {
      if (paymentDay !== undefined) {
        updateFields.push(`payment_day = $${paramIndex}`);
        updateValues.push(paymentDay);
        paramIndex++;
      }
      
      if (termMonths !== undefined) {
        updateFields.push(`term_months = $${paramIndex}`);
        updateValues.push(termMonths);
        paramIndex++;
      }
      
      if (defermentMonths !== undefined) {
        updateFields.push(`deferment_months = $${paramIndex}`);
        updateValues.push(defermentMonths);
        paramIndex++;
      }
      
      // Credit type can be updated if no payments exist (validation already done above)
      if (creditType !== undefined) {
        updateFields.push(`credit_type = $${paramIndex}`);
        updateValues.push(creditType);
        paramIndex++;
      }
    }

    // Initial rate can only be updated for classic methods
    const isFixedMethod = (m) => {
      const v = String(m);
      return v === 'CLASSIC_ANNUITY' || v === 'classic_annuity' || v === 'CLASSIC_DIFFERENTIATED' || v === 'classic_differentiated';
    };
    if (initialRate !== undefined && isFixedMethod(currentCredit.method)) {
      let dbInitialRate = initialRate;
      if (initialRate > 9.9999) {
        dbInitialRate = initialRate / 100; // Convert percentage to decimal
      }
      updateFields.push(`initial_rate = $${paramIndex}`);
      updateValues.push(dbInitialRate);
      paramIndex++;
    }

    // Update the credit if there are fields to update
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(creditId);
      
      const updateQuery = `
        UPDATE credits 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      await client.query(updateQuery, updateValues);
    }

    // Handle rate history updates for floating methods
    const isFloatingMethod2 = (m) => {
      const v = String(m);
      return v === 'FLOATING_ANNUITY' || v === 'floating_annuity' || v === 'FLOATING_DIFFERENTIATED' || v === 'floating_differentiated';
    };
    if (rateHistory && Array.isArray(rateHistory) && isFloatingMethod2(currentCredit.method)) {
      // Full synchronization: replace all rates with the new ones
      
      // First, get all existing rates for this credit
      const existingRates = await client.query(
        `SELECT id, effective_date FROM credit_rates WHERE credit_id = $1`,
        [creditId]
      );
      
      const processedDates = new Set();
      const ratesToKeep = new Set();
      
      // Process each rate from the new rateHistory
      for (const rate of rateHistory) {
        try {
          const rawRate = rate.annualPercent ?? rate.rate;
          const effDate = rate.effectiveDate || rate.effective_date;
          if (rawRate == null || !effDate) continue;
          const dbRate = rawRate > 9.9999 ? rawRate / 100 : rawRate;
          const notesVal = rate.note ?? rate.notes ?? null;

          // Normalize effective date to YYYY-MM-DD (date-only) to avoid timezone shifts
          let effDateStr;
          if (typeof effDate === 'string') {
            effDateStr = effDate.includes('T') ? effDate.split('T')[0] : effDate;
          } else if (effDate instanceof Date) {
            // Формируем YYYY-MM-DD из локальных компонентов, чтобы исключить смещение из-за UTC
            const yyyy = effDate.getFullYear();
            const mm = String(effDate.getMonth() + 1).padStart(2, '0');
            const dd = String(effDate.getDate()).padStart(2, '0');
            effDateStr = `${yyyy}-${mm}-${dd}`;
          } else {
            continue;
          }

          // Skip if we already processed this date (avoid duplicates in the same request)
          if (processedDates.has(effDateStr)) continue;
          processedDates.add(effDateStr);

          if (rate.id) {
            // Update existing rate by ID
            await client.query(
              `UPDATE credit_rates 
               SET rate = $1, effective_date = $2::date, notes = $3, updated_at = NOW()
               WHERE id = $4 AND credit_id = $5`,
              [dbRate, effDateStr, notesVal, rate.id, creditId]
            );
            ratesToKeep.add(rate.id);
          } else {
            // Check if a rate already exists for this date
            const existingRate = await client.query(
              `SELECT id FROM credit_rates WHERE credit_id = $1 AND effective_date = $2::date`,
              [creditId, effDateStr]
            );
            
            if (existingRate.rows.length > 0) {
              // Update existing rate
              const existingId = existingRate.rows[0].id;
              await client.query(
                `UPDATE credit_rates 
                 SET rate = $1, notes = $2, updated_at = NOW()
                 WHERE id = $3`,
                [dbRate, notesVal, existingId]
              );
              ratesToKeep.add(existingId);
            } else {
              // Insert new rate
              const insertResult = await client.query(
                `INSERT INTO credit_rates (credit_id, rate, effective_date, notes)
                 VALUES ($1, $2, $3::date, $4) RETURNING id`,
                [creditId, dbRate, effDateStr, notesVal]
              );
              ratesToKeep.add(insertResult.rows[0].id);
            }
          }
        } catch (rateError) {
          console.error('Error processing rate entry:', rate, rateError);
          throw rateError;
        }
      }
      
      // Remove rates that are not in the new rateHistory
      for (const existingRate of existingRates.rows) {
        if (!ratesToKeep.has(existingRate.id)) {
          await client.query(
            `DELETE FROM credit_rates WHERE id = $1 AND credit_id = $2`,
            [existingRate.id, creditId]
          );
        }
      }
    }

    // Recalculate payment schedule if parameters changed and no payments exist
    let scheduleRecalculated = false;
    if (!hasPayments && updateFields.length > 1) { // More than just updated_at
      try {
        // Delete existing schedule
        await client.query('DELETE FROM credit_payment WHERE credit_id = $1', [creditId]);
        
        // Get updated credit data for recalculation
        const updatedCreditResult = await client.query(`
          SELECT c.*, b.name as bank_name, b.code as bank_code
          FROM credits c
          LEFT JOIN banks b ON c.bank_id = b.id
          WHERE c.id = $1
        `, [creditId]);
        
        const updatedCredit = updatedCreditResult.rows[0];
        
        // Ensure required fields are present and properly typed
        if (!updatedCredit.start_date) {
          throw new Error('Credit start_date is required for schedule calculation');
        }
        
        // Convert database fields to ScheduleEngine format
        const creditForSchedule = {
          ...updatedCredit,
          startDate: new Date(updatedCredit.start_date),
          paymentDay: parseInt(updatedCredit.payment_day) || 1,
          termMonths: parseInt(updatedCredit.term_months) || 12,
          defermentMonths: parseInt(updatedCredit.deferment_months) || 0,
          principal: parseFloat(updatedCredit.principal) || 0,
          method: updatedCredit.method || 'classic_annuity'
        };
        
        // Recalculate and insert new schedule
        const ratesResult = await client.query(`
          SELECT * FROM credit_rates 
          WHERE credit_id = $1 
          ORDER BY effective_date ASC
        `, [creditId]);
        
        const rates = ratesResult.rows.map(rate => {
          // Simple and robust date parsing for YYYY-MM-DD format
          let effectiveDate;
          try {
            const dateStr = String(rate.effective_date);
            if (dateStr.includes('-')) {
              const [year, month, day] = dateStr.split('-').map(Number);
              effectiveDate = new Date(year, month - 1, day, 12, 0, 0, 0);
            } else {
              effectiveDate = new Date(rate.effective_date);
            }
          } catch (error) {
            console.error('Error parsing effective_date:', rate.effective_date, error);
            effectiveDate = new Date(); // Fallback to current date
          }
          
          return {
            id: rate.id,
            creditId: rate.credit_id,
            annualPercent: parseFloat(rate.rate) * 100, // Convert from decimal to percentage
            effectiveDate: effectiveDate,
            notes: rate.notes
          };
        });
        
        const schedule = ScheduleEngine.generateSchedule(creditForSchedule, rates);
        
        for (const payment of schedule) {
          await client.query(`
            INSERT INTO credit_payment (
              credit_id, period_number, due_date, principal_due, 
              interest_due, total_due
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            creditId,
            payment.periodNumber,
            payment.dueDate,
            payment.principalDue,
            payment.interestDue,
            payment.totalDue
          ]);
        }
        
        scheduleRecalculated = true;
      } catch (scheduleError) {
        console.error('Error recalculating payment schedule:', scheduleError);
        // Don't fail the entire update if schedule calculation fails
      }
    }

    await client.query('COMMIT');
    
    // Fetch the updated credit with bank info
    const updatedResult = await pool.query(`
      SELECT c.*, b.name as bank_name, b.code as bank_code
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      WHERE c.id = $1
    `, [creditId]);

    const response = {
      ...updatedResult.rows[0],
      scheduleRecalculated
    };

    res.json(response);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e); }
    console.error('Error updating credit: message=', error?.message, '\nstack=', error?.stack, '\nrequest body=', JSON.stringify(req.body));
    // If it's a PG error, log more fields
    if (error && typeof error === 'object') {
      const pgFields = ['code','detail','hint','position','schema','table','column','dataType','constraint'];
      const extras = pgFields.reduce((acc, k) => { if (error[k]) acc[k] = error[k]; return acc; }, {});
      if (Object.keys(extras).length) console.error('PG error extras:', extras);
    }
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/credits/:id/schedule - получить график платежей по кредиту
app.get('/api/credits/:id/schedule', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    // Получаем данные кредита
    const creditQuery = `
      SELECT c.*, b.name as bank_name 
      FROM credits c 
      LEFT JOIN banks b ON c.bank_id = b.id 
      WHERE c.id = $1
    `;
    const creditResult = await client.query(creditQuery, [id]);
    
    if (creditResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }
    
    const credit = creditResult.rows[0];
    
    // Получаем историю ставок
    const ratesQuery = `
      SELECT * FROM credit_rates 
      WHERE credit_id = $1 
      ORDER BY effective_date ASC
    `;
    const ratesResult = await client.query(ratesQuery, [id]);
    
    // Получаем корректировки основного долга (если есть)
    const adjustmentsQuery = `
      SELECT * FROM principal_adjustments 
      WHERE credit_id = $1 
      ORDER BY adjustment_date ASC
    `;
    const adjustmentsResult = await client.query(adjustmentsQuery, [id]);
    
    // Импортируем ScheduleEngine
    const { ScheduleEngine } = await import('./src/services/schedule-engine.js');
    
    // Normalize method to ScheduleEngine expected values
    const rawMethod = credit.calculation_method || credit.method;
    const normalizedMethod = (rawMethod === 'floating_annuity' || rawMethod === 'FLOATING_ANNUITY')
      ? 'floating_annuity'
      : (rawMethod === 'floating_differentiated' || rawMethod === 'FLOATING_DIFFERENTIATED')
        ? 'floating_differentiated'
        : (rawMethod === 'classic_differentiated' || rawMethod === 'CLASSIC_DIFFERENTIATED')
          ? 'classic_differentiated'
          : 'classic_annuity';
    
    // Преобразуем данные в нужный формат (в соответствии с ScheduleEngine)
    const creditData = {
      id: credit.id,
      contractNumber: credit.number,
      principal: parseFloat(credit.principal),
      termMonths: parseInt(credit.term_months),
      startDate: new Date(credit.start_date),
      method: normalizedMethod,
      defermentMonths: parseInt(credit.deferment_months) || 0,
      paymentDay: parseInt(credit.payment_day) || 1,
      bankId: credit.bank_id
    };
    
    const rates = Array.isArray(ratesResult.rows) ? ratesResult.rows.map(r => ({
      annualPercent: parseFloat(r.rate) * 100, // DB stores decimals (e.g., 0.155 => 15.5%)
      effectiveDate: r.effective_date ? new Date(r.effective_date) : undefined
    })).filter(r => r.effectiveDate instanceof Date && !isNaN(r.effectiveDate.getTime())) : [];
    
    const adjustments = Array.isArray(adjustmentsResult.rows) ? adjustmentsResult.rows.map(adj => ({
      id: adj.id,
      loanId: adj.loan_id,
      amount: parseFloat(adj.amount),
      effectiveDate: new Date(adj.adjustment_date || adj.effective_date),
      type: adj.type
    })).filter(a => a.effectiveDate instanceof Date && !isNaN(a.effectiveDate.getTime())) : [];
    
    // Генерируем полный ответ с графиком платежей
    const response = ScheduleEngine.generatePaymentScheduleResponse(
      creditData,
      rates,
      adjustments
    );
    
    res.json(response);
    
  } catch (error) {
    console.error('Error generating payment schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Delete credit
app.delete('/api/credits/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const creditId = req.params.id;
    
    // Check if credit exists
    const creditResult = await client.query('SELECT * FROM credits WHERE id = $1', [creditId]);
    if (creditResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credit not found' });
    }
    
    const credit = creditResult.rows[0];
    
    // Check if credit has payments - if yes, prevent deletion
    const paymentsResult = await client.query('SELECT COUNT(*) FROM payments WHERE credit_id = $1', [creditId]);
    const hasPayments = parseInt(paymentsResult.rows[0].count) > 0;
    
    if (hasPayments) {
      return res.status(400).json({ 
        error: 'Cannot delete credit with existing payments',
        message: 'Кредит с существующими платежами не может быть удален'
      });
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    try {
      // Delete related records in order
      await client.query('DELETE FROM payments WHERE credit_id = $1', [creditId]);
      await client.query('DELETE FROM credit_rates WHERE credit_id = $1', [creditId]);
      await client.query('DELETE FROM principal_adjustments WHERE credit_id = $1', [creditId]);
      
      // Finally delete the credit
      const deleteResult = await client.query('DELETE FROM credits WHERE id = $1 RETURNING *', [creditId]);
      
      await client.query('COMMIT');
      
      res.json({ 
        message: 'Credit deleted successfully',
        deletedCredit: deleteResult.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting credit:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Reports API endpoints
app.get('/api/reports/overdue', async (req, res) => {
  try {
    const { dateFrom, dateTo, bankId } = req.query;
    
    let query = `
      SELECT 
        c.contract_number,
        c.id as credit_id,
        b.name as bank_name,
        COALESCE(SUM(p.amount), 0) as total_paid,
        c.principal,
        (c.principal - COALESCE(SUM(p.amount), 0)) as remaining_balance,
        CASE 
          WHEN MAX(p.payment_date) IS NULL THEN EXTRACT(DAY FROM NOW() - c.start_date)
          ELSE EXTRACT(DAY FROM NOW() - MAX(p.payment_date))
        END as days_overdue
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      LEFT JOIN payments p ON c.id = p.credit_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (dateFrom) {
      query += ` AND c.start_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      query += ` AND c.start_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }
    
    if (bankId && bankId !== 'all') {
      query += ` AND c.bank_id = $${paramIndex}`;
      params.push(bankId);
      paramIndex++;
    }
    
    query += `
      GROUP BY c.id, c.contract_number, c.principal, b.name
      HAVING (c.principal - COALESCE(SUM(p.amount), 0)) > 0
      ORDER BY days_overdue DESC
    `;
    
    const result = await pool.query(query, params);
    
    const overdueItems = result.rows.map(row => ({
      contract: row.contract_number,
      amount: parseFloat(row.remaining_balance),
      days: parseInt(row.days_overdue),
      bank: row.bank_name
    }));
    
    const totalAmount = overdueItems.reduce((sum, item) => sum + item.amount, 0);
    const count = overdueItems.length;
    const averageDays = count > 0 ? Math.round(overdueItems.reduce((sum, item) => sum + item.days, 0) / count) : 0;
    
    res.json({
      totalAmount,
      count,
      averageDays,
      items: overdueItems
    });
    
  } catch (error) {
    console.error('Error fetching overdue report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/forecast', async (req, res) => {
  console.log('[FORECAST DEBUG] ===== FORECAST ENDPOINT HIT =====');
  console.log('[FORECAST DEBUG] Endpoint hit with query:', req.query);
  console.log('[FORECAST DEBUG] Request timestamp:', new Date().toISOString());
  try {
    const { dateFrom, dateTo, bankId } = req.query;
    
    // Валидация параметров фильтрации для прогнозного отчета
    if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      return res.status(400).json({ 
        error: 'Invalid dateFrom format. Expected ISO 8601 date format (YYYY-MM-DD)' 
      });
    }
    
    if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return res.status(400).json({ 
        error: 'Invalid dateTo format. Expected ISO 8601 date format (YYYY-MM-DD)' 
      });
    }
    
    if (bankId && bankId !== 'all' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bankId)) {
      return res.status(400).json({ 
        error: 'Invalid bankId format. Expected UUID format or "all"' 
      });
    }
    
    // Получаем активные кредиты
    let query = `
      SELECT 
        c.id,
        c.contract_number,
        c.principal,
        c.term_months,
        c.start_date,
        c.method,
        c.deferment_months,
        c.payment_day,
        b.name as bank_name
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      WHERE CAST(c.principal AS DECIMAL) > 0
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Добавляем условия фильтрации по датам и банку
    if (dateFrom) {
      query += ` AND c.start_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      query += ` AND c.start_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }
    
    if (bankId && bankId !== 'all') {
      query += ` AND c.bank_id = $${paramIndex}`;
      params.push(bankId);
      paramIndex++;
    }
    
    console.log('[FORECAST DEBUG] Final query:', query);
    console.log('[FORECAST DEBUG] Query params:', params);
    
    const result = await pool.query(query, params);
    
    console.log('[FORECAST DEBUG] Credits found:', result.rows.length);
    console.log('[FORECAST DEBUG] First credit:', result.rows[0]);
    
    // Генерируем детальный прогноз на следующие 12 месяцев используя реальный график платежей
    const now = new Date();
    const forecastItems = [];
    
    for (const credit of result.rows) {
      console.log('[FORECAST DEBUG] Processing credit:', credit.contract_number);
      try {
        // Получаем ставки для кредита
        const ratesQuery = `
          SELECT rate, effective_date 
          FROM credit_rates 
          WHERE credit_id = $1 
          ORDER BY effective_date ASC
        `;
        const ratesResult = await pool.query(ratesQuery, [credit.id]);
        let rates = ratesResult.rows.map(row => ({
          annualPercent: parseFloat(row.rate) * 100,
          effectiveDate: new Date(row.effective_date)
        }));
        
        // Если нет ставок, используем базовую ставку 12%
        if (rates.length === 0) {
          rates = [{
            annualPercent: 12.0,
            effectiveDate: new Date(credit.start_date)
          }];
        }
        
        // Получаем корректировки (если есть)
        const adjustmentsQuery = `
          SELECT amount, adjustment_date 
          FROM principal_adjustments 
          WHERE credit_id = $1 
          ORDER BY adjustment_date ASC
        `;
        const adjustmentsResult = await pool.query(adjustmentsQuery, [credit.id]);
        const adjustments = adjustmentsResult.rows.map(row => ({
          amount: parseFloat(row.amount),
          effectiveDate: new Date(row.adjustment_date)
        }));
        
        // Подготавливаем данные кредита для ScheduleEngine
        const creditData = {
          id: credit.id,
          principal: parseFloat(credit.principal),
          termMonths: credit.term_months,
          startDate: new Date(credit.start_date),
          method: credit.method,
          defermentMonths: credit.deferment_months || 0,
          paymentDay: credit.payment_day
        };
        
        // Получаем уже оплаченные платежи для этого кредита
        const paidPaymentsQuery = `
          SELECT period_number, status, payment_date
          FROM credit_payment 
          WHERE credit_id = $1 AND status = 'paid'
        `;
        const paidPaymentsResult = await pool.query(paidPaymentsQuery, [credit.id]);
        const paidPeriods = new Set(paidPaymentsResult.rows.map(row => row.period_number));
        
        console.log(`[FORECAST DEBUG] Credit ${credit.contract_number} paid periods:`, Array.from(paidPeriods));
        
        // Генерируем график платежей используя ScheduleEngine
        const scheduleResponse = ScheduleEngine.generatePaymentScheduleResponse(
          creditData,
          rates,
          adjustments
        );
        
        console.log(`[FORECAST DEBUG] Credit ${credit.contract_number} schedule generated:`, {
          scheduleLength: scheduleResponse.schedule.length,
          firstPayment: scheduleResponse.schedule[0],
          seventhPayment: scheduleResponse.schedule.find(p => p.periodNumber === 7),
          paidPeriodsCount: paidPeriods.size
        });
        
        // Определяем окно прогноза (следующие 12 месяцев)
        const startForecast = new Date(now.getFullYear(), now.getMonth(), 1);
        const endForecast = new Date(now.getFullYear(), now.getMonth() + 12, 0); // Последний день 12-го месяца
        
        console.log(`[FORECAST DEBUG] Forecast window for credit ${credit.contract_number}:`, {
          startForecast: startForecast.toISOString().substring(0, 10),
          endForecast: endForecast.toISOString().substring(0, 10),
          totalPayments: scheduleResponse.schedule.length
        });
        
        // Проходим по ВСЕМ платежам в графике
        for (const payment of scheduleResponse.schedule) {
          const paymentDate = new Date(payment.dueDate);
          
          // Проверяем, попадает ли платеж в окно прогноза (следующие 12 месяцев)
          if (paymentDate >= startForecast && paymentDate <= endForecast) {
            // Добавляем в прогноз только неоплаченные платежи
            if (!paidPeriods.has(payment.periodNumber)) {
              const monthStr = paymentDate.toISOString().substring(0, 7); // "YYYY-MM"
              
              forecastItems.push({
                bank: credit.bank_name || 'Неизвестный банк',
                creditNumber: credit.contract_number || 'Неизвестный номер',
                month: monthStr,
                principalAmount: Math.round(payment.principalDue * 100) / 100,
                interestAmount: Math.round(payment.interestDue * 100) / 100,
                totalAmount: Math.round(payment.totalDue * 100) / 100
              });
              
              console.log(`[FORECAST DEBUG] Added payment for ${credit.contract_number}, period ${payment.periodNumber}, month ${monthStr}`);
            } else {
              console.log(`[FORECAST DEBUG] Skipping paid period ${payment.periodNumber} for credit ${credit.contract_number}`);
            }
          }
        }
        
      } catch (error) {
        console.error('Error calculating forecast for credit:', credit.contract_number, error);
        // Продолжаем обработку других кредитов
      }
    }
    
    // Сортируем результат по месяцу для порядка
    forecastItems.sort((a, b) => a.month.localeCompare(b.month));
    
    console.log('[FORECAST DEBUG] Returning response with', forecastItems.length, 'items');
    console.log('[FORECAST DEBUG] First item:', forecastItems[0]);
    res.json({
      items: forecastItems
    });
    
  } catch (error) {
    console.error('Error fetching forecast report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/portfolio', async (req, res) => {
  try {
    const { dateFrom, dateTo, bankId } = req.query;
    
    // Validate filter parameters
    if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      return res.status(400).json({ 
        error: 'Invalid dateFrom format. Expected ISO 8601 date format (YYYY-MM-DD)' 
      });
    }
    
    if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return res.status(400).json({ 
        error: 'Invalid dateTo format. Expected ISO 8601 date format (YYYY-MM-DD)' 
      });
    }
    
    if (bankId && bankId !== 'all' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bankId)) {
      return res.status(400).json({ 
        error: 'Invalid bankId format. Expected UUID format or "all"' 
      });
    }

    // Get individual credit details with bank names
    let query = `
      SELECT 
        c.id,
        c.contract_number,
        c.principal,
        c.start_date,
        b.id as bank_id,
        b.name as bank_name
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      WHERE c.principal > 0
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (dateFrom) {
      query += ` AND c.start_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      query += ` AND c.start_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }
    
    if (bankId && bankId !== 'all') {
      query += ` AND c.bank_id = $${paramIndex}`;
      params.push(bankId);
      paramIndex++;
    }
    
    query += ` ORDER BY b.name, c.contract_number`;
    
    const result = await pool.query(query, params);
    
    // Group credits by bank and calculate aggregates
    const bankGroups = {};
    
    for (const credit of result.rows) {
      const bankName = credit.bank_name || 'Unknown Bank';
      
      if (!bankGroups[bankName]) {
        bankGroups[bankName] = {
          bank: bankName,
          creditCount: 0,
          totalPrincipal: 0,
          totalPaid: 0,
          remainingBalance: 0,
          credits: []
        };
      }
      
      const principal = parseFloat(credit.principal || 0);
      
      // Рассчитываем реальный остаток на дату отчета из таблицы credit_payment
      let paidAmount = 0;
      const reportDate = dateTo || new Date().toISOString().slice(0, 10);
      
      try {
        const paidQuery = `
          SELECT COALESCE(SUM(principal_due), 0) as total_principal_paid
          FROM credit_payment 
          WHERE credit_id = $1 AND status = 'paid' AND due_date <= $2
        `;
        const paidResult = await pool.query(paidQuery, [credit.id, reportDate]);
        paidAmount = parseFloat(paidResult.rows[0].total_principal_paid || 0);
      } catch (error) {
        console.error(`Error calculating balance for credit ${credit.id}:`, error);
      }
      
      const remainingBalance = principal - paidAmount;
      
      // Get current rate for this credit
      let currentRate = 0;
      try {
        const rateDate = dateTo || new Date().toISOString().slice(0, 10);
        const rateQuery = `
          SELECT rate 
          FROM credit_rates 
          WHERE credit_id = $1 
            AND effective_date <= $2 
          ORDER BY effective_date DESC 
          LIMIT 1
        `;
        const rateResult = await pool.query(rateQuery, [credit.id, rateDate]);
        if (rateResult.rows.length > 0) {
          currentRate = parseFloat(rateResult.rows[0].rate) * 100; // Convert to percentage
        }
      } catch (error) {
        console.error(`Error fetching rate for credit ${credit.id}:`, error);
        // currentRate remains 0 as default
      }
      
      // Add credit details to the bank group
      bankGroups[bankName].credits.push({
        id: credit.id,
        contractNumber: credit.contract_number,
        principal: principal,
        startDate: credit.start_date,
        paidAmount: paidAmount,
        remainingBalance: remainingBalance,
        rate: currentRate
      });
      
      // Update bank aggregates
      bankGroups[bankName].creditCount++;
      bankGroups[bankName].totalPrincipal += principal;
      bankGroups[bankName].totalPaid += paidAmount;
      bankGroups[bankName].remainingBalance += remainingBalance;
    }
    
    // Convert to array and calculate overall totals
    const portfolioData = Object.values(bankGroups);
    
    const totalPrincipal = portfolioData.reduce((sum, item) => sum + item.totalPrincipal, 0);
    const totalCredits = portfolioData.reduce((sum, item) => sum + item.creditCount, 0);
    const totalPaid = portfolioData.reduce((sum, item) => sum + item.totalPaid, 0);
    
    // Calculate weighted average rate for each bank
    portfolioData.forEach(bank => {
      let weightedRateSum = 0;
      let totalWeight = 0;
      
      bank.credits.forEach(credit => {
        const weight = credit.remainingBalance;
        if (weight > 0) {
          weightedRateSum += weight * credit.rate;
          totalWeight += weight;
        }
      });
      
      // Calculate average: avgRate = weightedRateSum / totalWeight
      // Handle division by zero (return 0% if totalWeight is 0)
      bank.avgRate = totalWeight > 0 ? weightedRateSum / totalWeight : 0;
    });
    
    res.json({
      totalPrincipal,
      totalCredits,
      totalPaid,
      items: portfolioData
    });
    
  } catch (error) {
    console.error('Error fetching portfolio report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/interest', async (req, res) => {
  try {
    const { dateFrom, dateTo, bankId } = req.query;
    
    let query = `
      SELECT 
        c.contract_number,
        b.name as bank_name,
        SUM(p.interest_amount) as total_interest,
        COUNT(p.id) as payment_count,
        AVG(COALESCE(cr.rate, c.initial_rate)) as avg_rate
      FROM credits c
      LEFT JOIN banks b ON c.bank_id = b.id
      LEFT JOIN payments p ON c.id = p.credit_id
      LEFT JOIN credit_rates cr ON c.id = cr.credit_id 
        AND cr.effective_date = (
          SELECT MAX(effective_date) 
          FROM credit_rates 
          WHERE credit_id = c.id 
          AND effective_date <= CURRENT_DATE
        )
      WHERE p.interest_amount IS NOT NULL AND p.interest_amount > 0
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (dateFrom) {
      query += ` AND p.payment_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      query += ` AND p.payment_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }
    
    if (bankId && bankId !== 'all') {
      query += ` AND c.bank_id = $${paramIndex}`;
      params.push(bankId);
      paramIndex++;
    }
    
    query += `
      GROUP BY c.id, c.contract_number, b.name
      ORDER BY total_interest DESC
    `;
    
    const result = await pool.query(query, params);
    
    const interestData = result.rows.map(row => ({
      contract: row.contract_number,
      bank: row.bank_name,
      totalInterest: parseFloat(row.total_interest || 0),
      paymentCount: parseInt(row.payment_count),
      avgRate: parseFloat(row.avg_rate || 0)
    }));
    
    const totalInterest = interestData.reduce((sum, item) => sum + item.totalInterest, 0);
    const totalPayments = interestData.reduce((sum, item) => sum + item.paymentCount, 0);
    
    res.json({
      totalInterest,
      totalPayments,
      items: interestData
    });
    
  } catch (error) {
    console.error('Error fetching interest report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint для экспорта отчетов
app.get('/api/reports/:type/export', async (req, res) => {
  try {
    const { type } = req.params;
    const { dateFrom, dateTo, bankId, format = 'csv' } = req.query;

    let query = '';
    let params = [];
    let filename = '';

    // Определяем запрос в зависимости от типа отчета
    switch (type) {
      case 'overdue':
        query = `
          SELECT 
            c.contract_number as contract,
            COALESCE(c.principal - COALESCE(SUM(p.amount), 0), c.principal) as amount,
            CASE 
              WHEN MAX(p.payment_date) IS NULL THEN EXTRACT(DAY FROM NOW() - c.start_date)
              ELSE EXTRACT(DAY FROM NOW() - MAX(p.payment_date))
            END as days,
            b.name as bank
          FROM credits c
          LEFT JOIN banks b ON c.bank_id = b.id
          LEFT JOIN payments p ON c.id = p.credit_id
          WHERE 1=1
        `;
        filename = 'overdue_report';
        break;

      case 'forecast':
        query = `
          SELECT 
            TO_CHAR(DATE_TRUNC('month', c.start_date + INTERVAL '1 year'), 'YYYY-MM') as month,
            SUM(c.principal) as amount,
            COUNT(*) as count
          FROM credits c
          LEFT JOIN banks b ON c.bank_id = b.id
          WHERE c.start_date >= NOW() - INTERVAL '1 year'
        `;
        filename = 'forecast_report';
        break;

      case 'portfolio':
        query = `
          SELECT 
            b.name as bank,
            COUNT(c.id) as credit_count,
            SUM(c.principal) as total_principal,
            AVG(cr.rate) as avg_rate,
            COALESCE(SUM(p.amount), 0) as total_paid,
            SUM(c.principal) - COALESCE(SUM(p.amount), 0) as remaining_balance
          FROM banks b
          LEFT JOIN credits c ON b.id = c.bank_id
          LEFT JOIN credit_rates cr ON c.id = cr.credit_id
          LEFT JOIN payments p ON c.id = p.credit_id
          WHERE 1=1
        `;
        filename = 'portfolio_report';
        break;

      case 'interest':
        query = `
          SELECT 
            c.contract_number as contract,
            b.name as bank,
            COALESCE(SUM(p.amount * cr.rate / 100), 0) as total_interest,
            COUNT(p.id) as payment_count,
            AVG(cr.rate) as avg_rate
          FROM credits c
          LEFT JOIN banks b ON c.bank_id = b.id
          LEFT JOIN payments p ON c.id = p.credit_id
          LEFT JOIN credit_rates cr ON c.id = cr.credit_id
          WHERE 1=1
        `;
        filename = 'interest_report';
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Добавляем фильтры
    if (dateFrom) {
      query += ` AND c.start_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND c.start_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    if (bankId) {
      query += ` AND c.bank_id = $${params.length + 1}`;
      params.push(bankId);
    }

    // Добавляем GROUP BY для агрегированных запросов
    if (type === 'forecast') {
      query += ' GROUP BY DATE_TRUNC(\'month\', c.start_date + INTERVAL \'1 year\') ORDER BY month';
    } else if (type === 'portfolio') {
      query += ' GROUP BY b.id, b.name ORDER BY b.name';
    } else if (type === 'interest') {
      query += ' GROUP BY c.id, c.contract_number, b.name ORDER BY c.contract_number';
    } else if (type === 'overdue') {
      query += ' GROUP BY c.id, c.contract_number, c.principal, c.start_date, b.name ORDER BY days DESC';
    }

    const result = await pool.query(query, params);

    // Определяем Content-Type и расширение файла
    let contentType = 'text/csv';
    let fileExtension = 'csv';
    
    if (format === 'excel') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else if (format === 'pdf') {
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    }

    // Устанавливаем заголовки для скачивания файла
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);

    if (format === 'csv') {
      // Генерируем CSV
      if (result.rows.length === 0) {
        return res.send('No data available');
      }

      const headers = Object.keys(result.rows[0]).join(',');
      const csvData = result.rows.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      ).join('\n');

      res.send(`${headers}\n${csvData}`);
    } else {
      // Для Excel и PDF возвращаем JSON (в реальном приложении здесь была бы генерация соответствующих форматов)
      res.json({
        message: `${format.toUpperCase()} export not implemented yet`,
        data: result.rows
      });
    }

  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  try {
    console.error('[GlobalError]', { method: req.method, url: req.url, code: err?.code, message: err?.message, stack: err?.stack });
    if (!res.headersSent) {
      res.set('X-Error-Handler', 'global-v1');
      if (req.path && req.path.startsWith('/api/payments')) {
        res.set('X-Route-Version', 'v2');
      }
      return res.status(500).json({ error: 'Internal server error', details: err?.message, code: err?.code });
    }
  } catch (e) {
    console.error('[GlobalErrorFallback]', e);
  }
  next(err);
});

// Serve static files from dist directory
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin middleware - РАЗМЕЩАЕМ ПЕРЕД FALLBACK
app.use('/api/admin', (req, res, next) => {
  console.log(`[ADMIN MIDDLEWARE] ${req.method} ${req.originalUrl} - middleware hit`);
  console.log(`[ADMIN MIDDLEWARE] req.path: ${req.path}, req.url: ${req.url}`);
  console.log(`[ADMIN MIDDLEWARE] calling next()`);
  next();
});

// Добавляем тестовый роут для проверки admin middleware
app.get('/api/admin/test', (req, res) => {
  console.log('[ADMIN TEST] Test endpoint called - ROUTE HIT!');
  res.json({
    success: true,
    message: 'Admin test endpoint is working',
    timestamp: new Date().toISOString(),
    path: req.path,
    originalUrl: req.originalUrl
  });
});

// ProcessDuePaymentsJob API endpoints - добавляем после admin middleware
app.post('/api/admin/payments/process-due-job', async (req, res) => {
  console.log('[ProcessDuePaymentsJob] POST endpoint called directly - ROUTE HIT!');
  try {
    const { ProcessDuePaymentsJob } = await import('./src/jobs/ProcessDuePaymentsJob.js');
    const job = ProcessDuePaymentsJob.getInstance();
    const result = await job.execute();
    res.json({
      success: true,
      message: 'Payment processing job completed',
      result
    });
  } catch (error) {
    console.error('[ProcessDuePaymentsJob] Manual execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing job failed',
      error: error.message
    });
  }
});

app.get('/api/admin/payments/process-due-job/status', (req, res) => {
  console.log('[ProcessDuePaymentsJob] Status endpoint called - ROUTE HIT!');
  res.json({
    success: true,
    message: 'ProcessDuePaymentsJob status endpoint is working',
    timestamp: new Date().toISOString()
  });
});

app.use(express.static(path.join(__dirname, 'dist')));

// Fallback route for SPA - serve index.html for non-API routes
app.use((req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    console.log(`[DEBUG] 404 on ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Route not found', path: req.path });
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(port, host, () => {
  console.log(`Server running on port ${port}`);
  
  // Инициализируем фоновую задачу для автоматической оплаты платежей
  initializePaymentProcessingJob(pool);
  console.log('[ProcessDuePaymentsJob] Initialized and scheduled to run daily at 08:00');
  
  // Self-probe /api/version to validate reachability and headers
  setTimeout(() => {
    try {
      const urlVersion = `http://127.0.0.1:${port}/api/version`;
      fetch(urlVersion).then(async (r) => {
        const text = await r.text();
        const headersObj = {};
        try { r.headers.forEach((v, k) => { headersObj[k] = v; }); } catch {}
        console.log('[SELF PROBE] /api/version', { status: r.status, headers: headersObj, body: text });
      }).catch(err => {
        console.error('[SELF PROBE ERROR] /api/version', err);
      });

      const urlPing = `http://127.0.0.1:${port}/api/payments/ping`;
      fetch(urlPing).then(async (r) => {
        const text = await r.text();
        const headersObj = {};
        try { r.headers.forEach((v, k) => { headersObj[k] = v; }); } catch {}
        console.log('[SELF PROBE] /api/payments/ping', { status: r.status, headers: headersObj, body: text });
      }).catch(err => {
        console.error('[SELF PROBE ERROR] /api/payments/ping', err);
      });
    } catch (e) {
      console.error('[SELF PROBE EXCEPTION]', e);
    }
  }, 500);
});

// Helper functions for Google Sheets
function extractSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function columnLetterToIndex(letter) {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

function parseDate(dateStr) {
  if (!dateStr) return '';

  const formats = [
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[2]) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      }
    }
  }

  const serialDate = parseFloat(dateStr);
  if (!isNaN(serialDate) && serialDate > 25000) {
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (serialDate - 2) * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }

  return '';
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;

  const cleaned = amountStr
    .replace(/[₽$€£¥]/g, '')
    .replace(/\s/g, '')
    .replace(/,/g, '.');

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.abs(amount);
}

function parseSheetData(rawData, columnMapping, category) {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  const results = [];

  // Build column indices only for non-empty, valid column letters
  const columnIndices = {};
  Object.entries(columnMapping || {}).forEach(([field, column]) => {
    const col = (column || '').toString().trim();
    if (!col) return;
    const idx = columnLetterToIndex(col);
    if (!Number.isFinite(idx) || idx < 0) return;
    columnIndices[field] = idx;
  });

  rawData.forEach((row, rowIndex) => {
    try {
      if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
        return;
      }

      // Start with known core fields
      const parsedRow = {
        date: '',
        amount: 0,
        description: '',
        category
      };

      // Map all provided fields dynamically, with special handling for core fields
      Object.entries(columnIndices).forEach(([field, colIndex]) => {
        const cellValue = (row[colIndex] ?? '').toString().trim();

        switch (field) {
          case 'date':
            parsedRow.date = parseDate(cellValue);
            break;
          case 'amount':
            parsedRow.amount = parseAmount(cellValue);
            break;
          case 'description':
            parsedRow.description = cellValue;
            break;
          // Do not allow overriding reserved category argument from mapping
          case 'category':
            // intentionally ignored to preserve category argument
            break;
          default:
            // Attach any other mapped field to the parsed row as-is (string value)
            parsedRow[field] = cellValue;
            break;
        }
      });

      // If amount is zero or missing, try to compute from quantity * (unit_price || price)
      if (!parsedRow.amount || parsedRow.amount === 0) {
        const qtyStr = parsedRow.quantity != null ? String(parsedRow.quantity) : '';
        const qty = qtyStr ? parseFloat(qtyStr.replace(',', '.')) : NaN;
        const unitPrice = parsedRow.unit_price ? parseAmount(String(parsedRow.unit_price)) : 0;
        const price = parsedRow.price ? parseAmount(String(parsedRow.price)) : 0;
        const unit = unitPrice > 0 ? unitPrice : price;
        if (Number.isFinite(qty) && qty > 0 && unit > 0) {
          parsedRow.amount = Math.abs(qty * unit);
        }
      }

      // Only accept rows with valid date and positive amount
      if (parsedRow.date && parsedRow.amount > 0) {
        results.push(parsedRow);
      }
    } catch (error) {
      console.warn(`Error parsing row ${rowIndex + 1}:`, error);
    }
  });

  return results;
}