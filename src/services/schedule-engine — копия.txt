// Импорты типов удалены для совместимости с Node.js
import { 
  addMonths, 
  addDays, 
  differenceInDays, 
  isLeapYear, 
  startOfDay,
  format 
} from 'date-fns';

// Добавлено: локальные константы для методов расчёта, чтобы избежать ReferenceError и согласовать значения с фронтендом
const CalculationMethod = {
  CLASSIC_ANNUITY: 'classic_annuity',
  CLASSIC_DIFFERENTIATED: 'classic_differentiated',
  FLOATING_ANNUITY: 'floating_annuity',
  FLOATING_DIFFERENTIATED: 'floating_differentiated'
};

/**
 * Credit Schedule Calculation Engine
 * Поддерживает классические и плавающие методы расчёта с ежедневным начислением процентов
 */

export class ScheduleEngine {
  // Новое: нормализация методов для обратной совместимости
  static normalizeMethod(method) {
    if (!method) return method;
    const m = String(method).toLowerCase();
    if (m === 'floating') return CalculationMethod.FLOATING_ANNUITY;
    if (m === 'fixed') return CalculationMethod.CLASSIC_ANNUITY;
    // Дополнительные синонимы/вариации можно добавить при необходимости
    return m;
  }

  /**
   * Генерирует полный ответ для API с графиком платежей и итоговыми показателями
   */
  static generatePaymentScheduleResponse(
    credit,
    rates,
    adjustments = []
  ) {
    // Применяем нормализацию методов расчёта
    const normalizedMethod = this.normalizeMethod(credit.method);
    const normalizedCredit = { ...credit, method: normalizedMethod };

    const schedule = this.generateSchedule(normalizedCredit, rates, adjustments);
    const scheduleWithRates = this.addAverageRatesToSchedule(schedule, normalizedCredit, rates);
    const totals = this.calculateScheduleTotals(scheduleWithRates, normalizedCredit.principal);

    return {
      loan: {
        id: normalizedCredit.id,
        number: normalizedCredit.contractNumber,
        principal: normalizedCredit.principal,
        calculationMethod: this.getMethodDisplayName(normalizedMethod)
      },
      schedule: scheduleWithRates,
      totals
    };
  }

  /**
   * Добавляет средневзвешенные процентные ставки к элементам графика
   */
  static addAverageRatesToSchedule(
    schedule,
    credit,
    rates
  ) {
    return schedule.map((item, index) => {
      const periodStartDate = index === 0 
        ? credit.startDate 
        : this.calculatePaymentDate(credit.startDate, index, credit.paymentDay);
      
      const periodEndDate = item.dueDate;
      // Исправлено: используем корректное имя функции расчёта средней ставки
      const averageRate = this.calculateAverageRate(periodStartDate, periodEndDate, rates);

      return {
        ...item,
        averageRate: Math.round(averageRate * 100) / 100
      };
    });
  }

  /**
   * Рассчитывает средневзвешенную процентную ставку за период
   */
  static calculateAverageRate(
    startDate,
    endDate,
    rates
  ) {
    let weightedSum = 0;
    let totalDays = 0;
    let currentDate = startOfDay(startDate);

    while (currentDate < endDate) {
      const currentRate = this.getRateForDate(currentDate, rates);
      const nextRateChange = this.getNextRateChangeDate(currentDate, rates);
      const periodEndDate = nextRateChange && nextRateChange <= endDate ? nextRateChange : endDate;
      
      const days = differenceInDays(periodEndDate, currentDate);
      weightedSum += currentRate * days;
      totalDays += days;
      
      currentDate = periodEndDate;
    }

    return totalDays > 0 ? weightedSum / totalDays : 0;
  }

  /**
   * Рассчитывает итоговые показатели графика платежей
   */
  static calculateScheduleTotals(
    schedule,
    principal
  ) {
    const totalPayments = schedule.reduce((sum, item) => sum + item.totalDue, 0);
    const totalInterest = schedule.reduce((sum, item) => sum + item.interestDue, 0);
    const overpayment = totalPayments - principal;

    return {
      totalPayments: Math.round(totalPayments * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      overpayment: Math.round(overpayment * 100) / 100
    };
  }

  /**
   * Получает отображаемое название метода расчёта
   */
  static getMethodDisplayName(method) {
    const normalized = this.normalizeMethod(method);
    const methodNames = {
      [CalculationMethod.CLASSIC_ANNUITY]: 'Классический аннуитет',
      [CalculationMethod.CLASSIC_DIFFERENTIATED]: 'Классический дифференцированный',
      [CalculationMethod.FLOATING_ANNUITY]: 'Плавающий аннуитет',
      [CalculationMethod.FLOATING_DIFFERENTIATED]: 'Плавающий дифференцированный'
    };
    
    return methodNames[normalized] || normalized;
  }
  /**
    * Генерирует график платежей для кредита
    */
   static generateSchedule(
    credit,
    rates,
    adjustments = []
  ) {
    const sanitizedRates = Array.isArray(rates)
      ? rates.filter(r => r && r.effectiveDate instanceof Date && !isNaN(r.effectiveDate.getTime()))
      : [];
    const sortedRates = sanitizedRates.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

    const sanitizedAdjustments = Array.isArray(adjustments)
      ? adjustments.filter(a => a && a.effectiveDate instanceof Date && !isNaN(a.effectiveDate.getTime()))
      : [];
    const sortedAdjustments = sanitizedAdjustments.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

    const method = this.normalizeMethod(credit.method);

    if (method === CalculationMethod.CLASSIC_ANNUITY || method === CalculationMethod.CLASSIC_DIFFERENTIATED) {
      return this.generateClassicSchedule(credit, sortedRates[0]?.annualPercent || 0);
    } else {
      return this.generateFloatingSchedule(credit, sortedRates, sortedAdjustments);
    }
  }

  /**
   * Классический расчёт (по месяцам, без изменений ставки)
   */
  static generateClassicSchedule(credit, annualRate) {
    const schedule = [];
    
    // Валидация входных данных
    if (!credit || !credit.principal || credit.principal <= 0) {
      console.error('Invalid credit principal:', credit?.principal);
      return schedule;
    }
    
    if (!credit.termMonths || credit.termMonths <= 0) {
      console.error('Invalid credit term:', credit?.termMonths);
      return schedule;
    }
    
    if (!credit.startDate || isNaN(new Date(credit.startDate).getTime())) {
      console.error('Invalid credit start date:', credit?.startDate);
      return schedule;
    }
    
    const monthlyRate = (annualRate || 0) / 12 / 100;
    let remainingPrincipal = credit.principal;
    
    // Расчёт аннуитетного платежа
    const annuityPayment = credit.method === CalculationMethod.CLASSIC_ANNUITY
      ? this.calculateAnnuityPayment(credit.principal, monthlyRate, credit.termMonths - (credit.defermentMonths || 0))
      : 0;

    // Дифференцированный платёж по основному долгу
    const principalPayment = credit.method === CalculationMethod.CLASSIC_DIFFERENTIATED
      ? credit.principal / credit.termMonths
      : 0;

    for (let period = 1; period <= credit.termMonths; period++) {
      const dueDate = this.calculatePaymentDate(credit.startDate, period, credit.paymentDay);
      
      let principalDue;
      let interestDue;

      if (credit.method === CalculationMethod.CLASSIC_ANNUITY) {
        interestDue = remainingPrincipal * monthlyRate;
        principalDue = annuityPayment - interestDue;
      } else {
        // Дифференцированный
        principalDue = principalPayment;
        interestDue = remainingPrincipal * monthlyRate;
      }

      // Обработка отсрочки
      if (period <= (credit.defermentMonths || 0)) {
        principalDue = 0; // Только проценты в период отсрочки
      }

      // Корректировка последнего платежа
      if (period === credit.termMonths) {
        principalDue = remainingPrincipal;
      }

      const totalDue = principalDue + interestDue;
      
      // Дополнительная валидация расчетных значений
      if (isNaN(principalDue) || isNaN(interestDue) || isNaN(totalDue)) {
        console.error('Invalid calculated values for period', period, {
          principalDue,
          interestDue,
          totalDue,
          remainingPrincipal,
          monthlyRate,
          annuityPayment
        });
        continue;
      }
      
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
  static generateDifferentiatedSchedule(
    credit,
    rates,
    adjustments
  ) {
    const schedule = [];
    
    // Валидация входных данных
    if (!credit || !credit.principal || credit.principal <= 0) {
      console.error('Invalid credit principal for floating schedule:', credit?.principal);
      return schedule;
    }
    
    if (!credit.termMonths || credit.termMonths <= 0) {
      console.error('Invalid credit term for floating schedule:', credit?.termMonths);
      return schedule;
    }
    
    if (!credit.startDate || isNaN(new Date(credit.startDate).getTime())) {
      console.error('Invalid credit start date for floating schedule:', credit?.startDate);
      return schedule;
    }
    
    let remainingPrincipal = credit.principal;
    let currentDate = startOfDay(credit.startDate);

    // Для плавающего аннуитета: платёж должен быть равным в периоде между изменениями ставки
    let currentMonthlyRate = null;
    let currentAnnuityPayment = 0;

    const totalAmortizationTerms = credit.termMonths - (credit.defermentMonths || 0);

    for (let period = 1; period <= credit.termMonths; period++) {
      const nextPaymentDate = this.calculatePaymentDate(credit.startDate, period, credit.paymentDay);
      
      // Применить корректировки основной суммы
      const adjustmentsInPeriod = adjustments.filter(adj => 
        adj.effectiveDate > currentDate && adj.effectiveDate <= nextPaymentDate
      );
      
      for (const adj of adjustmentsInPeriod) {
        remainingPrincipal += adj.amount;
      }

      // Рассчитать проценты за период (всегда 365-дневная база)
      const interestDue = this.calculateInterestForPeriod(
        remainingPrincipal,
        currentDate,
        nextPaymentDate,
        rates
      );

      let principalDue = 0;
      const method = this.normalizeMethod(credit.method);
      const amortIndex = period - (credit.defermentMonths || 0); // 1 = первый месяц амортизации после отсрочки

      if (method === CalculationMethod.FLOATING_ANNUITY) {
        const currentAnnualRate = this.getRateForDate(currentDate, rates);
        const monthlyRate = currentAnnualRate / 12 / 100;

        if (amortIndex <= 0) {
          // Период отсрочки: только проценты
          principalDue = 0;
        } else {
          const remainingTerms = Math.max(1, totalAmortizationTerms - (amortIndex - 1));

          // Пересчитываем платёж только при изменении ставки или в первый месяц после отсрочки
          if (currentMonthlyRate === null || Math.abs(monthlyRate - currentMonthlyRate) > 1e-12) {
            currentMonthlyRate = monthlyRate;
            currentAnnuityPayment = this.calculateAnnuityPayment(remainingPrincipal, currentMonthlyRate, remainingTerms);
          }

          principalDue = currentAnnuityPayment - interestDue;
        }
      } else {
        // Дифференцированный
        const remainingTerms = credit.termMonths - Math.max(period - 1, (credit.defermentMonths || 0));
        principalDue = remainingTerms > 0 ? remainingPrincipal / remainingTerms : remainingPrincipal;

        // Период отсрочки: только проценты
        if (period <= (credit.defermentMonths || 0)) {
          principalDue = 0;
        }
      }

      // Корректировка последнего платежа
      if (period === credit.termMonths) {
        principalDue = remainingPrincipal;
      }

      const totalDue = principalDue + interestDue;
      
      // Дополнительная валидация расчетных значений
      if (isNaN(principalDue) || isNaN(interestDue) || isNaN(totalDue)) {
        console.error('Invalid calculated values for floating period', period, {
          principalDue,
          interestDue,
          totalDue,
          remainingPrincipal,
          currentAnnuityPayment
        });
        continue;
      }
      
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

  // Добавлено: алиас для совместимости с вызовами generateFloatingSchedule
  static generateFloatingSchedule(credit, rates, adjustments) {
    return this.generateDifferentiatedSchedule(credit, rates, adjustments);
  }

  /**
   * Расчёт процентов за период с учётом изменений ставки
   */
  static calculateInterestForPeriod(
    principal,
    startDate,
    endDate,
    rates
  ) {
    let totalInterest = 0;
    let currentDate = startOfDay(startDate);

    while (currentDate < endDate) {
      const currentRate = this.getRateForDate(currentDate, rates);
      const nextRateChange = this.getNextRateChangeDate(currentDate, rates);
      const periodEndDate = nextRateChange && nextRateChange <= endDate ? nextRateChange : endDate;
      
      const days = differenceInDays(periodEndDate, currentDate);
      const daysInYear = 365; // Всегда 365 согласно ТЗ
      
      const periodInterest = principal * (currentRate / 100) / daysInYear * days;
      totalInterest += periodInterest;
      
      currentDate = periodEndDate;
    }

    return totalInterest;
  }

  /**
   * Получить ставку на определённую дату
   */
  static getRateForDate(date, rates) {
    const effectiveRates = (Array.isArray(rates) ? rates : [])
      .filter(rate => rate && rate.effectiveDate instanceof Date && !isNaN(rate.effectiveDate.getTime()) && rate.effectiveDate <= date);
    if (effectiveRates.length === 0) return 0;
    
    return effectiveRates[effectiveRates.length - 1].annualPercent;
  }

  /**
   * Получить дату следующего изменения ставки
   */
  static getNextRateChangeDate(currentDate, rates) {
    const futureRates = (Array.isArray(rates) ? rates : [])
      .filter(rate => rate && rate.effectiveDate instanceof Date && !isNaN(rate.effectiveDate.getTime()) && rate.effectiveDate > currentDate);
    return futureRates.length > 0 ? futureRates[0].effectiveDate : null;
  }

  /**
   * Расчёт аннуитетного платежа
   */
  static calculateAnnuityPayment(principal, monthlyRate, terms) {
    if (terms <= 0) return principal; // защита от деления на ноль
    if (monthlyRate === 0) return principal / terms;
    
    return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -terms));
  }

  /**
   * Расчёт даты платежа с учётом дня платежа
   */
  static calculatePaymentDate(startDate, period, paymentDay) {
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
  static generateRemainingSchedule(
    credit,
    rates,
    adjustments,
    fromDate,
    existingPayments
  ) {
    // Найти последний оплаченный платёж до fromDate
    const paidPayments = existingPayments.filter(p => 
      p.status === 'paid' && p.dueDate < fromDate
    );
    
    // Рассчитать остаток основного долга (упрощённо)
    const paidAmount = paidPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const adjustedCredit = {
      ...credit,
      principal: Math.max(0, credit.principal - paidAmount),
      startDate: fromDate,
      termMonths: Math.max(0, credit.termMonths - paidPayments.length)
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
  static annualToDailyRate(annualRate, date) {
    const daysInYear = 365; // Всегда 365 согласно ТЗ
    return annualRate / 100 / daysInYear;
  }

  /**
   * Конвертация годовой ставки в месячную
   */
  static annualToMonthlyRate(annualRate) {
    return annualRate / 12 / 100;
  }

  /**
   * Эффективная ставка с учётом капитализации
   */
  static effectiveRate(nominalRate, periodsPerYear) {
    return Math.pow(1 + nominalRate / periodsPerYear, periodsPerYear) - 1;
  }
}