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
import { formatCurrency } from '@/utils/formatters';
import { apiClient } from '@/lib/api';

import StatCard from '@/components/dashboard/StatCard';
import CreditTypeTotalCard from '@/components/dashboard/CreditTypeTotalCard';

interface CreditTypeTotals {
  investment: number;
  working_capital: number;
  total: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [creditTypeTotals, setCreditTypeTotals] = useState<CreditTypeTotals | null>(null);
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

      // Fetch historical payments (actual paid payments)
      const historicalPaymentsResponse = await fetch('/api/payments/historical');
      if (!historicalPaymentsResponse.ok) {
        throw new Error('Failed to fetch historical payments');
      }
      const historicalPayments: Payment[] = await historicalPaymentsResponse.json();
      console.log('Fetched historical payments:', historicalPayments);

      // Fetch credit totals by type
      const totalsResponse = await fetch('/api/credits/totals-by-type');
      if (!totalsResponse.ok) {
        throw new Error('Failed to fetch credit totals by type');
      }
      const totals: CreditTypeTotals = await totalsResponse.json();
      console.log('Fetched credit totals by type:', totals);
      setCreditTypeTotals(totals);

      // Fetch payment schedule data for ALL credits to get correct interest calculations
      let allScheduleData: any[] = [];
      if (credits.length > 0) {
        console.log('Fetching schedule data for all credits...');
        for (const credit of credits) {
          try {
            const scheduleResponse = await fetch(`/api/credits/${credit.id}/schedule`);
            if (scheduleResponse.ok) {
              const scheduleData = await scheduleResponse.json();
              allScheduleData.push({
                creditId: credit.id,
                contractNumber: credit.contractNumber,
                schedule: scheduleData
              });
              console.log(`Fetched schedule data for credit ${credit.contractNumber}:`, scheduleData.totals);
            } else {
              console.warn(`Schedule response not ok for credit ${credit.id}:`, scheduleResponse.status, scheduleResponse.statusText);
            }
          } catch (scheduleError) {
            console.warn(`Could not fetch schedule data for credit ${credit.id}:`, scheduleError);
          }
        }
        console.log('All schedule data fetched:', allScheduleData.length, 'credits');
      }

      // Get scheduled payments for monthly calculations and upcoming payments
      const scheduledPaymentsResponse = await fetch('/api/payments');
      const scheduledPayments: Payment[] = scheduledPaymentsResponse.ok ? await scheduledPaymentsResponse.json() : [];
      console.log('Fetched scheduled payments:', scheduledPayments);

      // Calculate dashboard statistics from real data
      const calculatedStats = calculateDashboardStats(credits, historicalPayments, scheduledPayments, allScheduleData);
      console.log('Calculated stats:', calculatedStats);
      setStats(calculatedStats);

      // Get upcoming payments (next 30 days)
      const upcoming = getUpcomingPayments(scheduledPayments);
      console.log('Upcoming payments:', upcoming);
      setUpcomingPayments(upcoming);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (credits: any[], historicalPayments: any[], scheduledPayments: any[], allScheduleData?: any[]): DashboardStats => {
    console.log('calculateDashboardStats input:', { credits, historicalPayments, scheduledPayments, allScheduleData });
    
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
    
    // Calculate remaining principal - use historical payments (actual paid amounts)
    const totalPrincipalPaid = historicalPayments
      .reduce((sum, payment) => {
        // Use principal_amount from historical payments
        const principalPaid = parseNumeric(payment.principal_amount);
        console.log('Principal payment:', { original: payment.principal_amount, parsed: principalPaid });
        return sum + principalPaid;
      }, 0);
    
    console.log('Total principal paid calculated:', totalPrincipalPaid);
    
    const remainingPrincipal = totalPrincipal - totalPrincipalPaid;
    
    // Calculate total projected interest from schedule data for ALL credits
    let totalProjectedInterest = 0;
    
    console.log('--- INTEREST CALCULATION PHASE ---');
    console.log('Schedule data availability check:', {
      hasScheduleData: !!(allScheduleData && allScheduleData.length > 0),
      scheduleDataLength: allScheduleData?.length || 0,
      activeCreditsCount: activeCredits.length
    });
    
    if (allScheduleData && allScheduleData.length > 0) {
      console.log('Using SCHEDULE-BASED calculation method');
      
      // Log each credit's schedule data for debugging
      allScheduleData.forEach((scheduleItem, index) => {
        const totalInterest = parseNumeric(scheduleItem.schedule?.totals?.totalInterest || 0);
        console.log(`Schedule ${index + 1} - Credit ${scheduleItem.contractNumber}:`, {
          creditId: scheduleItem.creditId,
          totalInterest,
          hasSchedule: !!scheduleItem.schedule,
          hasTotals: !!scheduleItem.schedule?.totals,
          rawTotalInterest: scheduleItem.schedule?.totals?.totalInterest
        });
      });
      
      // Sum up total interest from all credit schedules - this is the total interest cost
      totalProjectedInterest = allScheduleData.reduce((sum, scheduleItem, index) => {
        const totalInterest = parseNumeric(scheduleItem.schedule?.totals?.totalInterest || 0);
        const newSum = sum + totalInterest;
        console.log(`Accumulating interest ${index + 1}:`, {
          creditId: scheduleItem.creditId,
          interestAmount: totalInterest,
          runningTotal: newSum
        });
        return newSum;
      }, 0);
      
      console.log('SCHEDULE-BASED calculation complete:', {
        totalInterestFromAllSchedules: totalProjectedInterest,
        calculationMethod: 'schedule-based',
        totalProjectedInterest,
        creditsProcessed: allScheduleData.length
      });
    } else {
      console.log('Using PAYMENT-BASED fallback calculation method');
      console.log('Fallback reason:', {
        noScheduleData: !allScheduleData,
        emptyScheduleData: allScheduleData && allScheduleData.length === 0,
        paymentsAvailable: scheduledPayments.length
      });
      
      // Fallback: calculate total projected interest from all scheduled payments
      totalProjectedInterest = scheduledPayments.reduce((sum, payment, index) => {
        const interestDue = parseNumeric(payment.interestDue || payment.interest_due);
        if (index < 5) { // Log first few for debugging
          console.log(`Payment ${index + 1} interest:`, {
            paymentId: payment.id,
            interestDue,
            runningTotal: sum + interestDue
          });
        }
        return sum + interestDue;
      }, 0);
      
      console.log('PAYMENT-BASED calculation complete:', {
        totalProjectedInterest,
        calculationMethod: 'payment-based',
        paymentsProcessed: scheduledPayments.length
      });
    }

    // Calculate this month's payments - include all payments for current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    console.log('Current date info:', { currentMonth, currentYear, currentDate: currentDate.toISOString() });
    
    const thisMonthPayments = scheduledPayments.filter(p => {
      const dueDate = new Date(p.dueDate || p.due_date);
      const paymentMonth = dueDate.getMonth();
      const paymentYear = dueDate.getFullYear();
      
      console.log('Payment date check:', {
        paymentId: p.id,
        dueDate: p.dueDate || p.due_date,
        paymentMonth,
        paymentYear,
        status: p.status,
        matches: paymentMonth === currentMonth && paymentYear === currentYear
      });
      
      return paymentMonth === currentMonth && 
             paymentYear === currentYear;
             // Include all payments for current month regardless of status
    });
    
    console.log('This month payments found:', thisMonthPayments.length, thisMonthPayments);
    
    const thisMonthDue = thisMonthPayments.reduce((sum, payment) => {
      const totalDue = parseNumeric(payment.totalDue || payment.total_due);
      console.log('Adding payment to month total:', { totalDue, currentSum: sum });
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
    
    // Calculate overdue amount from scheduled payments
    const overdueAmount = scheduledPayments
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
      projectedInterest: Math.max(0, totalProjectedInterest - (historicalPayments.reduce((sum, payment) => sum + parseNumeric(payment.interest_amount), 0))), // Show remaining interest to be paid
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Общая сумма кредита */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  ОБЩАЯ СУММА КРЕДИТА
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {formatCurrency(creditTypeTotals?.total || stats.totalPrincipal).replace('MDL', '₽')}
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
                  ✓ {((stats.remainingPrincipal / (creditTypeTotals?.total || stats.totalPrincipal)) * 100).toFixed(1)}% от общей суммы
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

            {/* Credit Type Breakdown */}
            {creditTypeTotals && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t">
                <CreditTypeTotalCard
                  type="investment"
                  total={creditTypeTotals.investment}
                  label="ИНВЕСТИЦИОННЫЕ КРЕДИТЫ"
                />
                <CreditTypeTotalCard
                  type="working_capital"
                  total={creditTypeTotals.working_capital}
                  label="ОБОРОТНЫЕ СРЕДСТВА"
                />
              </div>
            )}
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