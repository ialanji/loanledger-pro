import { useState } from 'react';
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
  XCircle 
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

// Mock data
const mockPayments = [
  {
    id: '1',
    creditId: 'CR-001',
    contractNumber: 'CRD-2024-001',
    periodNumber: 1,
    dueDate: new Date('2024-01-15'),
    principalDue: 8500.00,
    interestDue: 1000.00,
    totalDue: 9500.00,
    status: 'paid' as const,
    paidAmount: 9500.00,
    paidAt: new Date('2024-01-15')
  },
  {
    id: '2',
    creditId: 'CR-001',
    contractNumber: 'CRD-2024-001',
    periodNumber: 2,
    dueDate: new Date('2024-02-15'),
    principalDue: 8570.25,
    interestDue: 929.75,
    totalDue: 9500.00,
    status: 'pending' as const
  },
  {
    id: '3',
    creditId: 'CR-002',
    contractNumber: 'CRD-2024-002',
    periodNumber: 1,
    dueDate: new Date('2024-01-20'),
    principalDue: 12000.00,
    interestDue: 1500.00,
    totalDue: 13500.00,
    status: 'overdue' as const
  }
];

const statusConfig = {
  paid: { label: 'Оплачен', icon: CheckCircle, variant: 'default' as const, color: 'text-success' },
  pending: { label: 'Ожидает', icon: Clock, variant: 'secondary' as const, color: 'text-warning' },
  partial: { label: 'Частично', icon: AlertTriangle, variant: 'outline' as const, color: 'text-warning' },
  overdue: { label: 'Просрочен', icon: XCircle, variant: 'destructive' as const, color: 'text-destructive' },
  canceled: { label: 'Отменен', icon: XCircle, variant: 'outline' as const, color: 'text-muted-foreground' }
};

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredPayments = mockPayments.filter(payment => {
    const matchesSearch = payment.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePayment = (paymentId: string) => {
    console.log('Processing payment:', paymentId);
    // TODO: Implement payment processing
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
                  {formatCurrency(9500.00)}
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
                <p className="text-sm font-medium text-muted-foreground">Ожидает</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(9500.00)}
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
                <p className="text-sm font-medium text-muted-foreground">Просрочено</p>
                <p className="text-2xl font-bold financial-amount negative">
                  {formatCurrency(13500.00)}
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
                  {formatCurrency(32500.00)}
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
                          <Button
                            size="sm"
                            onClick={() => handlePayment(payment.id)}
                            className="btn-corporate"
                          >
                            Оплатить
                          </Button>
                        ) : payment.status === 'paid' ? (
                          <span className="text-sm text-success">
                            Оплачено {payment.paidAt && formatDate(payment.paidAt)}
                          </span>
                        ) : null}
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