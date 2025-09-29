import { apiClient } from '@/lib/api'

export interface ImportTestResult {
  success: boolean
  total_rows: number
  preview_data: any[]
  errors: string[]
  warnings: string[]
}

export interface ImportResult {
  success: boolean
  imported_count: number
  skipped_count: number
  error_count: number
  errors: string[]
  warnings: string[]
  import_log_id?: string
}

export interface ImportOptions {
  skip_duplicates?: boolean
  update_existing?: boolean
  dry_run?: boolean
}

/**
 * Generate a hash for expense data to detect duplicates
 */
function generateExpenseHash(expense: {
  date: string
  amount: number
  description: string
  category: string
}): string {
  const data = `${expense.date}-${expense.amount}-${expense.description}-${expense.category}`
  // Simple hash function for browser compatibility
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Import expenses from a configured source
 * @param sourceId - The ID of the expense source
 * @param testMode - If true, only test the import without saving data
 * @returns Promise with import results
 */
export async function importExpensesFromSource(
  sourceId: string,
  testMode: boolean = false
): Promise<ImportResult | ImportTestResult> {
  try {
    // Fix: do NOT prefix with '/api' because ApiClient already adds '/api'
    const endpoint = testMode ? '/expense-import/test' : '/expense-import/run'

    const result = await apiClient.post(endpoint, {
      source_id: sourceId,
      test_mode: testMode
    });

    return result as ImportResult | ImportTestResult;
  } catch (error) {
    console.error('Import failed:', error);
    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}



/**
 * Get import history for a source
 * @param sourceId - The ID of the expense source
 * @param limit - Maximum number of records to return
 * @returns Promise with import history
 */
export async function getImportHistory(sourceId: string, limit: number = 10) {
  try {
    const result = await apiClient.get(`/import-logs?source_id=${sourceId}&limit=${limit}`);
    return result;
  } catch (error) {
    console.error('Failed to fetch import history:', error);
    throw new Error(`Failed to fetch import history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}