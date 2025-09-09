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
import { Progress } from '@/components/ui/progress';
import { DashboardStats, Payment, Credit } from '@/types/credit';

// Mock data - в реальном приложении это будет загружаться из API
const mockStats: DashboardStats = {
  totalCredits: 1,
  activeCredits: 1,
  totalPrincipal: 10000000,
  remainingPrincipal: 10000000,
  projectedInterest: 1816356.3,
  thisMonthDue: 364163.47,
  overdueAmount: 0,
  totalPaid: 0
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
      {/* Общая информация по кредитам */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <DollarSign className="w-5 h-5" />
            Общая информация по кредитам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Общая сумма кредита */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                ОБЩАЯ СУММА КРЕДИТА
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {formatCurrency(mockStats.totalPrincipal).replace('MDL', '₽')}
              </p>
              <p className="text-xs text-muted-foreground">
                {mockStats.totalCredits} кредит в {mockStats.activeCredits} банках
              </p>
            </div>

            {/* Остаток долга */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                ОСТАТОК ДОЛГА
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {formatCurrency(mockStats.remainingPrincipal).replace('MDL', '₽')}
              </p>
              <p className="text-xs text-blue-500">
                ✓ 100.0% от общей суммы
              </p>
            </div>

            {/* Прогресс погашения */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                ПРОГРЕСС ПОГАШЕНИЯ
              </p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-green-500">0.0%</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Выплачено основного долга
              </p>
              <Progress value={0} className="h-2" />
            </div>

            {/* Структура остатка - Donut Chart */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4 self-start">
                СТРУКТУРА ОСТАТКА
              </p>
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-blue-500"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="5 246"
                    className="text-orange-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">0.00 ₽</span>
                  <span className="text-xs text-muted-foreground">общий остаток</span>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Основной долг</span>
                  <span className="ml-auto font-medium">
                    {formatCurrency(mockStats.remainingPrincipal).replace('MDL', '₽')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Проценты</span>
                  <span className="ml-auto font-medium">
                    {formatCurrency(mockStats.projectedInterest).replace('MDL', '₽')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Платеж в текущем месяце */}
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Calendar className="w-5 h-5" />
            Платеж в текущем месяце
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Платеж в текущем месяце */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                ПЛАТЕЖ В ТЕКУЩЕМ МЕСЯЦЕ
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                {formatCurrency(mockStats.thisMonthDue).replace('MDL', '₽')}
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Плановый:</span>
                  <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                    {formatCurrency(mockStats.thisMonthDue).replace('MDL', '₽')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Фактический:</span>
                  <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                    {formatCurrency(mockStats.thisMonthDue).replace('MDL', '₽')}
                  </span>
                </div>
                <div className="text-center pt-2">
                  <span className="text-sm font-medium">Ожидается</span>
                </div>
              </div>
            </div>

            {/* Платеж основного долга */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                ПЛАТЕЖ ОСНОВНОГО ДОЛГА
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                333 333,33 ₽
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Остаток долга:</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(mockStats.remainingPrincipal).replace('MDL', '₽')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Доля в платеже:</span>
                  <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                    91.5%
                  </span>
                </div>
              </div>
            </div>

            {/* Платеж процентов */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                ПЛАТЕЖ ПРОЦЕНТОВ
              </p>
              <p className="text-3xl font-bold text-red-500 mb-4">
                30 830,14 ₽
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>К доплате:</span>
                  <span className="font-medium text-red-500">
                    {formatCurrency(mockStats.projectedInterest).replace('MDL', '₽')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Доля в платеже:</span>
                  <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                    8.5%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}