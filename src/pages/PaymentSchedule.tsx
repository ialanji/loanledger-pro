import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Copy, Calendar, TrendingUp, DollarSign, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentScheduleResponse, ScheduleItemWithRate, ScheduleTotals } from '@/types/credit';

export default function PaymentSchedule() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState<PaymentScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPaymentSchedule(id);
    }
  }, [id]);

  const fetchPaymentSchedule = async (creditId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/credits/${creditId}/schedule`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить график платежей');
      }
      
      const data = await response.json();
      setScheduleData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-MD', {
      style: 'currency',
      currency: 'MDL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ro-MD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  const getMethodDisplayName = (method: string) => {
    const methodNames: Record<string, string> = {
      'classic_annuity': 'Классический аннуитет',
      'classic_differentiated': 'Классический дифференцированный',
      'floating_annuity': 'Плавающий аннуитет',
      'floating_differentiated': 'Плавающий дифференцированный'
    };
    return methodNames[method] || method;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    if (!scheduleData) return;
    
    const tableText = scheduleData.schedule.map((item, index) => 
      `${index + 1}\t${formatDate(new Date(item.dueDate))}\t${formatCurrency(item.totalDue)}\t${formatCurrency(item.principalDue)}\t${formatCurrency(item.interestDue)}\t${formatCurrency(item.remainingBalance)}\t${formatPercentage(item.averageRate)}`
    ).join('\n');
    
    const fullText = `График платежей - ${scheduleData.loan.number}\n\nМесяц\tДата платежа\tПлатеж\tОсновной долг\tПроценты\tОстаток\tПроцентная ставка\n${tableText}`;
    
    try {
      await navigator.clipboard.writeText(fullText);
      // Здесь можно добавить уведомление об успешном копировании
    } catch (err) {
      console.error('Ошибка при копировании:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !scheduleData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/credits')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к кредитам
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground">
                {error || 'График платежей не найден'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/credits')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к кредитам
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">График платежей</h1>
            <p className="text-muted-foreground mt-1">
              Подробный график ежемесячных платежей ({scheduleData.schedule.length} платежей)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            Копировать
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Печать
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button variant="default" onClick={() => navigate(`/credits/${id}/manual-calculation`)}>
            <Calculator className="w-4 h-4 mr-2" />
            Рассчитать
          </Button>
        </div>
      </div>

      {/* Credit Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Информация о кредите
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Номер договора</p>
              <p className="font-mono font-medium text-lg">{scheduleData.loan.number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Сумма кредита</p>
              <p className="font-semibold text-lg financial-amount">
                {formatCurrency(scheduleData.loan.principal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Метод расчёта</p>
              <p className="font-medium">{getMethodDisplayName(scheduleData.loan.calculationMethod)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Статус</p>
              <Badge className="status-badge active">Активен</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Общая сумма платежей</p>
              <p className="text-2xl font-bold financial-amount">
                {formatCurrency(scheduleData.totals.totalPayments)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Общие проценты</p>
              <p className="text-2xl font-bold financial-amount">
                {formatCurrency(scheduleData.totals.totalInterest)}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Переплата</p>
              <p className="text-2xl font-bold financial-amount">
                {formatCurrency(scheduleData.totals.overpayment)}
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>
      </div>

      {/* Payment Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle>Месяц</CardTitle>
          <CardDescription>
            Детальный график ежемесячных платежей с разбивкой по компонентам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="finance-table">
              <thead>
                <tr>
                  <th className="text-center">Месяц</th>
                  <th className="text-center">Дата платежа</th>
                  <th className="text-right">Платеж (MDL)</th>
                  <th className="text-right">Основной долг (MDL)</th>
                  <th className="text-right">Проценты (MDL)</th>
                  <th className="text-right">Остаток (MDL)</th>
                  <th className="text-center">Процентная ставка (%)</th>
                </tr>
              </thead>
              <tbody>
                {scheduleData.schedule.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="text-center font-medium">{index + 1}</td>
                    <td className="text-center font-medium">{formatDate(new Date(item.dueDate))}</td>
                    <td className="text-right font-semibold financial-amount">
                      {formatCurrency(item.totalDue)}
                    </td>
                    <td className="text-right">
                      {formatCurrency(item.principalDue)}
                    </td>
                    <td className="text-right">
                      {formatCurrency(item.interestDue)}
                    </td>
                    <td className="text-right font-medium">
                      {formatCurrency(item.remainingBalance)}
                    </td>
                    <td className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {formatPercentage(item.averageRate)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}