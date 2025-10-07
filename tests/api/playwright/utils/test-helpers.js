import { cleanupTestData, setupTestData, insertTestAlias, insertTestExpense } from './database-utils.js';
import { testAliases, testExpenses } from '../fixtures/test-data.js';

export async function setupTestEnvironment() {
  console.log('[TEST SETUP] Setting up test environment...');
  
  try {
    // Ensure database tables exist
    await setupTestData();
    
    // Clean any existing test data
    await cleanupTestData();
    
    console.log('[TEST SETUP] Test environment setup complete');
  } catch (error) {
    console.error('[TEST SETUP] Failed to setup test environment:', error);
    throw error;
  }
}

export async function cleanupTestEnvironment() {
  console.log('[TEST CLEANUP] Cleaning up test environment...');
  
  try {
    await cleanupTestData();
    console.log('[TEST CLEANUP] Test environment cleanup complete');
  } catch (error) {
    console.error('[TEST CLEANUP] Failed to cleanup test environment:', error);
    // Don't throw here to avoid masking test failures
  }
}

export async function seedTestData() {
  console.log('[TEST SEED] Seeding test data...');
  
  try {
    // Insert test aliases
    const insertedAliases = [];
    for (const alias of testAliases) {
      const inserted = await insertTestAlias(alias);
      insertedAliases.push(inserted);
    }
    
    // Insert test expenses
    const insertedExpenses = [];
    for (const expense of testExpenses) {
      const inserted = await insertTestExpense(expense);
      insertedExpenses.push(inserted);
    }
    
    console.log(`[TEST SEED] Seeded ${insertedAliases.length} aliases and ${insertedExpenses.length} expenses`);
    
    return {
      aliases: insertedAliases,
      expenses: insertedExpenses
    };
  } catch (error) {
    console.error('[TEST SEED] Failed to seed test data:', error);
    throw error;
  }
}

export function createTestReport(testResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    },
    details: testResults
  };

  // Calculate summary
  for (const [testName, result] of Object.entries(testResults)) {
    report.summary.totalTests++;
    
    if (result.success) {
      report.summary.passed++;
    } else {
      report.summary.failed++;
      report.summary.errors.push({
        test: testName,
        error: result.errorDetails?.message || 'Unknown error',
        statusCode: result.statusCode
      });
    }
  }

  return report;
}

export function logDetailedError(error, context = {}) {
  console.error('\n[DETAILED ERROR]');
  console.error('Context:', JSON.stringify(context, null, 2));
  console.error('Error Message:', error.message);
  console.error('Stack Trace:', error.stack);
  
  if (error.response) {
    console.error('Response Status:', error.response.status);
    console.error('Response Headers:', error.response.headers);
  }
}

export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`[RETRY] Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

export function validateTestEnvironment() {
  const requiredEnvVars = [
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DATABASE'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('[ENV VALIDATION] All required environment variables are present');
}