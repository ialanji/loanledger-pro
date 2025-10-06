import { useState, useEffect } from 'react';
import {
  CreditCard,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats, Payment, Credit } from '@/types/credit';
import { formatCurrency } from '@/utils/formatters';

interface CreditTypeTotals {
  investment: number;
  working_capital: number;
  total: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
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

      // Note: Upcoming payments functionality removed for cleaner dashboard

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

        {/* Общая информация по кредитам - Стиль образовательного кредита */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          {/* Заголовок */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Общая информация по кредитам</h2>
          </div>

          {/* Основной контент */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ЛЕВАЯ КОЛОНКА - ОБЩАЯ ИНФОРМАЦИЯ (серый фон) */}
            <div className="bg-gray-50 p-6 border-r border-gray-200 flex-1 min-h-[1px] flex flex-col justify-start">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">ОБЩАЯ ИНФОРМАЦИЯ</h3>

              {/* Общая сумма кредита */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center mr-3 text-xs text-white">
                    ✓
                  </div>
                  <div className="text-sm font-medium text-gray-600">ОБЩАЯ СУММА КРЕДИТА</div>
                </div>
                <div className="text-xl font-semibold text-gray-900 mb-1">
                  {formatCurrency(creditTypeTotals?.total || stats.totalPrincipal).replace('MDL', 'L')}
                </div>
                <div className="text-sm text-gray-500">
                  {stats.totalCredits} кредит{stats.totalCredits > 1 ? 'а' : ''} в {Math.max(1, stats.activeCredits)} банк{Math.max(1, stats.activeCredits) > 1 ? 'ах' : 'е'}
                </div>
              </div>

              {/* Инвестиционные кредиты */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center mr-3 text-xs text-white">
                    •
                  </div>
                  <div className="text-sm font-medium text-gray-600">ИНВЕСТИЦИОННЫЕ КРЕДИТЫ</div>
                </div>
                <div className="text-xl font-semibold text-gray-900 mb-1">
                  {formatCurrency(creditTypeTotals?.investment || 0).replace('MDL', 'L')}
                </div>
              </div>

              {/* Оборотные средства */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center mr-3 text-xs text-white">
                    •
                  </div>
                  <div className="text-sm font-medium text-gray-600">ОБОРОТНЫЕ СРЕДСТВА</div>
                </div>
                <div className="text-xl font-semibold text-gray-900 mb-1">
                  {formatCurrency(creditTypeTotals?.working_capital || stats.totalPrincipal).replace('MDL', 'L')}
                </div>
              </div>
            </div>

            {/* ПРАВАЯ КОЛОНКА - ДЕТАЛИ ОСТАТКА (белый фон) */}
            <div className="p-6 flex-1 min-h-[1px] flex flex-col justify-start">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">ДЕТАЛИ ОСТАТКА</h3>

              {/* Остаток долга */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center mr-3 text-xs text-white">
                    ✓
                  </div>
                  <div className="text-sm font-medium text-gray-600">ОСТАТОК ДОЛГА</div>
                </div>
                <div className="text-xl font-semibold text-gray-900 mb-3">
                  {formatCurrency(stats.remainingPrincipal + stats.projectedInterest).replace('MDL', 'L')}
                </div>
                {/* Прогресс-бар */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Прогресс выплаты</span>
                    <span className="text-green-600 font-xs">
                      {stats.totalPrincipal > 0 ? (stats.totalPaid / stats.totalPrincipal * 100).toFixed(1) : '0.0'}% выплачено
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-1000 ease-in-out shadow-sm"
                      style={{
                        width: `${stats.totalPrincipal > 0 ? Math.min(Math.max((stats.totalPaid / stats.totalPrincipal * 100), 0), 100) : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Выплачено: {formatCurrency(stats.totalPaid).replace('MDL', 'L')}</span>
                    <span>Всего: {formatCurrency(stats.totalPrincipal).replace('MDL', 'L')}</span>
                  </div>
                </div>
              </div>

              {/* Общая сумма остатка */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center mr-3 text-xs text-white">
                    •
                  </div>
                  <div className="text-sm font-medium text-gray-600">ОБЩАЯ СУММА ОСТАТКА</div>
                </div>
                <div className="text-xl font-semibold text-gray-900">
                  {formatCurrency(stats.remainingPrincipal).replace('MDL', 'L')}
                </div>
              </div>

              {/* Проценты */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center mr-3 text-xs text-white">
                    •
                  </div>
                  <div className="text-sm font-medium text-gray-600">ПРОЦЕНТЫ</div>
                </div>
                <div className="text-xl font-semibold text-gray-900 mb-1">
                  {formatCurrency(stats.projectedInterest).replace('MDL', 'L')}
                </div>
                <div className="text-xs text-gray-500">Остаток процентов к доплате</div>
              </div>
            </div>
          </div>

          {/* Футер */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
            <div className="text-sm text-gray-500">Актуально на текущую дату</div>
          </div>
        </div>

        {/* Платеж в текущем месяце — в том же стиле */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          {/* Заголовок */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Платеж в текущем месяце
            </h2>
          </div>

          {/* Основной контент */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ЛЕВАЯ КОЛОНКА - ПЛАТЕЖ В ТЕКУЩЕМ МЕСЯЦЕ */}
            <div className="bg-gray-50 p-6 border-r border-gray-200 flex-1 min-h-[1px] flex flex-col justify-start">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">ПЛАТЕЖ В ТЕКУЩЕМ МЕСЯЦЕ</h3>

              <div className="mb-6">
                <div className="text-xl font-bold text-blue-600 mb-3">
                  {formatCurrency(stats.thisMonthDue).replace('MDL', '₽')}
                </div>
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
            </div>

            {/* ПРАВАЯ КОЛОНКА - ДЕТАЛИ ПЛАТЕЖА */}
            <div className="p-6 flex-1 min-h-[1px] flex flex-col justify-start">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">ДЕТАЛИ ПЛАТЕЖА</h3>

              {/* Платеж основного долга */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-500 flex items-center justify-center mr-3 text-xs text-white">
                    ✓
                  </div>
                  <div className="text-sm font-medium text-gray-600">ПЛАТЕЖ ОСНОВНОГО ДОЛГА</div>
                </div>
                <div className="text-xl font-bold text-blue-600 mb-3">
                  {formatCurrency(stats.thisMonthPrincipal || 0).replace('MDL', '₽')}
                </div>
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

              {/* Платеж процентов */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-500 flex items-center justify-center mr-3 text-xs text-white">
                    ✓
                  </div>
                  <div className="text-sm font-medium text-gray-600">ПЛАТЕЖ ПРОЦЕНТОВ</div>
                </div>
                <div className="text-xl font-bold text-red-500 mb-3">
                  {formatCurrency(stats.thisMonthInterest || 0).replace('MDL', '₽')}
                </div>
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

          {/* Футер */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
            <div className="text-sm text-gray-500">Рассчитано на основе графика платежей</div>
          </div>
        </div>
      </div>
    </div>
  );
}