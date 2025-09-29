import { Expense, ExpenseInsert, ExpenseUpdate } from '@/types/postgresql.types';

const API_BASE_URL = '/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Merge headers safely using the Headers API to avoid any-casts
    const mergedHeaders = new Headers(options?.headers as HeadersInit | undefined);
    if (options?.body && !mergedHeaders.has('Content-Type')) {
      mergedHeaders.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Robust JSON parsing: handle empty bodies and aborted streams gracefully
    try {
      // Some endpoints may return 204 No Content or an empty body on success
      if (response.status === 204) {
        return undefined as T;
      }

      // Prefer JSON parsing when content-type indicates JSON
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      // Fallback: read text body; if empty, return undefined
      const text = await response.text();
      return (text ? (JSON.parse(text) as T) : (undefined as T));
    } catch (e) {
      // If body parsing fails (e.g., Unexpected end of JSON input due to aborted stream),
      // treat as empty successful response rather than throwing
      return undefined as T;
    }
  }

  // Generic HTTP methods
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, options);
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...(options || {}),
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...(options || {}),
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...(options || {}),
    });
  }

  // Get all expenses
  async getExpenses(): Promise<Expense[]> {
    return this.request<Expense[]>('/expenses');
  }

  // Create new expense
  async createExpense(expense: ExpenseInsert): Promise<Expense> {
    return this.request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  // Update expense
  async updateExpense(id: string, expense: ExpenseUpdate): Promise<Expense> {
    return this.request<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  }

  // Delete expense
  async deleteExpense(id: string): Promise<void> {
    return this.request<void>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const apiClient = new ApiClient();