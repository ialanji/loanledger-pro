import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  PiggyBank,
  Activity
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStats, Payment, Credit } from '@/types/credit';

// Mock data - в реальном приложении это будет загружаться из API
const mockStats: DashboardStats = {
  totalCredits: 156,
  activeCredits: 142,
  totalPrincipal: 45750000,
  remainingPrincipal: 32180000,
  projectedInterest: 8950000,
  thisMonthDue: 2650000,
  overdueAmount: 450000,
  totalPaid: 13570000
};

const mockUpcomingPayments = [
  {
    id: '1',
    contractNumber: 'CR-2024-001',
    clientName: 'Ion Popescu S.R.L.',
    dueDate: new Date('2024-01-15'),
    amount: 125000,
    type: 'Основной долг',
    status: 'pending' as const
  },
  {
    id: '2',
    contractNumber: 'CR-2024-002',
    clientName: 'Maria Industries',
    dueDate: new Date('2024-01-16'),
    amount: 87500,
    type: 'Проценты',
    status: 'pending' as const
  },
  {
    id: '3',
    contractNumber: 'CR-2023-089',
    clientName: 'Tech Solutions Ltd',
    dueDate: new Date('2024-01-18'),
    amount: 340000,
    type: 'Полный платеж',
    status: 'overdue' as const
  },
  {
    id: '4',
    contractNumber: 'CR-2024-003',
    clientName: 'Agro Moldova',
    dueDate: new Date('2024-01-20'),
    amount: 220000,
    type: 'Основной долг',
    status: 'pending' as const
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'status-badge overdue';
      case 'pending':
        return 'status-badge pending';
      default:
        return 'status-badge active';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Дашборд</h1>
          <p className="text-muted-foreground mt-1">
            Обзор финансового портфеля на {formatDate(new Date())}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Экспорт отчёта
          </Button>
          <Button className="btn-corporate" onClick={() => navigate('/credits/new')}>
            <CreditCard className="w-4 h-4 mr-2" />
            Новый кредит
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Всего кредитов"
          value={mockStats.totalCredits}
          subtitle={`${mockStats.activeCredits} активных`}
          icon={CreditCard}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
        />
        
        <StatCard
          title="Остаток основного долга"
          value={formatCurrency(mockStats.remainingPrincipal)}
          subtitle="70% от общей суммы"
          icon={PiggyBank}
          variant="default"
        />
        
        <StatCard
          title="К доплате в этом месяце"
          value={formatCurrency(mockStats.thisMonthDue)}
          subtitle="42 платежа"
          icon={Calendar}
          variant="success"
          trend={{ value: 8, isPositive: false }}
        />
        
        <StatCard
          title="Просроченные платежи"
          value={formatCurrency(mockStats.overdueAmount)}
          subtitle="3 кредита"
          icon={AlertTriangle}
          variant="danger"
          trend={{ value: 15, isPositive: false }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Payments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Ближайшие платежи
            </CardTitle>
            <CardDescription>
              Платежи на следующие 7 дней
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockUpcomingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-sm">{payment.contractNumber}</span>
                      <span className={getStatusBadge(payment.status)}>
                        {payment.status === 'overdue' ? 'Просрочен' : 'Ожидается'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{payment.clientName}</p>
                    <p className="text-xs text-muted-foreground">{payment.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="financial-amount text-sm font-semibold">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.dueDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Прогноз доходности
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Этот месяц</span>
                  <span className="financial-amount positive text-sm font-semibold">
                    {formatCurrency(890000)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Следующий месяц</span>
                  <span className="financial-amount positive text-sm font-semibold">
                    {formatCurrency(945000)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Годовой прогноз</span>
                  <span className="financial-amount positive text-sm font-semibold">
                    {formatCurrency(mockStats.projectedInterest)}
                  </span>
                </div>
                <div className="pt-3 border-t border-border/50">
                  <div className="bg-success/10 rounded-lg p-3">
                    <p className="text-xs text-success-foreground/80 mb-1">Средняя доходность</p>
                    <p className="text-lg font-bold text-success">12.4%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Быстрые действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Создать новый кредит
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <DollarSign className="w-4 h-4 mr-2" />
                Отметить платёж
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Просроченные платежи
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}