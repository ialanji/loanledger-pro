# Проблема: Платеж за октябрь 2025 не создается

## Описание проблемы
Система считает, что платеж за октябрь 2025 уже существует в базе данных для кредита GA202503S805/3524/27, поэтому не создает новый платеж. Но в интерфейсе этот платеж не отображается.

## Возможные причины

### 1. Платеж существует в БД, но скрыт в интерфейсе
- Платеж есть в таблице `credit_payment`
- Но не отображается из-за фильтров или статуса
- Или есть проблема с загрузкой данных в интерфейсе

### 2. Платеж помечен как отмененный или с неправильным статусом
- Статус `cancelled`, `deleted` или другой
- Система исключает такие платежи из отображения

### 3. Проблема с датами
- Платеж создан с неправильной датой
- Или есть проблема с часовыми поясами

### 4. Дублирование записей
- Несколько записей для одного периода
- Конфликт в данных

## Диагностика

### Шаг 1: Проверить конкретный кредит

Откройте в браузере (замените номер кредита на правильный):
```
http://localhost:3001/api/debug/credit/GA202503S805%2F3524%2F27/payments
```

Или если правильный номер GA202503S805/3524/2:
```
http://localhost:3001/api/debug/credit/GA202503S805%2F3524%2F2/payments
```

**Ожидаемый результат:**
```json
{
  "credit": {
    "id": "xxx",
    "contractNumber": "GA202503S805/3524/27",
    "startDate": "2023-01-19",
    "method": "floating_differentiated"
  },
  "totalPayments": 25,
  "october2025Payments": 1,  // ← Если больше 0, платеж существует!
  "october2025Details": [
    {
      "period_number": 27,
      "due_date": "2025-10-19",
      "status": "scheduled",  // ← Проверить статус
      "principal_due": 164.383,
      "interest_due": 0,
      "total_due": 164.383
    }
  ]
}
```

### Шаг 2: Проверить логи сервера

1. Откройте страницу "Расчетное закрытие платежей" для кредита
2. Нажмите "Обновить"
3. Проверьте логи в консоли сервера

**Что искать:**
```
[UNPROCESSED DEBUG] All existing payments in DB for credit XXX:
  - Period 27: 2025-10-19 (scheduled)  ← Есть ли период 27?

[UNPROCESSED DEBUG] Existing periods (excluding cancelled): 1,2,3,...,27  ← Включен ли 27?

[UNPROCESSED DEBUG] Items after excluding existing: 0  ← Если 0, то все исключены
```

### Шаг 3: Проверить таблицу credit_payment напрямую

Если есть доступ к БД, выполните SQL:

```sql
-- Найти кредит
SELECT id, contract_number FROM credits 
WHERE contract_number LIKE 'GA202503S805/3524/%';

-- Проверить платежи за октябрь 2025 (замените credit_id)
SELECT period_number, due_date, status, principal_due, interest_due, total_due
FROM credit_payment 
WHERE credit_id = 'XXX'  -- ID кредита из первого запроса
  AND due_date >= '2025-10-01' 
  AND due_date < '2025-11-01'
ORDER BY period_number;

-- Проверить все платежи кредита
SELECT period_number, due_date, status
FROM credit_payment 
WHERE credit_id = 'XXX'
ORDER BY period_number;
```

## Возможные решения

### Решение 1: Платеж существует, но скрыт - изменить статус

Если платеж есть в БД, но имеет неправильный статус:

```sql
-- Изменить статус на scheduled
UPDATE credit_payment 
SET status = 'scheduled'
WHERE credit_id = 'XXX' 
  AND period_number = 27
  AND due_date >= '2025-10-01' 
  AND due_date < '2025-11-01';
```

### Решение 2: Удалить дублирующий платеж

Если есть дублирующие записи:

```sql
-- Найти дубликаты
SELECT period_number, due_date, COUNT(*) 
FROM credit_payment 
WHERE credit_id = 'XXX'
GROUP BY period_number, due_date
HAVING COUNT(*) > 1;

-- Удалить дубликаты (оставить только один)
DELETE FROM credit_payment 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM credit_payment 
  WHERE credit_id = 'XXX'
  GROUP BY period_number
);
```

### Решение 3: Пересоздать платеж

Если платеж поврежден:

```sql
-- Удалить проблемный платеж
DELETE FROM credit_payment 
WHERE credit_id = 'XXX' 
  AND period_number = 27;
```

Затем создать новый через интерфейс.

### Решение 4: Изменить логику фильтрации

Если проблема в коде, изменить фильтр в `/api/credits/:id/payments/unprocessed`:

```javascript
// Показывать платежи со статусом 'scheduled' или 'overdue'
const existingQuery = `
  SELECT ...
  FROM credit_payment
  WHERE credit_id = $1
    AND LOWER(status) IN ('scheduled', 'overdue')  -- Добавить нужные статусы
    AND due_date <= $2
  ORDER BY due_date ASC
`;
```

## Быстрая проверка через браузер

1. **Проверить debug эндпоинт:** 
   `http://localhost:3001/api/debug/credit/GA202503S805%2F3524%2F2/payments`

2. **Проверить API unprocessed:**
   `http://localhost:3001/api/credits/XXX/payments/unprocessed` (замените XXX на ID кредита)

3. **Проверить полный список платежей:**
   `http://localhost:3001/api/credits/XXX/payments`

## Добавленное логирование

В эндпоинт `/api/credits/:id/payments/unprocessed` добавлено детальное логирование:

1. **Все существующие платежи в БД** с их статусами и датами
2. **Периоды, исключенные из создания** (кроме отмененных)
3. **Финальный список для отображения**

## Файлы изменены
- `server.js` - добавлены debug эндпоинты и логирование (строки ~1185-1250, ~1850-1870)

## Следующие шаги

1. **Проверьте debug эндпоинт** для конкретного кредита
2. **Посмотрите логи сервера** при обновлении страницы
3. **На основе результатов** выберите подходящее решение
4. **Если нужна помощь** - покажите результаты debug эндпоинта и логи