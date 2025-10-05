# Проблема: "Нет периодов для создания платежей"

## Описание проблемы
При попытке рассчитать платежи для кредита GA202503S805/3524/27 (метод: floating_differentiated) появляется сообщение "Нет периодов для создания платежей".

## Причина

Эндпоинт `/api/credits/:id/payments/unprocessed` возвращает только платежи, которые:
1. **До конца текущего месяца** (`due_date <= endOfCurrentMonth`)
2. **Еще не созданы в таблице `credit_payment`** (не в `existingPeriods`)

### Код фильтрации (server.js, строки ~1931-1933):
```javascript
const items = (scheduleResponse.schedule || [])
  .filter(i => i.dueDate <= endOfCurrentMonth)  // Только до конца текущего месяца
  .filter(i => !existingPeriods.has(i.periodNumber)); // Исключаем существующие
```

## Возможные сценарии

### Сценарий 1: Все платежи до текущего месяца уже созданы
Если в таблице `credit_payment` уже есть записи для всех периодов до конца текущего месяца, то `items` будет пустым массивом.

**Проверка:**
```sql
SELECT period_number, due_date, status 
FROM credit_payment 
WHERE credit_id = (SELECT id FROM credits WHERE contract_number = 'GA202503S805/3524/27')
ORDER BY period_number;
```

### Сценарий 2: Кредит начинается в будущем
Если `start_date` кредита позже текущего месяца, то не будет платежей до `endOfCurrentMonth`.

**Проверка:**
```sql
SELECT contract_number, start_date, term_months 
FROM credits 
WHERE contract_number = 'GA202503S805/3524/27';
```

### Сценарий 3: Все платежи уже прошли
Если кредит старый и все платежи уже в прошлом, но не созданы в БД, они все равно будут показаны (если не созданы).

## Добавленное логирование

Для диагностики добавлено детальное логирование в эндпоинт `/api/credits/:id/payments/unprocessed`:

```javascript
console.log(`[UNPROCESSED DEBUG] Credit ${creditData.contractNumber}:`);
console.log(`  - Total schedule items: ${scheduleResponse.schedule?.length || 0}`);
console.log(`  - End of current month: ${endOfCurrentMonth.toISOString().slice(0, 10)}`);
console.log(`  - Existing periods in DB: ${Array.from(existingPeriods).join(', ')}`);
console.log(`  - Items before current month: ${itemsBeforeFilter.length}`);
console.log(`  - Items before current month periods: ${itemsBeforeFilter.map(i => i.periodNumber).join(', ')}`);
console.log(`  - Items after excluding existing: ${items.length}`);
console.log(`  - Final unprocessed periods: ${items.map(i => i.periodNumber).join(', ')}`);
```

## Как диагностировать

1. **Откройте страницу "Расчетное закрытие платежей"** для кредита GA202503S805/3524/27
2. **Нажмите кнопку "Обновить"**
3. **Проверьте логи в консоли сервера** - найдите строки с `[UNPROCESSED DEBUG]`

### Что искать в логах:

```
[UNPROCESSED DEBUG] Credit GA202503S805/3524/27:
  - Total schedule items: XX        // Сколько всего платежей в графике
  - End of current month: 2025-01-31
  - Existing periods in DB: 1,2,3,4,5,6,7  // Какие периоды уже в БД
  - Items before current month: YY   // Сколько платежей до конца месяца
  - Items before current month periods: 1,2,3,4,5,6,7  // Какие периоды
  - Items after excluding existing: 0  // Сколько осталось после исключения
  - Final unprocessed periods:         // Какие периоды будут показаны (пусто!)
```

## Решения

### Решение 1: Показать все будущие платежи (не только до конца месяца)

Изменить фильтр, чтобы показывать все будущие платежи:

```javascript
const today = new Date();
const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

const items = (scheduleResponse.schedule || [])
  .filter(i => new Date(i.dueDate) >= todayStart)  // Все будущие платежи
  .filter(i => !existingPeriods.has(i.periodNumber));
```

### Решение 2: Показать платежи на N месяцев вперед

Изменить период с "до конца текущего месяца" на "следующие N месяцев":

```javascript
const now = new Date();
const futureMonths = 3; // Показать следующие 3 месяца
const endDate = new Date(now.getFullYear(), now.getMonth() + futureMonths, 0);

const items = (scheduleResponse.schedule || [])
  .filter(i => i.dueDate <= endDate)
  .filter(i => !existingPeriods.has(i.periodNumber));
```

### Решение 3: Показать непроведенные платежи из БД

Если платежи уже созданы в БД, но не оплачены, показать их:

```javascript
// В начале функции, после первого запроса к БД
const existingQuery = `
  SELECT 
    id, credit_id, period_number, due_date,
    principal_due, interest_due, total_due, status
  FROM credit_payment
  WHERE credit_id = $1
    AND LOWER(status) NOT IN ('paid', 'completed')
  ORDER BY due_date ASC
`;

const result = await pool.query(existingQuery, [id]);
if (result.rows.length > 0) {
  // Есть непроведенные платежи в БД - вернуть их
  return res.json(result.rows);
}
```

Этот код уже есть в функции (строки 1787-1802), но он фильтрует только до `endOfCurrentMonth`. Можно убрать этот фильтр:

```javascript
const existingQuery = `
  SELECT ...
  FROM credit_payment
  WHERE credit_id = $1
    AND LOWER(status) NOT IN ('paid', 'completed')
    -- Убрать: AND due_date <= $2
  ORDER BY due_date ASC
`;

const result = await pool.query(existingQuery, [id]); // Убрать второй параметр
```

## Рекомендуемое решение

**Комбинация Решения 2 и Решения 3:**

1. Показывать непроведенные платежи из БД (без ограничения по дате)
2. Если их нет, генерировать из графика на следующие 3-6 месяцев

Это даст пользователю возможность:
- Видеть все непроведенные платежи
- Создавать новые платежи на несколько месяцев вперед
- Не ограничиваться только текущим месяцем

## Файлы изменены
- `server.js` - добавлено детальное логирование в эндпоинт `/api/credits/:id/payments/unprocessed` (строки ~1777, ~1931-1945)

## Следующие шаги

1. **Запустите страницу и проверьте логи** - это покажет точную причину
2. **Выберите подходящее решение** на основе бизнес-требований
3. **Примените изменения** в код
