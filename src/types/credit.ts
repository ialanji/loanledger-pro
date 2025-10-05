export type CreditType = 'investment' | 'working_capital';

export enum CalculationMethod {
  CLASSIC_ANNUITY = 'classic_annuity',
  CLASSIC_DIFFERENTIATED = 'classic_differentiated',
  FLOATING_ANNUITY = 'floating_annuity',
  FLOATING_DIFFERENTIATED = 'floating_differentiated'
}

export enum CreditStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  OVERDUE = 'overdue'
}

export enum PaymentStatus {
  SCHEDULED = 'scheduled',
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue',
  CANCELED = 'canceled'
}

export interface Credit {
  id: string;
  contractNumber: string;
  principal: number;
  currencyCode: string;
  bankId?: string;
  creditType: CreditType;
  method: CalculationMethod;
  paymentDay: number;
  startDate: Date;
  termMonths: number;
  defermentMonths: number;
  status: CreditStatus;
  createdAt: Date;
  updatedAt: Date;
  bank?: Bank;
  rates: CreditRate[];
  adjustments: PrincipalAdjustment[];
  payments: Payment[];
}

export interface Bank {
  id: string;
  name: string;
  code?: string;
  swift?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditRate {
  id: string;
  creditId: string;
  annualPercent: number;
  effectiveDate: Date;
  note?: string;
  createdAt: Date;
}

export interface PrincipalAdjustment {
  id: string;
  creditId: string;
  amount: number;
  effectiveDate: Date;
  note?: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  creditId: string;
  dueDate: Date;
  periodNumber: number;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  status: PaymentStatus;
  paidAmount?: number;
  paidAt?: Date;
  recalculatedVersion: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalCredits: number;
  activeCredits: number;
  totalPrincipal: number;
  remainingPrincipal: number;
  projectedInterest: number;
  thisMonthDue: number;
  thisMonthPrincipal: number;
  thisMonthInterest: number;
  overdueAmount: number;
  totalPaid: number;
}

export interface ScheduleItem {
  periodNumber: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  remainingBalance: number;
}

// Расширенный элемент графика для API с процентной ставкой
export interface ScheduleItemWithRate extends ScheduleItem {
  averageRate: number; // Средневзвешенная процентная ставка за период
}

// Итоговые показатели для графика платежей
export interface ScheduleTotals {
  totalPayments: number;    // Общая сумма платежей
  totalInterest: number;    // Общие проценты
  overpayment: number;      // Переплата (totalPayments - principal)
}

// Ответ API для получения графика платежей
export interface PaymentScheduleResponse {
  loan: {
    id: string;
    number: string;
    principal: number;
    calculationMethod: string;
  };
  schedule: ScheduleItemWithRate[];
  totals: ScheduleTotals;
}

// Type guard function for CreditType validation
export function isValidCreditType(value: string): value is CreditType {
  return value === 'investment' || value === 'working_capital';
}
