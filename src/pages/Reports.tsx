import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  FileSpreadsheet,
  FileBarChart,
  Loader2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { reportsService, type OverdueReportData, type ForecastReportData, type PortfolioReportData, type InterestReportData, type ReportFilters } from '@/services/reportsService';

const reportTypes = [
  {
    id: 'overdue',
    title: 'Отчет по просрочкам',
    description: 'Список просроченных платежей и анализ задолженности',
    icon: AlertTriangle,
    color: 'text-destructive'
  },
  {
    id: 'forecast',
    title: 'Прогноз платежей',
    description: 'Планируемые поступления и анализ денежных потоков',
    icon: TrendingUp,
    color: 'text-primary'
  },
  {
    id: 'portfolio',
    title: 'Портфельный анализ',
    description: 'Анализ кредитного портфеля по банкам и типам кредитов',
    icon: BarChart3,
    color: 'text-accent'
  },
  {
    id: 'interest',
    title: 'Анализ процентов',
    description: 'Начисленные и полученные проценты за период',
    icon: DollarSign,
    color: 'text-warning'
  }
];

interface Bank {
  id: string;
  name: string;
}

// Утилитарная функция для трансформации данных прогноза в формат сводной таблицы
const transformToPivotTable = (items: any[]) => {
  const pivotData: Record<string, {
    year: number;
    month: string;
    banks: Record<string, { principal: number; interest: number }>;
    totals: { principal: number; interest: number };
  }> = {};

  // Группируем данные по году/месяцу
  items.forEach(item => {
    const key = item.month; // Формат: "2024-01"
    const [year, monthNum] = key.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('ru-RU', { 
      year: 'numeric', 
      month: 'long' 
    });

    if (!pivotData[key]) {
      pivotData[key] = {
        year: parseInt(year),
        month: monthName,
        banks: {},
        totals: { principal: 0, interest: 0 }
      };
    }

    // Инициализируем данные банка, если их нет
    if (!pivotData[key].banks[item.bank]) {
      pivotData[key].banks[item.bank] = { principal: 0, interest: 0 };
    }

    // Агрегируем суммы по банкам
    pivotData[key].banks[item.bank].principal += item.principalAmount || 0;
    pivotData[key].banks[item.bank].interest += item.interestAmount || 0;

    // Обновляем общие итоги
    pivotData[key].totals.principal += item.principalAmount || 0;
    pivotData[key].totals.interest += item.interestAmount || 0;
  });

  // Преобразуем в массив и сортируем по году/месяцу
  return Object.entries(pivotData)
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => a.key.localeCompare(b.key));
};

// Утилитарная функция для трансформации данных прогноза в формат группировки по годам
const transformToYearlyPivotTable = (items: any[]) => {
  // Группируем данные по году
  const yearMap = new Map<string, {
    year: number;
    months: Record<string, {
      month: string;
      monthName: string;
      banks: Record<string, { principal: number; interest: number }>;
      totals: { principal: number; interest: number };
    }>;
    totals: { principal: number; interest: number };
  }>();

  items.forEach(item => {
    const [yearStr, monthStr] = item.month.split('-');
    const year = parseInt(yearStr);
    const monthKey = item.month; // "2025-10"
    const monthName = new Date(year, parseInt(monthStr) - 1).toLocaleDateString('ru-RU', { 
      month: 'long' 
    });

    if (!yearMap.has(yearStr)) {
      yearMap.set(yearStr, {
        year,
        months: {},
        totals: { principal: 0, interest: 0 }
      });
    }

    const yearData = yearMap.get(yearStr)!;
    
    if (!yearData.months[monthKey]) {
      yearData.months[monthKey] = {
        month: monthStr,
        monthName,
        banks: {},
        totals: { principal: 0, interest: 0 }
      };
    }

    // Инициализируем данные банка, если их нет
    if (!yearData.months[monthKey].banks[item.bank]) {
      yearData.months[monthKey].banks[item.bank] = { principal: 0, interest: 0 };
    }

    // Агрегируем суммы по банкам
    yearData.months[monthKey].banks[item.bank].principal += item.principalAmount || 0;
    yearData.months[monthKey].banks[item.bank].interest += item.interestAmount || 0;

    // Обновляем общие итоги месяца
    yearData.months[monthKey].totals.principal += item.principalAmount || 0;
    yearData.months[monthKey].totals.interest += item.interestAmount || 0;

    // Обновляем общие итоги года
    yearData.totals.principal += item.principalAmount || 0;
    yearData.totals.interest += item.interestAmount || 0;
  });

  // Преобразуем в массив и сортируем по году
  return Array.from(yearMap.entries())
    .map(([yearStr, data]) => ({ 
      yearStr, 
      ...data,
      // Сортируем месяцы внутри года
      monthsArray: Object.entries(data.months)
        .map(([key, monthData]) => ({ key, ...monthData }))
        .sort((a, b) => a.key.localeCompare(b.key))
    }))
    .sort((a, b) => a.year - b.year);
};

// Извлекаем уникальные названия банков из данных прогноза
const getUniqueBankNames = (items: any[]) => {
  const bankNames = [...new Set(items.map(item => item.bank))];
  return bankNames.sort(); // Сортируем по алфавиту для консистентного отображения
};

export default function Reports() {
  // Основные состояния компонента
  const [selectedReport, setSelectedReport] = useState(''); // Выбранный тип отчета
  const [dateFrom, setDateFrom] = useState(''); // Дата начала фильтра
  const [dateTo, setDateTo] = useState(''); // Дата окончания фильтра
  const [selectedBank, setSelectedBank] = useState('all'); // Выбранный банк для фильтрации
  const [exportFormat, setExportFormat] = useState('pdf'); // Формат экспорта
  const [reportForm, setReportForm] = useState<'list' | 'table'>('list'); // Форма отчета (список/таблица)
  const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({}); // Состояние раскрытых банков в портфельном отчете
  const [banks, setBanks] = useState<Bank[]>([]); // Список банков
  const [reportData, setReportData] = useState<OverdueReportData | ForecastReportData | PortfolioReportData | InterestReportData | null>(null); // Данные отчета
  const [loading, setLoading] = useState<boolean>(false); // Состояние загрузки
  const [error, setError] = useState<string | null>(null); // Ошибки

  // Функция для переключения отображения кредитов банка в портфельном отчете
  const toggleBankCredits = (bankName: string) => {
    setExpandedBanks(prev => ({
      ...prev,
      [bankName]: !prev[bankName]
    }));
  };

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const banksData = await reportsService.getBanks();
        setBanks(banksData);
      } catch (err) {
        console.error('Failed to load banks:', err);
      }
    };
    loadBanks();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedReport) return;

    // Валидация диапазона дат
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError('Дата начала не может быть больше даты окончания');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: ReportFilters = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        bankId: selectedBank !== 'all' ? selectedBank : undefined
      };

      let data;
      switch (selectedReport) {
        case 'overdue':
          data = await reportsService.getOverdueReport(filters);
          break;
        case 'forecast':
          data = await reportsService.getForecastReport(filters);
          break;
        case 'portfolio':
          data = await reportsService.getPortfolioReport(filters);
          break;
        case 'interest':
          data = await reportsService.getInterestReport(filters);
          break;
        default:
          throw new Error('Unknown report type');
      }

      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при генерации отчета');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!selectedReport || !reportData) return;

    try {
      const filters: ReportFilters = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        bankId: selectedBank !== 'all' ? selectedBank : undefined
      };

      await reportsService.exportReport(selectedReport, format, filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при экспорте отчета');
    }
  };

  const getReportPreview = () => {
    if (!selectedReport) return null;

    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка отчета...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
          <Button 
            variant="outline" 
            onClick={handleGenerateReport}
            className="mt-4"
          >
            Попробовать снова
          </Button>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Нажмите "Создать отчет" для просмотра данных</p>
        </div>
      );
    }

    switch (selectedReport) {
      case 'overdue':
        const overdueData = reportData as OverdueReportData;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-destructive/10 p-4 rounded-lg">
                <h4 className="font-semibold text-destructive">Общая сумма</h4>
                <p className="text-2xl font-bold">{formatCurrency(overdueData.totalAmount)}</p>
              </div>
              <div className="bg-warning/10 p-4 rounded-lg">
                <h4 className="font-semibold">Количество</h4>
                <p className="text-2xl font-bold">{overdueData.count}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold">Средний срок</h4>
                <p className="text-2xl font-bold">{overdueData.averageDays} дней</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Договор</th>
                    <th>Сумма просрочки</th>
                    <th>Дней просрочки</th>
                    <th>Банк</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="font-medium">{item.contract}</td>
                      <td className="financial-amount negative">{formatCurrency(item.amount)}</td>
                      <td>{item.days}</td>
                      <td>{item.bank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'forecast':
        const forecastData = reportData as ForecastReportData;
        
        // Проверка на пустые результаты
        if (!forecastData.items || forecastData.items.length === 0) {
          return (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Нет данных для отображения</p>
              <p className="text-sm text-muted-foreground mt-2">Попробуйте изменить параметры фильтрации</p>
            </div>
          );
        }
        
        // Calculate totals
        const totalPrincipal = forecastData.items.reduce((sum, item) => sum + (item.principalAmount || 0), 0);
        const totalInterest = forecastData.items.reduce((sum, item) => sum + (item.interestAmount || 0), 0);
        const totalAmount = forecastData.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
        
        if (reportForm === 'list') {
          // Списочный вид - существующая структура таблицы
          return (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Банк</th>
                      <th>Кредит</th>
                      <th>Месяц</th>
                      <th>Остаток долга</th>
                      <th>Проценты</th>
                      <th>Всего</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="font-medium">{item.bank}</td>
                        <td>{item.creditNumber}</td>
                        <td>{item.month}</td>
                        <td className="financial-amount">{formatCurrency(item.principalAmount)}</td>
                        <td className="financial-amount">{formatCurrency(item.interestAmount)}</td>
                        <td className="financial-amount positive">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-gray-50">
                      <td colSpan={3} className="font-bold">Итого:</td>
                      <td className="financial-amount font-bold">{formatCurrency(totalPrincipal)}</td>
                      <td className="financial-amount font-bold">{formatCurrency(totalInterest)}</td>
                      <td className="financial-amount positive font-bold">{formatCurrency(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        } else {
          // Табличный вид - группировка по годам
          const yearlyPivotData = transformToYearlyPivotTable(forecastData.items);
          const uniqueBanks = getUniqueBankNames(forecastData.items);
          
          // Вычисляем общие итоги по всем годам
          const grandTotals = {
            principal: yearlyPivotData.reduce((sum, year) => sum + year.totals.principal, 0),
            interest: yearlyPivotData.reduce((sum, year) => sum + year.totals.interest, 0),
            banks: uniqueBanks.reduce((acc, bank) => {
              acc[bank] = {
                principal: yearlyPivotData.reduce((sum, year) => {
                  return sum + year.monthsArray.reduce((monthSum, month) => {
                    return monthSum + (month.banks[bank]?.principal || 0);
                  }, 0);
                }, 0),
                interest: yearlyPivotData.reduce((sum, year) => {
                  return sum + year.monthsArray.reduce((monthSum, month) => {
                    return monthSum + (month.banks[bank]?.interest || 0);
                  }, 0);
                }, 0)
              };
              return acc;
            }, {} as Record<string, { principal: number; interest: number }>)
          };

          return (
            <div className="space-y-6">
              {yearlyPivotData.map((yearData, yearIndex) => (
                <div key={yearData.yearStr} className="border rounded-lg p-4">
                  <h3 className="text-xl font-bold mb-4 text-primary">Год: {yearData.yearStr}</h3>
                  <div className="overflow-x-auto">
                    <table className="finance-table">
                      <thead>
                        {/* Первый ряд заголовков - названия банков */}
                        <tr>
                          <th rowSpan={2}>Месяц</th>
                          {uniqueBanks.map(bank => (
                            <th key={bank} colSpan={2} className="text-center">{bank}</th>
                          ))}
                          <th colSpan={2} className="text-center">Итого</th>
                        </tr>
                        {/* Второй ряд заголовков - колонки остатка долга/процентов */}
                        <tr>
                          {uniqueBanks.map(bank => (
                            <React.Fragment key={bank}>
                              <th>Остаток долга</th>
                              <th>Проценты</th>
                            </React.Fragment>
                          ))}
                          <th>Остаток долга</th>
                          <th>Проценты</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearData.monthsArray.map((monthData, monthIndex) => (
                          <tr key={monthData.key}>
                            <td className="font-medium">{monthData.monthName}</td>
                            {uniqueBanks.map(bank => (
                              <React.Fragment key={bank}>
                                <td className="financial-amount">
                                  {formatCurrency(monthData.banks[bank]?.principal || 0)}
                                </td>
                                <td className="financial-amount">
                                  {formatCurrency(monthData.banks[bank]?.interest || 0)}
                                </td>
                              </React.Fragment>
                            ))}
                            <td className="financial-amount font-bold">
                              {formatCurrency(monthData.totals.principal)}
                            </td>
                            <td className="financial-amount font-bold">
                              {formatCurrency(monthData.totals.interest)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-blue-50">
                          <td className="font-bold text-primary">Итого по году:</td>
                          {uniqueBanks.map(bank => (
                            <React.Fragment key={bank}>
                              <td className="financial-amount font-bold">
                                {formatCurrency(yearData.monthsArray.reduce((sum, month) => sum + (month.banks[bank]?.principal || 0), 0))}
                              </td>
                              <td className="financial-amount font-bold">
                                {formatCurrency(yearData.monthsArray.reduce((sum, month) => sum + (month.banks[bank]?.interest || 0), 0))}
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="financial-amount positive font-bold">
                            {formatCurrency(yearData.totals.principal)}
                          </td>
                          <td className="financial-amount positive font-bold">
                            {formatCurrency(yearData.totals.interest)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
              
              {/* Общие итоги по всем годам */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-xl font-bold mb-4 text-success">Общие итоги по всем годам</h3>
                <div className="overflow-x-auto">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Банк</th>
                        <th>Остаток долга</th>
                        <th>Проценты</th>
                        <th>Всего</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueBanks.map(bank => (
                        <tr key={bank}>
                          <td className="font-medium">{bank}</td>
                          <td className="financial-amount font-bold">
                            {formatCurrency(grandTotals.banks[bank]?.principal || 0)}
                          </td>
                          <td className="financial-amount font-bold">
                            {formatCurrency(grandTotals.banks[bank]?.interest || 0)}
                          </td>
                          <td className="financial-amount positive font-bold">
                            {formatCurrency((grandTotals.banks[bank]?.principal || 0) + (grandTotals.banks[bank]?.interest || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-green-50">
                        <td className="font-bold text-success">ИТОГО:</td>
                        <td className="financial-amount positive font-bold">
                          {formatCurrency(grandTotals.principal)}
                        </td>
                        <td className="financial-amount positive font-bold">
                          {formatCurrency(grandTotals.interest)}
                        </td>
                        <td className="financial-amount positive font-bold text-lg">
                          {formatCurrency(grandTotals.principal + grandTotals.interest)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          );
        }

      case 'portfolio':
          const portfolioData = reportData as PortfolioReportData;
          
          // Проверка на пустые результаты
          if (!portfolioData.items || portfolioData.items.length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Нет данных для отображения</p>
                <p className="text-sm text-muted-foreground mt-2">Попробуйте изменить параметры фильтрации</p>
              </div>
            );
          }
          
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary">Общая сумма кредитов</h4>
                  <p className="text-2xl font-bold">{formatCurrency(portfolioData.totalPrincipal)}</p>
                </div>
                <div className="bg-accent/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-accent">Количество кредитов</h4>
                  <p className="text-2xl font-bold">{portfolioData.totalCredits}</p>
                </div>
                <div className="bg-success/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-success">Выплачено</h4>
                  <p className="text-2xl font-bold">{formatCurrency(portfolioData.totalPaid)}</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Банк</th>
                      <th>Кредитов</th>
                      <th>Основная сумма</th>
                      <th>Средняя ставка</th>
                      <th>Выплачено</th>
                      <th>Остаток</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioData.items.map((item, index) => (
                      <React.Fragment key={index}>
                        <tr>
                          <td className="font-medium">{item.bank}</td>
                          <td>{item.creditCount}</td>
                          <td className="financial-amount">{formatCurrency(item.totalPrincipal)}</td>
                          <td>{item.avgRate.toFixed(2)}%</td>
                          <td className="financial-amount positive">{formatCurrency(item.totalPaid)}</td>
                          <td className="financial-amount">{formatCurrency(item.remainingBalance)}</td>
                          <td>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleBankCredits(item.bank)}
                              className="text-xs"
                            >
                              {expandedBanks[item.bank] ? 'Скрыть кредиты' : 'Показать кредиты'}
                            </Button>
                          </td>
                        </tr>
                        {expandedBanks[item.bank] && item.credits && (
                          <tr>
                            <td colSpan={7} className="p-0">
                              <div className="bg-gray-50 p-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2">Номер договора</th>
                                      <th className="text-left py-2">Основная сумма</th>
                                      <th className="text-left py-2">Остаток</th>
                                      <th className="text-left py-2">Ставка</th>
                                      <th className="text-left py-2">Выплачено</th>
                                      <th className="text-left py-2">Дата начала</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.credits
                                      .sort((a, b) => (a.contractNumber || '').localeCompare(b.contractNumber || ''))
                                      .map((credit, creditIndex) => (
                                        <tr key={creditIndex} className="border-b border-gray-200">
                                          <td className="py-2 font-medium">{credit.contractNumber}</td>
                                          <td className="py-2">{formatCurrency(credit.principal)}</td>
                                          <td className="py-2">{formatCurrency(credit.remainingBalance)}</td>
                                          <td className="py-2">{credit.rate.toFixed(2)}%</td>
                                          <td className="py-2">{formatCurrency(credit.paidAmount)}</td>
                                          <td className="py-2">{formatDate(new Date(credit.startDate))}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        
        case 'interest':
          const interestData = reportData as InterestReportData;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary">Общий процентный доход</h4>
                  <p className="text-2xl font-bold">{formatCurrency(interestData.totalInterest)}</p>
                </div>
                <div className="bg-accent/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-accent">Количество платежей</h4>
                  <p className="text-2xl font-bold">{interestData.totalPayments}</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Договор</th>
                      <th>Банк</th>
                      <th>Процентный доход</th>
                      <th>Платежей</th>
                      <th>Средняя ставка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interestData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="font-medium">{item.contract}</td>
                        <td>{item.bank}</td>
                        <td className="financial-amount positive">{formatCurrency(item.totalInterest)}</td>
                        <td>{item.paymentCount}</td>
                        <td>{item.avgRate.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );

        default:
          return (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Выберите тип отчета для просмотра данных</p>
            </div>
          );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Отчеты</h1>
        <p className="text-muted-foreground mt-2">
          Аналитические отчеты и экспорт данных
        </p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card 
              key={report.id}
              className={`cursor-pointer transition-all ${
                selectedReport === report.id ? 'ring-2 ring-primary border-primary/50' : 'hover:shadow-md'
              }`}
              onClick={() => {
                setSelectedReport(report.id);
                setReportData(null);
                setError(null);
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{report.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Параметры отчета
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date-from">Дата от</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">Дата до</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label>Банк</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите банк" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все банки</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedReport === 'forecast' && (
              <div>
                <Label>Форма отчета</Label>
                <Select value={reportForm} onValueChange={(value: 'list' | 'table') => setReportForm(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">Список</SelectItem>
                    <SelectItem value="table">Таблица</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <Button 
              onClick={handleGenerateReport}
              disabled={!selectedReport}
              className="btn-corporate gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Создать отчет
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleExport('excel')}
              disabled={!selectedReport}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleExport('pdf')}
              disabled={!selectedReport}
              className="gap-2"
            >
              <FileBarChart className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle>Предварительный просмотр</CardTitle>
          </CardHeader>
          <CardContent>
            {getReportPreview()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}