import('./src/services/schedule-engine.js').then(async ({ ScheduleEngine }) => {

// Данные кредита из базы
const creditData = {
  id: 'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df',
  principal: 10000000,
  termMonths: 36,
  startDate: new Date('2023-07-14'),
  method: 'floating_differentiated',
  defermentMonths: 6,
  paymentDay: 20
};

// Ставки из базы
const rates = [
  { annualPercent: 9.9, effectiveDate: new Date('2023-07-14') },
  { annualPercent: 9.28, effectiveDate: new Date('2023-10-01') },
  { annualPercent: 8.98, effectiveDate: new Date('2024-01-01') },
  { annualPercent: 8.61, effectiveDate: new Date('2024-04-01') },
  { annualPercent: 8.06, effectiveDate: new Date('2024-07-01') },
  { annualPercent: 7.97, effectiveDate: new Date('2024-10-01') },
  { annualPercent: 8.30, effectiveDate: new Date('2025-01-01') },
  { annualPercent: 8.00, effectiveDate: new Date('2025-04-01') }
];

const adjustments = [];

console.log('Generating schedule...');
const scheduleResponse = ScheduleEngine.generatePaymentScheduleResponse(creditData, rates, adjustments);
console.log('Schedule generated:', scheduleResponse.schedule.length, 'payments');

// Показываем первые 10 платежей
console.log('\nFirst 10 payments:');
scheduleResponse.schedule.slice(0, 10).forEach(payment => {
  console.log(`Period ${payment.periodNumber}: ${payment.dueDate.toISOString().split('T')[0]} - Principal: ${payment.principalDue}, Interest: ${payment.interestDue}, Total: ${payment.totalDue}`);
});

// Фильтруем платежи до конца текущего месяца
const now = new Date();
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
console.log('\nCurrent date:', now.toISOString().split('T')[0]);
console.log('End of current month:', endOfMonth.toISOString().split('T')[0]);

const filteredPayments = scheduleResponse.schedule.filter(i => new Date(i.dueDate) <= endOfMonth);
console.log('\nFiltered payments (up to end of current month):', filteredPayments.length);

filteredPayments.forEach(payment => {
  console.log(`Period ${payment.periodNumber}: ${payment.dueDate.toISOString().split('T')[0]} - Principal: ${payment.principalDue}, Interest: ${payment.interestDue}, Total: ${payment.totalDue}`);
});

});