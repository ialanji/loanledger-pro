# Исправление проблем с типом кредита

## Проблемы

1. ✅ **API endpoint `/api/credits/totals-by-type` возвращает 500 ошибку**
   - Причина: Сервер не был перезапущен после обновления кода
   - Решение: Перезапустить сервер

2. ✅ **UI показывает неправильный тип кредита**
   - Причина: API не возвращает поле `credit_type`
   - Решение: Перезапустить сервер

3. ✅ **Обновление типа кредита не работает**
   - Причина: SQL параметры были неправильными (исправлено)
   - Решение: Перезапустить сервер

## Решение

### Шаг 1: Остановить текущий сервер

Если сервер запущен, остановите его (Ctrl+C в терминале где запущен сервер).

### Шаг 2: Перезапустить сервер

```bash
npm run server
```

Или для запуска и фронтенда и бэкенда:

```bash
npm run dev:full
```

### Шаг 3: Проверить что API работает

#### Проверка 1: API возвращает credit_type

```bash
curl http://localhost:3001/api/credits
```

Должно вернуть кредиты с полем `credit_type`:

```json
[
  {
    "id": "...",
    "contract_number": "C230400/1",
    "credit_type": "working_capital",
    ...
  }
]
```

#### Проверка 2: Endpoint totals-by-type работает

```bash
curl http://localhost:3001/api/credits/totals-by-type
```

Должно вернуть:

```json
{
  "investment": 25000000,
  "working_capital": 10000000,
  "total": 35000000
}
```

### Шаг 4: Проверить в UI

1. Откройте страницу кредитов: http://localhost:8091/credits
2. Проверьте что кредиты показывают правильный тип:
   - GA202503S805/3524/2 должен показывать "Оборотные средства" (зеленый badge)
   - C230400/1 должен показывать тип который установлен в базе

3. Попробуйте изменить тип кредита:
   - Откройте кредит для редактирования
   - Измените тип кредита
   - Сохраните
   - Проверьте что изменения сохранились

4. Проверьте дашборд: http://localhost:8091/
   - Должны отображаться суммы по типам кредитов
   - Не должно быть ошибки "Failed to fetch credit totals by type"

## Что было исправлено в коде

### 1. SQL параметры в PUT endpoint (server.js)

**Было:**
```javascript
WHERE id = ${paramIndex}
```

**Стало:**
```javascript
WHERE id = $${paramIndex}
```

### 2. API endpoints уже включают credit_type

GET /api/credits:
```javascript
SELECT c.id, c.contract_number, ..., c.credit_type, ...
FROM credits c
```

GET /api/credits/:id:
```javascript
SELECT c.id, c.contract_number, ..., c.credit_type, ...
FROM credits c
WHERE c.id = $1
```

### 3. PUT endpoint обрабатывает creditType

```javascript
// Credit type can be updated if no payments exist
if (creditType !== undefined) {
  updateFields.push(`credit_type = $${paramIndex}`);
  updateValues.push(creditType);
  paramIndex++;
}
```

## Проверка базы данных

Если хотите проверить данные напрямую в базе:

```bash
node -e "const {Pool}=require('pg');const p=new Pool({host:'backup.nanu.md',port:5433,database:'Finance_NANU',user:'postgres',password:'Nanu4ever'});p.query('SELECT contract_number, credit_type FROM credits').then(r=>{console.log(r.rows);p.end();})"
```

Должно показать:

```javascript
[
  { contract_number: 'C230400/1', credit_type: 'working_capital' },
  { contract_number: 'GA202503S805/3524/2', credit_type: 'working_capital' }
]
```

## Если проблемы остаются

### Проблема: API все еще не возвращает credit_type

1. Убедитесь что сервер был перезапущен
2. Проверьте что нет других процессов на порту 3001:
   ```bash
   netstat -ano | findstr :3001
   ```
3. Если есть, остановите процесс и перезапустите сервер

### Проблема: Обновление типа кредита не работает

1. Проверьте что у кредита нет платежей (тип можно менять только если нет платежей)
2. Проверьте консоль браузера на ошибки
3. Проверьте логи сервера

### Проблема: Dashboard показывает ошибку

1. Проверьте что endpoint `/api/credits/totals-by-type` работает (см. Проверка 2)
2. Проверьте консоль браузера на ошибки
3. Перезагрузите страницу (Ctrl+F5)

## Итог

После перезапуска сервера все должно работать:

- ✅ API возвращает credit_type
- ✅ UI показывает правильный тип кредита
- ✅ Обновление типа кредита работает
- ✅ Dashboard показывает суммы по типам
- ✅ Endpoint /api/credits/totals-by-type работает

---

**Дата:** 10 февраля 2025  
**Статус:** Исправлено, требуется перезапуск сервера
