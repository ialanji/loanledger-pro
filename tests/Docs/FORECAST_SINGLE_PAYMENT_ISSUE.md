# Проблема: В прогнозном отчете показывается только один платеж

## Описание проблемы
Для кредита GA202503S805/3524/27 в прогнозном отчете показывается только один платеж на октябрь 2025 года (164.383,56 L), хотя должно быть больше платежей.

## Возможные причины

### 1. Платежи помечены как оплаченные
Код в `server.js` (строки 2970-2982) исключает из прогноза все платежи, которые помечены как `paid` в таблице `credit_payment`:

```javascript
// Получаем уже оплаченные платежи для этого кредита
const paidPaymentsQuery = `
  SELECT period_number, status, payment_date
  FROM credit_payment 
  WHERE credit_id = $1 AND status = 'paid'
`;
const paidPaymentsResult = await pool.query(paidPaymentsQuery, [credit.id]);
const paidPeriods = new Set(paidPaymentsResult.rows.map(row => row.period_number));

// Добавляем в прогноз только неоплаченные платежи
if (monthPayment && !paidPeriods.has(monthPayment.periodNumber)) {
  // Добавляем платеж
}
```

**Проверка:** Если в таблице `credit_payment` есть записи со `status = 'paid'` для этого кредита, они будут исключены из прогноза.

### 2. Ограничение на 12 месяцев
Код показывает только платежи на следующие 12 месяцев (строка 2948):

```javascript
// Извлекаем платежи для следующих 12 месяцев
for (let i = 0; i < 12; i++) {
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
  // ...
}
```

**Проверка:** Если кредит имеет платежи за пределами следующих 12 месяцев, они не будут показаны.

### 3. Один платеж на месяц
Код использует `find()` вместо `filter()`, что означает, что для каждого месяца находится только **один** платеж (строки 2952-2956):

```javascript
const monthPayment = scheduleResponse.schedule.find(payment => {
  const paymentDate = new Date(payment.dueDate);
  return paymentDate.getFullYear() === targetMonth.getFullYear() && 
         paymentDate.getMonth() === targetMonth.getMonth();
});
```

**Проверка:** Если в одном месяце несколько платежей (что редко для обычных кредитов), будет показан только первый.

## Добавленное логирование

Для диагностики проблемы добавлено детальное логирование:

1. **Полный график платежей:**
```javascript
allSchedule: scheduleResponse.schedule.map(p => ({
  period: p.periodNumber,
  dueDate: p.dueDate,
  principal: p.principalDue,
  interest: p.interestDue
}))
```

2. **Информация о добавлении платежей:**
```javascript
console.log(`[FORECAST DEBUG] Adding payment for credit ${credit.contract_number}, period ${monthPayment.periodNumber}, month ${monthStr}`);
```

3. **Информация о пропущенных платежах:**
```javascript
console.log(`[FORECAST DEBUG] Skipping paid period ${monthPayment.periodNumber} for credit ${credit.contract_number} in month ${monthStr}`);
console.log(`[FORECAST DEBUG] No payment found for credit ${credit.contract_number} in month ${monthStr}`);
```

## Как диагностировать

1. **Запустите сервер** и откройте прогнозный отчет
2. **Проверьте логи в консоли** - найдите строки с `[FORECAST DEBUG]` для кредита GA202503S805/3524/27
3. **Проверьте:**
   - Сколько всего платежей в графике (`scheduleLength`)
   - Какие периоды помечены как оплаченные (`paidPeriodsCount`, `paidPeriods`)
   - Какие платежи найдены для каждого месяца
   - Какие платежи пропущены и почему

## Возможные решения

### Решение 1: Показать все неоплаченные платежи (не только 12 месяцев)

Изменить логику, чтобы показывать все будущие платежи:

```javascript
// Вместо цикла на 12 месяцев, показываем все неоплаченные платежи
for (const payment of scheduleResponse.schedule) {
  const paymentDate = new Date(payment.dueDate);
  
  // Пропускаем прошедшие платежи
  if (paymentDate < now) continue;
  
  // Пропускаем оплаченные платежи
  if (paidPeriods.has(payment.periodNumber)) continue;
  
  const monthStr = paymentDate.toISOString().substring(0, 7);
  
  forecastItems.push({
    bank: credit.bank_name || 'Неизвестный банк',
    creditNumber: credit.contract_number || 'Неизвестный номер',
    month: monthStr,
    principalAmount: Math.round(payment.principalDue * 100) / 100,
    interestAmount: Math.round(payment.interestDue * 100) / 100,
    totalAmount: Math.round(payment.totalDue * 100) / 100
  });
}
```

### Решение 2: Проверить и очистить неправильные записи в credit_payment

Если платежи ошибочно помечены как `paid`, нужно:

```sql
-- Проверить оплаченные платежи для кредита
SELECT * FROM credit_payment 
WHERE credit_id = (SELECT id FROM credits WHERE contract_number = 'GA202503S805/3524/27')
AND status = 'paid';

-- Если нужно, изменить статус обратно на 'scheduled'
UPDATE credit_payment 
SET status = 'scheduled'
WHERE credit_id = (SELECT id FROM credits WHERE contract_number = 'GA202503S805/3524/27')
AND period_number > 7; -- например, если только первые 7 платежей оплачены
```

### Решение 3: Увеличить период прогноза

Изменить `12` на большее число, например `24` или `36`:

```javascript
// Извлекаем платежи для следующих 24 месяцев
for (let i = 0; i < 24; i++) {
```

## Рекомендации

1. **Сначала проверьте логи** - они покажут точную причину
2. **Проверьте таблицу credit_payment** - возможно, платежи ошибочно помечены как оплаченные
3. **Если нужно показывать все платежи** - используйте Решение 1
4. **Если нужно больше 12 месяцев** - используйте Решение 3

## Файлы изменены
- `server.js` - добавлено детальное логирование для диагностики (строки ~2940, ~2970-2982)
