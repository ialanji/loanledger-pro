# Результат диагностики: Платеж за октябрь 2025

## Найденная проблема

### Кредит
- **Номер договора:** GA202503S805/3524/2 (не GA202503S805/3524/27!)
- **ID:** 2ceff137-41e9-4616-8465-900a76e607ef
- **Дата начала:** 17 марта 2025
- **Срок:** 24 месяца
- **Метод:** floating_differentiated
- **Основная сумма:** 25,000,000.00 MDL

### Состояние платежей в БД

| Период | Дата платежа | Статус | Сумма |
|--------|--------------|--------|-------|
| 1 | 19 апреля 2025 | paid | 189,383.56 |
| 2 | 19 мая 2025 | paid | 164,383.56 |
| 3 | 19 июня 2025 | paid | 169,863.01 |
| 4 | 19 июля 2025 | paid | 164,383.56 |
| 5 | 19 августа 2025 | paid | 169,863.01 |
| 6 | 19 сентября 2025 | paid | 169,863.01 |
| **7** | **19 октября 2025** | **❌ ОТСУТСТВУЕТ** | **❌** |

### График платежей (из ScheduleEngine)

Согласно расчету, должно быть **7 платежей до конца октября 2025**:

| Период | Дата | Основной долг | Проценты | Всего |
|--------|------|---------------|----------|-------|
| 1 | 19 апр 2025 | 1,041,666.67 | 178,424.66 | 1,220,091.32 |
| 2 | 19 май 2025 | 1,041,666.67 | 157,534.25 | 1,199,200.91 |
| 3 | 19 июн 2025 | 1,041,666.67 | 155,707.76 | 1,197,374.43 |
| 4 | 19 июл 2025 | 1,041,666.67 | 143,835.62 | 1,185,502.28 |
| 5 | 19 авг 2025 | 1,041,666.67 | 141,552.51 | 1,183,219.18 |
| 6 | 19 сен 2025 | 1,041,666.67 | 134,474.89 | 1,176,141.55 |
| **7** | **19 окт 2025** | **1,041,666.67** | **123,287.67** | **1,164,954.34** |

## Причина проблемы

Эндпоинт `/api/credits/:id/payments/unprocessed` работает следующим образом:

1. **Проверяет существующие платежи в БД** до конца текущего месяца (30 октября 2025)
2. **Генерирует график через ScheduleEngine**
3. **Фильтрует платежи:**
   - Только до конца текущего месяца: `i.dueDate <= endOfCurrentMonth`
   - Исключает периоды, которые уже есть в БД: `!existingPeriods.has(i.periodNumber)`

### Проблема в логике

Код в `server.js` (строки ~1860-1870) получает `existingPeriods` из таблицы `credit_payment`:

```javascript
const allExistingPaymentsQuery = `
  SELECT period_number, status
  FROM credit_payment
  WHERE credit_id = $1
`;
let existingPeriods = new Set();
const allPaymentsResult = await pool.query(allExistingPaymentsQuery, [id]);
existingPeriods = new Set(
  allPaymentsResult.rows
    .filter(p => p.status !== 'cancelled')
    .map(p => p.period_number)
);
```

Это означает, что `existingPeriods = {1, 2, 3, 4, 5, 6}`.

Затем код фильтрует график:

```javascript
const items = (scheduleResponse.schedule || [])
  .filter(i => i.dueDate <= endOfCurrentMonth)  // Периоды 1-7
  .filter(i => !existingPeriods.has(i.periodNumber)); // Исключаем 1-6
```

**Результат:** Должен остаться только период 7!

## Почему период 7 не показывается?

Возможные причины:

### 1. Период 7 уже есть в БД (но мы не видим его в запросе)

Давайте проверим еще раз:

```sql
SELECT period_number, due_date, status, created_at
FROM credit_payment 
WHERE credit_id = '2ceff137-41e9-4616-8465-900a76e607ef'
  AND period_number = 7;
```

### 2. Логирование покажет точную причину

С добавленным логированием в `server.js` (строки ~1931-1945), при обновлении страницы должны появиться логи:

```
[UNPROCESSED DEBUG] Credit GA202503S805/3524/2:
  - Total schedule items: 24
  - End of current month: 2025-10-30
  - Existing periods in DB: 1,2,3,4,5,6
  - Items before current month: 7
  - Items before current month periods: 1,2,3,4,5,6,7
  - Items after excluding existing: 1
  - Final unprocessed periods: 7
```

Если `Final unprocessed periods` пустой, значит проблема в фильтрации.

### 3. Возможная проблема с датами

Проверим, правильно ли сравниваются даты:

```javascript
const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
// Для 4 октября 2025: new Date(2025, 10, 0) = 30 октября 2025

const dueDate = new Date('2025-10-19'); // 19 октября 2025
dueDate <= endOfCurrentMonth // true
```

Должно работать правильно.

## Решение

### Немедленное решение: Создать платеж вручную

```sql
INSERT INTO credit_payment (
  credit_id,
  period_number,
  due_date,
  principal_due,
  interest_due,
  total_due,
  status,
  recalculated_version
) VALUES (
  '2ceff137-41e9-4616-8465-900a76e607ef',
  7,
  '2025-10-19',
  1041666.67,
  123287.67,
  1164954.34,
  'scheduled',
  1
);
```

### Долгосрочное решение: Изменить логику фильтрации

Изменить эндпоинт `/api/credits/:id/payments/unprocessed`, чтобы показывать платежи на несколько месяцев вперед, а не только до конца текущего месяца:

```javascript
// Вместо:
const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

// Использовать:
const futureMonths = 3; // Показать следующие 3 месяца
const endDate = new Date(now.getFullYear(), now.getMonth() + futureMonths + 1, 0);
```

## Следующие шаги

1. **Перезапустите сервер** и откройте страницу "Расчетное закрытие платежей"
2. **Нажмите "Обновить"** и проверьте логи в консоли сервера
3. **Найдите строки с `[UNPROCESSED DEBUG]`** для кредита GA202503S805/3524/2
4. **Покажите мне логи** - это покажет точную причину

Или если хотите сразу исправить проблему, я могу:
- Создать платеж 7 вручную через SQL
- Изменить логику, чтобы показывать больше месяцев вперед
