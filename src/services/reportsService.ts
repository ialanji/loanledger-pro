export interface OverdueReportData {
  totalAmount: number;
  count: number;
  averageDays: number;
  items: Array<{
    contract: string;
    amount: number;
    days: number;
    bank: string;
  }>;
}

export interface ForecastReportData {
  items: Array<{
    bank: string;
    creditNumber: string;
    month: string;
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
  }>;
}

export interface PortfolioReportData {
  totalPrincipal: number;
  totalCredits: number;
  totalPaid: number;
  items: Array<{
    bank: string;
    creditCount: number;
    totalPrincipal: number;
    avgRate: number;
    totalPaid: number;
    remainingBalance: number;
  }>;
}

export interface InterestReportData {
  totalInterest: number;
  totalPayments: number;
  items: Array<{
    contract: string;
    bank: string;
    totalInterest: number;
    paymentCount: number;
    avgRate: number;
  }>;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  bankId?: string;
}

export interface Bank {
  id: string;
  name: string;
}

class ReportsService {
  private baseUrl = '/api/reports';

  private async fetchReport<T>(endpoint: string, filters: ReportFilters): Promise<T> {
    const params = new URLSearchParams();
    
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    
    if (filters.bankId && filters.bankId !== 'all') {
      params.append('bankId', filters.bankId);
    }

    const url = `${this.baseUrl}/${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint} report: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getBanks(): Promise<Bank[]> {
    const response = await fetch('/api/banks');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch banks: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getOverdueReport(filters: ReportFilters): Promise<OverdueReportData> {
    return this.fetchReport<OverdueReportData>('overdue', filters);
  }

  async getForecastReport(filters: ReportFilters): Promise<ForecastReportData> {
    return this.fetchReport<ForecastReportData>('forecast', filters);
  }

  async getPortfolioReport(filters: ReportFilters): Promise<PortfolioReportData> {
    return this.fetchReport<PortfolioReportData>('portfolio', filters);
  }

  async getInterestReport(filters: ReportFilters): Promise<InterestReportData> {
    return this.fetchReport<InterestReportData>('interest', filters);
  }

  async exportReport(reportType: string, format: string, filters: ReportFilters): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    
    if (filters.bankId && filters.bankId !== 'all') {
      params.append('bankId', filters.bankId);
    }

    params.append('format', format);

    const url = `${this.baseUrl}/${reportType}/export?${params.toString()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to export ${reportType} report: ${response.statusText}`);
    }
    
    // Создаем blob и скачиваем файл
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Определяем расширение файла
    const extension = format === 'excel' ? 'xlsx' : format;
    link.download = `${reportType}_report.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const reportsService = new ReportsService();