import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DashboardStats, Payment, Credit } from '@/types/credit';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api';

import StatCard from '@/components/dashboard/StatCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch credits
      const creditsResponse = await fetch('/api/credits');
      if (!creditsResponse.ok) {
        throw new Error('Failed to fetch credits');
      }
      const credits: Credit[] = await creditsResponse.json();
      console.log('Fetched credits:', credits);

      // Fetch payments
      const paymentsResponse = await fetch('/api/payments');
      if (!paymentsResponse.ok) {
        throw new Error('Failed to fetch payments');
      }
      const payments: Payment[] = await paymentsResponse.json();
      console.log('Fetched payments:', payments);

      // Fetch payment schedule data to get correct interest calculations
      let scheduleData = null;
      if (credits.length > 0) {
        try {
          const scheduleResponse = await fetch(`/api/credits/${credits[0].id}/schedule`);
          if (scheduleResponse.ok) {
            scheduleData = await scheduleResponse.json();
            console.log('Fetched schedule data:', scheduleData);
          } else {
            console.warn('Schedule response not ok:', scheduleResponse.status, scheduleResponse.statusText);
          }
        } catch (scheduleError) {
          console.warn('Could not fetch schedule data:', scheduleError);
        }
      }

      // Calculate dashboard statistics from real data
      const calculatedStats = calculateDashboardStats(credits, payments, scheduleData);
      console.log('Calculated stats:', calculatedStats);
      setStats(calculatedStats);

      // Get upcoming payments (next 30 days)
      const upcoming = getUpcomingPayments(payments);
      console.log('Upcoming payments:', upcoming);
      setUpcomingPayments(upcoming);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (credits: any[], payments: any[], scheduleData?: any): DashboardStats => {
    console.log('calculateDashboardStats input:', { credits, payments, scheduleData });
    
    // Helper function to safely parse numeric values
    const parseNumeric = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    const activeCredits = credits.filter(c => c.status === 'active');
    console.log('Active credits:', activeCredits);
    
    // Parse string values to numbers to prevent NaN
    const totalPrincipal = credits.reduce((sum, credit) => {
      const principal = parseNumeric(credit.principal);
      console.log('Credit principal:', { original: credit.principal, parsed: principal });
      return sum + principal;
    }, 0);
    
    console.log('Total principal calculated:', totalPrincipal);
    
    // Calculate remaining principal - only count PRINCIPAL payments, not interest
    const totalPrincipalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, payment) => {
        // Only count principal_due, not interest_due or total_due
        const principalPaid = parseNumeric(payment.principalDue || payment.principal_due);
        console.log('Principal payment:', { original: payment.principal_due, parsed: principalPaid });
        return sum + principalPaid;
      }, 0);
    
    console.log('Total principal paid calculated:', totalPrincipalPaid);
    
    const remainingPrincipal = totalPrincipal - totalPrincipalPaid;
    
    // Calculate projected interest from ALL payments (both paid and unpaid)
    // This represents the total interest that will be paid over the life of the credit
    const projectedInterest = payments
      .reduce((sum, payment) => {
        const interestDue = parseNumeric(payment.interestDue || payment.interest_due);
        return sum + interestDue;
      }, 0);
    
    // Calculate remaining interest from schedule data or fallback to payment calculation
    let remainingInterest = projectedInterest;
    
    if (scheduleData && scheduleData.totals && scheduleData.totals.totalInterest) {
      // Use the correct total interest from the payment schedule
      const totalInterestFromSchedule = parseNumeric(scheduleData.totals.totalInterest);
      
      // Calculate paid interest from completed payments
      const paidInterest = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, payment) => {
          const interestPaid = parseNumeric(payment.interestDue || payment.interest_due);
          return sum + interestPaid;
        }, 0);
      
      // Remaining interest = Total interest from schedule - Paid interest
      remainingInterest = Math.max(0, totalInterestFromSchedule - paidInterest);
      
      console.log('Interest calculation:', {
        totalInterestFromSchedule,
        paidInterest,
        remainingInterest
      });
    }

    // Calculate this month's due amount - only for unpaid payments
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const thisMonthPayments = payments.filter(p => {
      const dueDate = new Date(p.dueDate || p.due_date);
      return dueDate.getMonth() === currentMonth && 
             dueDate.getFullYear() === currentYear &&
             (p.status === 'scheduled' || p.status === 'pending');
    });
    
    const thisMonthDue = thisMonthPayments.reduce((sum, payment) => {
      const totalDue = parseNumeric(payment.totalDue || payment.total_due);
      return sum + totalDue;
    }, 0);
    
    // Calculate principal and interest for current month
    const thisMonthPrincipal = thisMonthPayments.reduce((sum, payment) => {
      const principalDue = parseNumeric(payment.principalDue || payment.principal_due);
      return sum + principalDue;
    }, 0);
    
    const thisMonthInterest = thisMonthPayments.reduce((sum, payment) => {
      const interestDue = parseNumeric(payment.interestDue || payment.interest_due);
      return sum + interestDue;
    }, 0);
    
    // Calculate overdue amount
    const overdueAmount = payments
      .filter(p => p.status === 'overdue')
      .reduce((sum, payment) => {
        const totalDue = parseNumeric(payment.totalDue || payment.total_due);
        return sum + totalDue;
      }, 0);

    const result = {
      totalCredits: credits.length,
      activeCredits: activeCredits.length,
      totalPrincipal,
      remainingPrincipal: Math.max(0, remainingPrincipal), // Ensure non-negative
      projectedInterest: remainingInterest, // Show remaining interest to be paid
      thisMonthDue,
      thisMonthPrincipal,
      thisMonthInterest,
      overdueAmount,
      totalPaid: totalPrincipalPaid
    };
    
    console.log('Dashboard stats result:', result);
    return result;
  };

  const getUpcomingPayments = (payments: Payment[]): Payment[] => {
    const currentDate = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30);

    return payments
      .filter(payment => {
        const dueDate = new Date(payment.dueDate);
        return dueDate >= currentDate && 
               dueDate <= thirtyDaysFromNow &&
               (payment.status === 'scheduled' || payment.status === 'pending' || payment.status === 'overdue');
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 10); // Limit to 10 upcoming payments
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

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-muted-foreground">Загрузка данных дашборда...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Ошибка загрузки данных</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
            <Button 
              onClick={fetchDashboardData} 
              variant="outline" 
              className="mt-4 border-red-200 text-red-600 hover:bg-red-50"
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!stats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Нет данных для отображения</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Верхний ряд: Общая информация по кредитам и Платеж в текущем месяце */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Общая информация по кредитам */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <DollarSign className="w-5 h-5" />
              Общая информация по кредитам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Общая сумма кредита */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  ОБЩАЯ СУММА КРЕДИТА
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {formatCurrency(stats.totalPrincipal).replace('MDL', '₽')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalCredits} кредит в {stats.activeCredits} банках
                </p>
              </div>

              {/* Остаток долга */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  ОСТАТОК ДОЛГА
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {formatCurrency(stats.remainingPrincipal).replace('MDL', '₽')}
                </p>
                <p className="text-xs text-blue-500">
                  ✓ {((stats.remainingPrincipal / stats.totalPrincipal) * 100).toFixed(1)}% от общей суммы
                </p>
              </div>

              {/* Проценты (Остаток Проценты) */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  ПРОЦЕНТЫ
                </p>
                <p className="text-2xl font-bold text-orange-500 mb-1">
                  {formatCurrency(stats.projectedInterest).replace('MDL', '₽')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Остаток процентов к доплате
                </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Платеж в текущем месяце */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  ПЛАТЕЖ В ТЕКУЩЕМ МЕСЯЦЕ
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                  {formatCurrency(stats.thisMonthDue).replace('MDL', '₽')}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Плановый:</span>
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                      {formatCurrency(stats.thisMonthDue).replace('MDL', '₽')}
                    </span>
                  </div>
                  <div className="text-center pt-1">
                    <span className="text-xs font-medium">
                      {stats.thisMonthDue > 0 ? 'Ожидается' : 'Нет платежей'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Платеж основного долга */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  ПЛАТЕЖ ОСНОВНОГО ДОЛГА
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                  {formatCurrency(stats.thisMonthPrincipal || 0).replace('MDL', '₽')}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Доля в платеже:</span>
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                      {stats.thisMonthDue > 0 ? 
                        ((stats.thisMonthPrincipal / stats.thisMonthDue) * 100).toFixed(1) + '%' : 
                        '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Платеж процентов */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  ПЛАТЕЖ ПРОЦЕНТОВ
                </p>
                <p className="text-xl font-bold text-red-500 mb-3">
                  {formatCurrency(stats.thisMonthInterest || 0).replace('MDL', '₽')}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Доля в платеже:</span>
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                      {stats.thisMonthDue > 0 ? 
                        ((stats.thisMonthInterest / stats.thisMonthDue) * 100).toFixed(1) + '%' : 
                        '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}