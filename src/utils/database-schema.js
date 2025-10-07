/**
 * Database schema management utilities for expenses API
 * Handles table creation, validation, and schema enforcement
 */

/**
 * Ensures the expenses table exists with proper schema and constraints
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<boolean>} - True if table exists/created successfully
 */
export async function ensureExpensesTable(pool) {
  const client = await pool.connect();
  
  try {
    console.log('[SCHEMA] Ensuring expenses table exists with proper schema...');
    
    // Create expenses table with comprehensive constraints
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        source VARCHAR(255),
        date DATE NOT NULL,
        amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(10) DEFAULT 'MDL' CHECK (currency IN ('MDL', 'USD', 'EUR', 'RON')),
        department VARCHAR(255),
        supplier VARCHAR(255),
        category VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Additional constraints for data integrity
        CONSTRAINT valid_date CHECK (date <= CURRENT_DATE + INTERVAL '1 year'),
        CONSTRAINT valid_amount_precision CHECK (amount <= 999999999999.99)
      )
    `;
    
    await client.query(createTableQuery);
    
    // Create indexes for better query performance
    const createIndexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_department ON expenses(department)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at)'
    ];
    
    for (const indexQuery of createIndexQueries) {
      await client.query(indexQuery);
    }
    
    console.log('[SCHEMA] Expenses table and indexes created/verified successfully');
    return true;
    
  } catch (error) {
    console.error('[SCHEMA] Error ensuring expenses table:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Validates expense data against schema requirements
 * @param {Object} expenseData - The expense data to validate
 * @returns {Object} - Validation result with isValid flag and errors array
 */
export function validateExpenseData(expenseData) {
  const errors = [];
  const warnings = [];
  
  // Required field validation
  if (!expenseData.date || expenseData.date.trim() === '') {
    errors.push('Date is required');
  } else if (isNaN(Date.parse(expenseData.date))) {
    errors.push('Date must be in valid YYYY-MM-DD format');
  } else {
    // Check if date is not too far in the future
    const expenseDate = new Date(expenseData.date);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (expenseDate > oneYearFromNow) {
      errors.push('Date cannot be more than one year in the future');
    }
  }
  
  if (!expenseData.amount && expenseData.amount !== 0) {
    errors.push('Amount is required');
  } else {
    const amount = parseFloat(expenseData.amount);
    if (isNaN(amount)) {
      errors.push('Amount must be a valid number');
    } else if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    } else if (amount > 999999999999.99) {
      errors.push('Amount exceeds maximum allowed value (999,999,999,999.99)');
    }
  }
  
  // Optional field validation
  if (expenseData.currency) {
    const validCurrencies = ['MDL', 'USD', 'EUR', 'RON'];
    if (!validCurrencies.includes(expenseData.currency.toUpperCase())) {
      errors.push(`Currency must be one of: ${validCurrencies.join(', ')}`);
    }
  }
  
  // Field length validation
  const fieldLimits = {
    source: 255,
    department: 255,
    supplier: 255,
    category: 255
  };
  
  for (const [field, limit] of Object.entries(fieldLimits)) {
    const value = expenseData[field];
    if (value && value.length > limit) {
      errors.push(`${field} must be ${limit} characters or less (current: ${value.length})`);
    }
  }
  
  // Data quality warnings
  if (!expenseData.description || expenseData.description.trim() === '') {
    warnings.push('Description is empty - consider adding details for better record keeping');
  }
  
  if (!expenseData.category || expenseData.category.trim() === '') {
    warnings.push('Category is empty - consider categorizing expenses for better reporting');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedData: {
      source: expenseData.source?.trim() || null,
      date: expenseData.date?.trim(),
      amount: parseFloat(expenseData.amount),
      currency: expenseData.currency?.toUpperCase() || 'MDL',
      department: expenseData.department?.trim() || null,
      supplier: expenseData.supplier?.trim() || null,
      category: expenseData.category?.trim() || null,
      description: expenseData.description?.trim() || null
    }
  };
}

/**
 * Validates database connection and table schema
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<Object>} - Health check result
 */
export async function validateDatabaseHealth(pool) {
  const client = await pool.connect();
  
  try {
    console.log('[HEALTH] Performing database health check...');
    
    // Test basic connection
    await client.query('SELECT NOW()');
    
    // Check if expenses table exists and has correct structure
    const tableCheckQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'expenses' 
      ORDER BY ordinal_position
    `;
    
    const tableResult = await client.query(tableCheckQuery);
    
    if (tableResult.rows.length === 0) {
      return {
        healthy: false,
        message: 'Expenses table does not exist',
        details: { tableExists: false }
      };
    }
    
    // Check for required columns
    const requiredColumns = ['id', 'date', 'amount', 'currency', 'created_at', 'updated_at'];
    const existingColumns = tableResult.rows.map(row => row.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      return {
        healthy: false,
        message: 'Expenses table is missing required columns',
        details: { 
          tableExists: true,
          missingColumns,
          existingColumns
        }
      };
    }
    
    // Test a simple query
    await client.query('SELECT COUNT(*) FROM expenses LIMIT 1');
    
    console.log('[HEALTH] Database health check passed');
    
    return {
      healthy: true,
      message: 'Database and expenses table are healthy',
      details: {
        tableExists: true,
        columnCount: tableResult.rows.length,
        columns: existingColumns
      }
    };
    
  } catch (error) {
    console.error('[HEALTH] Database health check failed:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return {
      healthy: false,
      message: 'Database health check failed',
      details: { error: error.message }
    };
  } finally {
    client.release();
  }
}