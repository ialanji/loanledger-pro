import { useState } from 'react';
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
  FileBarChart
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

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

const mockReportData = {
  overdue: {
    totalAmount: 156780.50,
    count: 12,
    averageDays: 15,
    items: [
      { contract: 'CRD-2024-001', amount: 45600.00, days: 25, bank: 'MAIB' },
      { contract: 'CRD-2024-003', amount: 32150.50, days: 12, bank: 'BEM' },
      { contract: 'CRD-2024-007', amount: 79030.00, days: 8, bank: 'ProCredit' }
    ]
  },
  forecast: {
    thisMonth: 234500.00,
    nextMonth: 187650.00,
    quarter: 756890.00,
    items: [
      { month: '2024-02', amount: 234500.00, count: 28 },
      { month: '2024-03', amount: 187650.00, count: 24 },
      { month: '2024-04', amount: 198740.00, count: 26 }
    ]
  }
};

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedBank, setSelectedBank] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');

  const handleGenerateReport = () => {
    console.log('Generating report:', {
      type: selectedReport,
      dateFrom,
      dateTo,
      bank: selectedBank,
      format: exportFormat
    });
    // TODO: Implement report generation
  };

  const handleExport = (format: string) => {
    console.log('Exporting report in format:', format);
    // TODO: Implement export functionality
  };

  const getReportPreview = () => {
    if (!selectedReport) return null;

    switch (selectedReport) {
      case 'overdue':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-destructive/10 p-4 rounded-lg">
                <h4 className="font-semibold text-destructive">Общая сумма</h4>
                <p className="text-2xl font-bold">{formatCurrency(mockReportData.overdue.totalAmount)}</p>
              </div>
              <div className="bg-warning/10 p-4 rounded-lg">
                <h4 className="font-semibold">Количество</h4>
                <p className="text-2xl font-bold">{mockReportData.overdue.count}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold">Средний срок</h4>
                <p className="text-2xl font-bold">{mockReportData.overdue.averageDays} дней</p>
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
                  {mockReportData.overdue.items.map((item, index) => (
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
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <h4 className="font-semibold text-primary">Этот месяц</h4>
                <p className="text-2xl font-bold">{formatCurrency(mockReportData.forecast.thisMonth)}</p>
              </div>
              <div className="bg-accent/10 p-4 rounded-lg">
                <h4 className="font-semibold text-accent">Следующий месяц</h4>
                <p className="text-2xl font-bold">{formatCurrency(mockReportData.forecast.nextMonth)}</p>
              </div>
              <div className="bg-success/10 p-4 rounded-lg">
                <h4 className="font-semibold text-success">Квартал</h4>
                <p className="text-2xl font-bold">{formatCurrency(mockReportData.forecast.quarter)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Месяц</th>
                    <th>Планируемая сумма</th>
                    <th>Количество платежей</th>
                  </tr>
                </thead>
                <tbody>
                  {mockReportData.forecast.items.map((item, index) => (
                    <tr key={index}>
                      <td className="font-medium">{item.month}</td>
                      <td className="financial-amount positive">{formatCurrency(item.amount)}</td>
                      <td>{item.count}</td>
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
              onClick={() => setSelectedReport(report.id)}
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
                  <SelectItem value="maib">Moldova Agroindbank</SelectItem>
                  <SelectItem value="bem">Banca de Economii</SelectItem>
                  <SelectItem value="procredit">ProCredit Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Формат экспорта</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
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