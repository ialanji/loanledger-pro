import('./src/services/schedule-engine.js').then(async ({ ScheduleEngine }) => {

// Тестируем исправленную логику фильтрации платежей
const creditData = {
  principal: 10000000,
  termMonths: 36,
  startDate: '2023-07-14',
  method: 'floating_differentiated',
  defermentMonths: 6,
  paymentDay: 14,
  bankId: 1
};

const rates = [
  {
    effective_date: '2023-07-14',
    rate: 0.15
  }
];

const adjustments = [];

console.log('Тестируем исправленную логику фильтрации платежей...\n');

// Генерируем полный график
const scheduleResponse = ScheduleEngine.generatePaymentScheduleResponse(creditData, rates, adjustments);
let items = scheduleResponse.schedule;

console.log(`Всего периодов в графике: ${items.length}`);
console.log(`Периоды отсрочки: ${creditData.defermentMonths}`);

// Показываем первые несколько периодов
console.log('\nПервые 10 периодов:');
items.slice(0, 10).forEach(item => {
  console.log(`Период ${item.periodNumber}: ${item.dueDate}, Основной долг: ${item.principalDue}, Проценты: ${item.interestDue}`);
});

// Применяем исправленную фильтрацию
const now = new Date();
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
const defermentMonths = creditData.defermentMonths;

console.log(`\nТекущая дата: ${now.toISOString().slice(0, 10)}`);
console.log(`Конец текущего месяца: ${endOfMonth.toISOString().slice(0, 10)}`);

// Старая логика (неправильная)
const oldFiltered = items.filter(i => new Date(i.dueDate) <= endOfMonth);
console.log(`\nСтарая логика - платежей до конца месяца: ${oldFiltered.length}`);

// Новая логика (исправленная)
const newFiltered = items.filter(i => new Date(i.dueDate) <= endOfMonth && i.periodNumber > defermentMonths);
console.log(`Новая логика - платежей до конца месяца (исключая отсрочку): ${newFiltered.length}`);

console.log('\nПлатежи после исправления фильтрации:');
newFiltered.slice(0, 5).forEach(item => {
  console.log(`Период ${item.periodNumber}: ${item.dueDate}, Основной долг: ${item.principalDue}, Проценты: ${item.interestDue}`);
});

});