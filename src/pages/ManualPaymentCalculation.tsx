import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calculator, AlertCircle } from 'lucide-react';
import { PaymentStatus, ScheduleItem } from '@/types/credit';
import { format } from 'date-fns';

interface UnprocessedPeriod extends ScheduleItem {
  isOverdue: boolean;
  status: string;
}

export default function ManualPaymentCalculation() {
  const { id } = useParams<{ id: string }>();
  const [creditInfo, setCreditInfo] = useState<{ contractNumber: string; method: string } | null>(null);
  const [unprocessedPeriods, setUnprocessedPeriods] = useState<UnprocessedPeriod[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  useEffect(() => {
    if (id) {
      loadInitialData();
    }
  }, [id]);

  // Определение статуса по дате с приоритетом серверного статуса
  const getStatusByDate = (date: Date, serverStatus?: string) => {
    // Если сервер уже вернул статус отличный от 'scheduled', используем его
    if (serverStatus && serverStatus.toLowerCase() !== 'scheduled') {
      return serverStatus.toLowerCase();
    }
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(date);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dStart < todayStart) return PaymentStatus.OVERDUE;
    return PaymentStatus.SCHEDULED;
  };

  // Начальная загрузка: данные кредита + непроведённые периоды
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const creditResponse = await fetch(`/api/credits/${id}`);
      if (!creditResponse.ok) {
        throw new Error('Не удалось загрузить информацию о кредите');
      }
      const rawCredit = await creditResponse.json();
      setCreditInfo({
        contractNumber: rawCredit.contract_number ?? rawCredit.contractNumber ?? '',
        method: rawCredit.method ?? ''
      });

      await loadUnprocessedPeriods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка непроведённых периодов из БД (без пересчёта)
  const loadUnprocessedPeriods = async () => {
    try {
      setIsRefreshing(true);
      const unprocessedResp = await fetch(`/api/credits/${id}/payments/unprocessed`);
      if (!unprocessedResp.ok) {
        throw new Error('Не удалось загрузить непроведённые периоды');
      }
      const rows = await unprocessedResp.json();

      const periodsWithStatus: UnprocessedPeriod[] = (Array.isArray(rows) ? rows : []).map((r: any) => {
        const dueDate = new Date(r.due_date ?? r.dueDate);
        const serverStatus = String(r.status ?? '').toLowerCase();
        const finalStatus = getStatusByDate(dueDate, serverStatus);
        return {
          periodNumber: Number(r.period_number ?? r.periodNumber ?? 0),
          dueDate,
          principalDue: Number(r.principal_due ?? r.principalDue ?? 0),
          interestDue: Number(r.interest_due ?? r.interestDue ?? 0),
          totalDue: Number(r.total_due ?? r.totalDue ?? 0),
          remainingBalance: Number(r.remaining_balance ?? r.remainingBalance ?? 0),
          isOverdue: finalStatus === PaymentStatus.OVERDUE,
          status: finalStatus
        };
      });

      setUnprocessedPeriods(periodsWithStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке непроведённых периодов');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePeriodSelection = (periodNumber: number) => {
    const newSelected = new Set(selectedPeriods);
    if (newSelected.has(periodNumber)) {
      newSelected.delete(periodNumber);
    } else {
      newSelected.add(periodNumber);
    }
    setSelectedPeriods(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPeriods.size === unprocessedPeriods.length) {
      setSelectedPeriods(new Set());
    } else {
      setSelectedPeriods(new Set(unprocessedPeriods.map(p => p.periodNumber)));
    }
  };

  const handleCreatePayments = async () => {
    if (selectedPeriods.size === 0) {
      setError('Выберите хотя бы один период для создания платежей');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      setSuccessMessage(null);

      const selectedPeriodData = unprocessedPeriods.filter(p => 
        selectedPeriods.has(p.periodNumber)
      );

      const payloadItems = selectedPeriodData.map(p => ({
        periodNumber: p.periodNumber,
        dueDate: p.dueDate,
        principalDue: p.principalDue,
        interestDue: p.interestDue,
        totalDue: p.totalDue
      }));

      const response = await fetch(`/api/credits/${id}/payments/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payments: payloadItems }),
      });

      if (!response.ok) {
        throw new Error('Не удалось создать платежи');
      }

      const resJson = await response.json();
      const createdCount = typeof resJson?.createdCount === 'number' ? resJson.createdCount : payloadItems.length;
      setSuccessMessage(`Успешно создано ${createdCount} платежей в системе`);

      await loadUnprocessedPeriods();
      setSelectedPeriods(new Set());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при создании платежей');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGeneratePayments = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setSuccessMessage(null);

      // First, load unprocessed periods to get the data
      await loadUnprocessedPeriods();
      
      // Determine which periods to create payments for
      let periodsToProcess = [];
      if (selectedPeriods.size > 0) {
        // Use selected periods
        periodsToProcess = unprocessedPeriods.filter(p => 
          selectedPeriods.has(p.periodNumber)
        );
      } else {
        // Use all unprocessed periods
        periodsToProcess = unprocessedPeriods;
      }

      if (periodsToProcess.length === 0) {
        setError('Нет периодов для создания платежей');
        return;
      }

      const payloadItems = periodsToProcess.map(p => ({
        periodNumber: p.periodNumber,
        dueDate: p.dueDate,
        principalDue: p.principalDue,
        interestDue: p.interestDue,
        totalDue: p.totalDue
      }));

      const response = await fetch(`/api/credits/${id}/payments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: payloadItems })
      });

      if (!response.ok) {
        throw new Error('Не удалось создать платежи');
      }

      const resJson = await response.json();
      const generatedCount = typeof resJson?.createdCount === 'number' ? resJson.createdCount : 0;
      
      if (selectedPeriods.size > 0) {
        setSuccessMessage(generatedCount > 0 
          ? `Рассчитано ${generatedCount} новых платежей из ${selectedPeriods.size} выбранных.`
          : 'Все выбранные платежи уже рассчитаны.'
        );
      } else {
        setSuccessMessage(generatedCount > 0 
          ? `Рассчитано ${generatedCount} новых платежей до конца текущего месяца.`
          : 'Все платежи до конца месяца уже рассчитаны.'
        );
      }

      await loadUnprocessedPeriods();
      setSelectedPeriods(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при расчёте платежей');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-MD', {
      style: 'currency',
      currency: 'MDL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd.MM.yyyy');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case PaymentStatus.OVERDUE:
        return 'destructive';
      case PaymentStatus.SCHEDULED:
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case PaymentStatus.OVERDUE:
        return 'Просрочен';
      case PaymentStatus.SCHEDULED:
        return 'Ожидается';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !creditInfo) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Расчетное закрытие платежей</h1>
          <p className="text-muted-foreground mt-2">
            Кредит: {creditInfo?.contractNumber} | Метод: {creditInfo?.method}
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => loadUnprocessedPeriods()} 
            disabled={isRefreshing}
          >
            Обновить
          </Button>
          <Button onClick={handleGeneratePayments} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Рассчитывается...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Рассчитать
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Сообщения об ошибках и успехе */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Непроведенных периодов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unprocessedPeriods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Просроченных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {unprocessedPeriods.filter(p => p.isOverdue).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Выбрано</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{selectedPeriods.size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица с периодами */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Непроведенные платежные периоды</CardTitle>
            {unprocessedPeriods.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll()}
              >
                {selectedPeriods.size === unprocessedPeriods.length ? 'Снять выбор' : 'Выбрать все'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {unprocessedPeriods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нажмите "Рассчитать" для генерации платёжных периодов</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPeriods.size === unprocessedPeriods.length && unprocessedPeriods.length > 0}
                        onCheckedChange={() => handleSelectAll()}
                      />
                    </TableHead>
                    <TableHead>Период</TableHead>
                    <TableHead>Дата платежа</TableHead>
                    <TableHead className="text-right">Основной долг</TableHead>
                    <TableHead className="text-right">Проценты</TableHead>
                    <TableHead className="text-right">Общий платеж</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unprocessedPeriods.map((period) => (
                    <TableRow key={period.periodNumber}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPeriods.has(period.periodNumber)}
                          onCheckedChange={() => handlePeriodSelection(period.periodNumber)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{period.periodNumber}</TableCell>
                      <TableCell>{formatDate(period.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(period.principalDue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(period.interestDue)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(period.totalDue)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(period.status)}>
                          {getStatusLabel(period.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Кнопка создания платежей */}
      {unprocessedPeriods.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleCreatePayments}
            disabled={selectedPeriods.size === 0 || isCreating}
            className="min-w-[200px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Создать платежи ({selectedPeriods.size})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}