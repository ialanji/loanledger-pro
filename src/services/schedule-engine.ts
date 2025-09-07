import { 
  CalculationMethod, 
  Credit, 
  CreditRate, 
  PrincipalAdjustment, 
  Payment,
  ScheduleItem 
} from '@/types/credit';
import { 
  addMonths, 
  addDays, 
  differenceInDays, 
  isLeapYear, 
  startOfDay,
  format 
} from 'date-fns';

/**
 * Credit Schedule Calculation Engine
 * Поддерживает классические и плавающие методы расчёта с ежедневным начислением процентов
 */

export class ScheduleEngine {
  /**
   * Генерирует график платежей для кредита
   */
  static generateSchedule(
    credit: Credit,
    rates: CreditRate[],
    adjustments: PrincipalAdjustment[] = []
  ): ScheduleItem[] {
    const sortedRates = rates.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
    const sortedAdjustments = adjustments.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

    if (credit.method === CalculationMethod.CLASSIC_ANNUITY || credit.method === CalculationMethod.CLASSIC_DIFFERENTIATED) {
      return this.generateClassicSchedule(credit, sortedRates[0]?.annualPercent || 0);
    } else {
      return this.generateFloatingSchedule(credit, sortedRates, sortedAdjustments);
    }
  }

  /**
   * Классический расчёт (по месяцам, без изменений ставки)
   */
  private static generateClassicSchedule(credit: Credit, annualRate: number): ScheduleItem[] {
    const schedule: ScheduleItem[] = [];
    const monthlyRate = annualRate / 12 / 100;
    let remainingPrincipal = credit.principal;
    
    // Расчёт аннуитетного платежа
    const annuityPayment = credit.method === CalculationMethod.CLASSIC_ANNUITY
      ? this.calculateAnnuityPayment(credit.principal, monthlyRate, credit.termMonths)
      : 0;

    // Дифференцированный платёж по основному долгу
    const principalPayment = credit.method === CalculationMethod.CLASSIC_DIFFERENTIATED
      ? credit.principal / credit.termMonths
      : 0;

    for (let period = 1; period <= credit.termMonths; period++) {
      const dueDate = this.calculatePaymentDate(credit.startDate, period, credit.paymentDay);
      
      let principalDue: number;
      let interestDue: number;

      if (credit.method === CalculationMethod.CLASSIC_ANNUITY) {
        interestDue = remainingPrincipal * monthlyRate;
        principalDue = annuityPayment - interestDue;
      } else {
        // Дифференцированный
        principalDue = principalPayment;
        interestDue = remainingPrincipal * monthlyRate;
      }

      // Обработка отсрочки
      if (period <= credit.defermentMonths) {
        principalDue = 0; // Только проценты в период отсрочки
      }

      // Корректировка последнего платежа
      if (period === credit.termMonths) {
        principalDue = remainingPrincipal;
      }

      const totalDue = principalDue + interestDue;
      
      schedule.push({
        periodNumber: period,
        dueDate,
        principalDue: Math.round(principalDue * 100) / 100,
        interestDue: Math.round(interestDue * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        remainingBalance: Math.round((remainingPrincipal - principalDue) * 100) / 100
      });

      remainingPrincipal -= principalDue;
    }

    return schedule;
  }

  /**
   * Плавающий расчёт (ежедневное начисление, изменяющиеся ставки)
   */
  private static generateFloatingSchedule(
    credit: Credit,
    rates: CreditRate[],
    adjustments: PrincipalAdjustment[]
  ): ScheduleItem[] {
    const schedule: ScheduleItem[] = [];
    let remainingPrincipal = credit.principal;
    let currentDate = startOfDay(credit.startDate);

    for (let period = 1; period <= credit.termMonths; period++) {
      const nextPaymentDate = this.calculatePaymentDate(credit.startDate, period, credit.paymentDay);
      
      // Применить корректировки основной суммы
      const adjustmentsInPeriod = adjustments.filter(adj => 
        adj.effectiveDate > currentDate && adj.effectiveDate <= nextPaymentDate
      );
      
      for (const adj of adjustmentsInPeriod) {
        remainingPrincipal += adj.amount;
      }

      // Рассчитать проценты за период
      const interestDue = this.calculateInterestForPeriod(
        remainingPrincipal,
        currentDate,
        nextPaymentDate,
        rates
      );

      let principalDue: number;
      
      if (credit.method === CalculationMethod.FLOATING_ANNUITY) {
        // Для аннуитета нужно пересчитывать платёж при изменении ставки
        const currentRate = this.getRateForDate(currentDate, rates);
        const monthlyRate = currentRate / 12 / 100;
        const remainingTerms = credit.termMonths - period + 1;
        const annuityPayment = this.calculateAnnuityPayment(remainingPrincipal, monthlyRate, remainingTerms);
        principalDue = annuityPayment - interestDue;
      } else {
        // Дифференцированный
        const remainingTerms = credit.termMonths - Math.max(period - 1, credit.defermentMonths);
        principalDue = remainingTerms > 0 ? remainingPrincipal / remainingTerms : remainingPrincipal;
      }

      // Обработка отсрочки
      if (period <= credit.defermentMonths) {
        principalDue = 0;
      }

      // Корректировка последнего платежа
      if (period === credit.termMonths) {
        principalDue = remainingPrincipal;
      }

      const totalDue = principalDue + interestDue;
      
      schedule.push({
        periodNumber: period,
        dueDate: nextPaymentDate,
        principalDue: Math.round(principalDue * 100) / 100,
        interestDue: Math.round(interestDue * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        remainingBalance: Math.round((remainingPrincipal - principalDue) * 100) / 100
      });

      remainingPrincipal -= principalDue;
      currentDate = nextPaymentDate;
    }

    return schedule;
  }

  /**
   * Расчёт процентов за период с учётом изменений ставки
   */
  private static calculateInterestForPeriod(
    principal: number,
    startDate: Date,
    endDate: Date,
    rates: CreditRate[]
  ): number {
    let totalInterest = 0;
    let currentDate = startDate;

    while (currentDate < endDate) {
      const currentRate = this.getRateForDate(currentDate, rates);
      const nextRateChange = this.getNextRateChangeDate(currentDate, rates);
      const periodEndDate = nextRateChange && nextRateChange <= endDate ? nextRateChange : endDate;
      
      const days = differenceInDays(periodEndDate, currentDate);
      const daysInYear = isLeapYear(currentDate.getFullYear()) ? 366 : 365;
      
      const periodInterest = principal * (currentRate / 100) / daysInYear * days;
      totalInterest += periodInterest;
      
      currentDate = periodEndDate;
    }

    return totalInterest;
  }

  /**
   * Получить ставку на определённую дату
   */
  private static getRateForDate(date: Date, rates: CreditRate[]): number {
    const effectiveRates = rates.filter(rate => rate.effectiveDate <= date);
    if (effectiveRates.length === 0) return 0;
    
    return effectiveRates[effectiveRates.length - 1].annualPercent;
  }

  /**
   * Получить дату следующего изменения ставки
   */
  private static getNextRateChangeDate(currentDate: Date, rates: CreditRate[]): Date | null {
    const futureRates = rates.filter(rate => rate.effectiveDate > currentDate);
    return futureRates.length > 0 ? futureRates[0].effectiveDate : null;
  }

  /**
   * Расчёт аннуитетного платежа
   */
  private static calculateAnnuityPayment(principal: number, monthlyRate: number, terms: number): number {
    if (monthlyRate === 0) return principal / terms;
    
    return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -terms));
  }

  /**
   * Расчёт даты платежа с учётом дня платежа
   */
  private static calculatePaymentDate(startDate: Date, period: number, paymentDay: number): Date {
    const baseDate = addMonths(startDate, period);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    
    // Создать дату с нужным днём месяца
    const paymentDate = new Date(year, month, paymentDay);
    
    // Если день не существует в месяце (например, 31 февраля), взять последний день месяца
    if (paymentDate.getMonth() !== month) {
      return new Date(year, month + 1, 0); // Последний день предыдущего месяца
    }
    
    return paymentDate;
  }

  /**
   * Пересчёт графика с определённой даты
   */
  static recalculateScheduleFrom(
    credit: Credit,
    rates: CreditRate[],
    adjustments: PrincipalAdjustment[],
    fromDate: Date,
    existingPayments: Payment[]
  ): ScheduleItem[] {
    // Найти последний оплаченный платёж до fromDate
    const paidPayments = existingPayments.filter(p => 
      p.status === 'paid' && p.dueDate < fromDate
    );
    
    // Рассчитать остаток основного долга
    const paidPrincipal = paidPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const adjustedCredit = {
      ...credit,
      principal: credit.principal - paidPrincipal,
      startDate: fromDate,
      termMonths: credit.termMonths - paidPayments.length
    };

    return this.generateSchedule(adjustedCredit, rates, adjustments);
  }
}

/**
 * Утилиты для работы с процентными ставками
 */
export class InterestUtils {
  /**
   * Конвертация годовой ставки в дневную
   */
  static annualToDailyRate(annualRate: number, date: Date): number {
    const daysInYear = isLeapYear(date.getFullYear()) ? 366 : 365;
    return annualRate / 100 / daysInYear;
  }

  /**
   * Конвертация годовой ставки в месячную
   */
  static annualToMonthlyRate(annualRate: number): number {
    return annualRate / 12 / 100;
  }

  /**
   * Эффективная ставка с учётом капитализации
   */
  static effectiveRate(nominalRate: number, periodsPerYear: number): number {
    return Math.pow(1 + nominalRate / periodsPerYear, periodsPerYear) - 1;
  }
}