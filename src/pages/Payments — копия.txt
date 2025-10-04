import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Calendar, 
  DollarSign, 
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Trash2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { toast } from 'sonner';

// (данные загружаются из API /api/payments)

const statusConfig = {
  paid: { label: 'Оплачен', icon: CheckCircle, variant: 'default' as const, color: 'text-success' },
  pending: { label: 'Ожидает', icon: Clock, variant: 'secondary' as const, color: 'text-warning' },
  partial: { label: 'Частично', icon: AlertTriangle, variant: 'outline' as const, color: 'text-warning' },
  overdue: { label: 'Просрочен', icon: XCircle, variant: 'destructive' as const, color: 'text-destructive' },
  canceled: { label: 'Отменен', icon: XCircle, variant: 'outline' as const, color: 'text-muted-foreground' }
};

// Приведение статусов БД к статусам UI
function normalizeStatus(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'scheduled') return 'pending';
  if (s === 'cancelled' || s === 'canceled') return 'canceled';
  if (s === 'partial') return 'partial';
  if (s === 'overdue') return 'overdue';
  if (s === 'paid') return 'paid';
  return 'pending';
}

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [payments, setPayments] = useState<Array<{
    id: string | number;
    contractNumber: string;
    periodNumber: number;
    dueDate: Date;
    principalDue: number;
    interestDue: number;
    totalDue: number;
    status: keyof typeof statusConfig;
    paidAt?: Date | null;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/payments');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ignore) return;
        const normalized = (Array.isArray(data) ? data : []).map((row: any) => ({
          id: row.id,
          contractNumber: row.contract_number || '',
          periodNumber: Number(row.period_number ?? 0),
          dueDate: row.due_date ? new Date(row.due_date) : new Date(),
          principalDue: Number(row.principal_due ?? row.principalDue ?? 0),
          interestDue: Number(row.interest_due ?? row.interestDue ?? 0),
          totalDue: Number(row.total_due ?? row.totalDue ?? 0),
          status: normalizeStatus(row.status) as keyof typeof statusConfig,
          paidAt: row.paid_at ? new Date(row.paid_at) : null,
        }));
        setPayments(normalized);
      } catch (e: any) {
        setError(e?.message || 'Не удалось загрузить платежи');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true };
  }, []);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = payment.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
          ? payment.status === 'pending' || payment.status === 'partial'
          : statusFilter === 'overdue'
            ? payment.status === 'overdue'
            : true;
    return matchesSearch && matchesStatus;
  });

  // Подсчеты для карточек статистики
  const paidTotal = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.totalDue || 0), 0);
  // Сумма оплаченного основного долга (вместо "Ожидает")
  const paidPrincipalTotal = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.principalDue || 0), 0);
  // Сумма оплаченных процентов (вместо "Просрочено")
  const paidInterestTotal = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.interestDue || 0), 0);
  const totalTotal = payments.reduce((sum, p) => sum + (p.totalDue || 0), 0);

  const handlePayment = async (paymentId: string | number) => {
    try {
      const target = payments.find(p => p.id === paymentId);
      if (!target) {
        toast.error('Платеж не найден');
        return;
      }
      // Отправляем подтверждение оплаты на сервер (полная оплата на сумму totalDue)
      const res = await fetch(`/api/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paidAmount: target.totalDue })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const updated = await res.json();
      // Обновляем локальное состояние, чтобы UI сразу отразил оплату
      setPayments(prev => prev.map(p => (
        p.id === paymentId
          ? {
              ...p,
              status: 'paid',
              paidAt: updated?.paid_at ? new Date(updated.paid_at) : new Date(),
            }
          : p
      )));
      toast.success('Платеж подтвержден');
    } catch (e: any) {
      console.error('Payment confirm error:', e);
      toast.error('Не удалось подтвердить платеж');
    }
  };

  const handleDeletePayment = async (paymentId: string | number) => {
    if (!confirm('Вы уверены, что хотите удалить этот платеж?')) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}` , { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error(`HTTP ${res.status}`);
      }
      // Успех: оптимистично удаляем из состояния
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      toast.success('Платеж успешно удален');
    } catch (e: any) {
      toast.error('Ошибка при удалении платежа');
      console.error('Delete payment error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Платежи</h1>
        <p className="text-muted-foreground mt-2">
          Управление платежами по кредитам
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Оплачено</p>
                <p className="text-2xl font-bold financial-amount positive">
                  {formatCurrency(paidTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Основной долг</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(paidPrincipalTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Проценты</p>
                <p className="text-2xl font-bold financial-amount negative">
                  {formatCurrency(paidInterestTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Всего</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Поиск по номеру договора..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Все
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Ожидает
              </Button>
              <Button
                variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('overdue')}
              >
                Просрочено
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список платежей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Договор</th>
                  <th>Период</th>
                  <th>Дата платежа</th>
                  <th>Основной долг</th>
                  <th>Проценты</th>
                  <th>Всего к оплате</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const config = statusConfig[payment.status];
                  const StatusIcon = config.icon;
                  
                  return (
                    <tr key={payment.id}>
                      <td className="font-medium">{payment.contractNumber}</td>
                      <td>{payment.periodNumber}</td>
                      <td>{formatDate(payment.dueDate)}</td>
                      <td className="financial-amount">
                        {formatCurrency(payment.principalDue)}
                      </td>
                      <td className="financial-amount">
                        {formatCurrency(payment.interestDue)}
                      </td>
                      <td className="financial-amount font-semibold">
                        {formatCurrency(payment.totalDue)}
                      </td>
                      <td>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </td>
                      <td>
                        {payment.status === 'pending' || payment.status === 'overdue' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handlePayment(payment.id)}
                              className="btn-corporate"
                            >
                              Оплатить
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeletePayment(payment.id)}
                              className="gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Удалить
                            </Button>
                          </div>
                        ) : payment.status === 'paid' ? (
                          <span className="text-sm text-success">
                            Оплачено {payment.paidAt && formatDate(payment.paidAt)}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePayment(payment.id)}
                            className="gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Удалить
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}