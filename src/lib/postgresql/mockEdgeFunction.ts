// Mock implementation of the import-expenses Edge Function for local development with PostgreSQL
import { apiClient } from '@/lib/api';

interface ImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: string[];
  warnings: string[];
  import_log_id?: string;
}

interface ImportTestResult {
  success: boolean;
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
  errors?: string[];
  warnings?: string[];
}

// Helper function to create import hash for duplicate detection
function createImportHash(data: any): string {
  const hashString = `${data.date}-${data.amount}-${data.description}-${data.category}`;
  // Simple hash function for browser compatibility
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

export async function mockImportExpenses(sourceId: string, testMode: boolean = false): Promise<ImportResult> {
  try {
    if (testMode) {
      // In test mode, call the server API endpoint
      const testResult = await apiClient.post(`/expense-sources/${sourceId}/test`) as ImportTestResult;
      
      // Convert test result to ImportResult format
      return {
        success: testResult.success,
        imported_count: 0, // Test mode doesn't import
        skipped_count: (testResult.total_rows || 0) - (testResult.valid_rows || 0),
        error_count: testResult.invalid_rows || 0,
        errors: testResult.errors || [],
        warnings: testResult.warnings || [],
        import_log_id: 'test-' + Date.now()
      };
    }
    
    // For actual import in development mode, return a mock result since this should run on server
    return {
      success: true,
      imported_count: 0,
      skipped_count: 0,
      error_count: 0,
      errors: [],
      warnings: ['Mock function - not implemented for browser'],
      import_log_id: 'mock-' + Date.now()
    };
  } catch (error) {
    console.error('Mock import error:', error);
    return {
      success: false,
      imported_count: 0,
      skipped_count: 0,
      error_count: 1,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: []
    };
  }
}