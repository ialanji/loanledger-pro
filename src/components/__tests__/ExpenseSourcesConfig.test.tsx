import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Мок модулей должен быть до импорта компонента
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/postgresql/expenseImport', () => ({
  importExpensesFromSource: jest.fn(),
  getImportHistory: jest.fn(),
}));

jest.mock('@/lib/googleSheets', () => ({
  validateSheetsUrl: jest.fn(),
}));

import ExpenseSourcesConfig from '../ExpenseSourcesConfig';
import { apiClient } from '@/lib/api';
import { importExpensesFromSource, getImportHistory } from '@/lib/postgresql/expenseImport';
import { validateSheetsUrl } from '@/lib/googleSheets';

// Типизируем моки
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockImportExpensesFromSource = importExpensesFromSource as jest.MockedFunction<typeof importExpensesFromSource>;
const mockGetImportHistory = getImportHistory as jest.MockedFunction<typeof getImportHistory>;
const mockValidateSheetsUrl = validateSheetsUrl as jest.MockedFunction<typeof validateSheetsUrl>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Мок данных
const mockSources = [
  {
    id: 1,
    name: 'Test Source',
    category: 'salary',
    sheet_url: 'https://docs.google.com/spreadsheets/test',
    import_mode: 'google_sheets',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    column_mapping: { date: 'A', employee: 'B', department: 'C', amount: 'D', description: 'E' }
  }
];

describe('ExpenseSourcesConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Настройка успешных ответов по умолчанию
    mockApiClient.get.mockImplementation((url) => {
      if (url.includes('/expense-sources')) {
        return Promise.resolve({ data: mockSources });
      }
      if (url.includes('/import-history')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    mockGetImportHistory.mockResolvedValue([]);
  });

  it('должен отображаться без ошибок', async () => {
    render(
      <TestWrapper>
        <ExpenseSourcesConfig />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Источники данных')).toBeInTheDocument();
    });
  });

  it('должен загружать источники данных', async () => {
    render(
      <TestWrapper>
        <ExpenseSourcesConfig />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/expense-sources');
      expect(screen.getByText('Test Source')).toBeInTheDocument();
    });
  });

  it('должен отображать кнопку "Новый источник"', async () => {
    render(
      <TestWrapper>
        <ExpenseSourcesConfig />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Новый источник')).toBeInTheDocument();
    });
  });

  it('должен отображать вкладки', async () => {
    render(
      <TestWrapper>
        <ExpenseSourcesConfig />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Источники')).toBeInTheDocument();
      expect(screen.getByText('История импорта')).toBeInTheDocument();
    });
  });

  it('должен отображать кнопку обновления', async () => {
    render(
      <TestWrapper>
        <ExpenseSourcesConfig />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Обновить')).toBeInTheDocument();
    });
  });
});