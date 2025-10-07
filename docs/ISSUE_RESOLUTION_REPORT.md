# Отчет о решении проблемы API Error: 500 Internal Server Error

## Описание проблемы

**Дата:** 7 октября 2025  
**Время:** 06:05 - 06:30 UTC  
**Проблема:** При попытке создать источник данных в интерфейсе настройки источников данных возникала ошибка "API Error: 500 Internal Server Error"

## Диагностика

### Шаг 1: Проверка состояния API
- ✅ API сервер работает на порту 3001
- ✅ Endpoint `/api/health` отвечает корректно
- ✅ Базовые endpoints `/api/expenses` работают

### Шаг 2: Воспроизведение ошибки
Выполнен POST запрос к `/api/expense-sources`:
```bash
POST http://localhost:3001/api/expense-sources
Content-Type: application/json

{
  "category": "Зарплата",
  "sheet_url": "https://docs.google.com/spreadsheets/d/1test/edit",
  "import_mode": "google_sheets",
  "sheet_name": "Лист1",
  "range_start": "A2",
  "range_end": "Z",
  "column_mapping": {},
  "is_active": true,
  "import_settings": {},
  "validation_rules": {}
}
```

**Результат:** HTTP 500 Internal Server Error

### Шаг 3: Анализ кода
Обнаружено, что в коде сервера отсутствует автоматическое создание таблицы `expense_sources`, в то время как для других таблиц (например, `aliases`) такая функциональность реализована.

## Корневая причина

**Проблема:** Таблица `expense_sources` не существует в базе данных и не создается автоматически при первом обращении к API.

**Код проблемы:** В endpoints `/api/expense-sources` отсутствовал код для автоматического создания таблицы, который присутствует в других endpoints (например, `/api/aliases`).

## Решение

### Шаг 1: Создание SQL схемы
Создан файл `scripts/create-expense-sources-table.sql` с полной схемой таблицы:

```sql
CREATE TABLE IF NOT EXISTS expense_sources (
    id SERIAL PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    sheet_url TEXT NOT NULL,
    import_mode VARCHAR(50) DEFAULT 'google_sheets',
    sheet_name VARCHAR(255),
    range_start VARCHAR(20),
    range_end VARCHAR(20),
    column_mapping JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    import_settings JSONB DEFAULT '{}',
    validation_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Шаг 2: Модификация кода сервера
Добавлен код автоматического создания таблицы в endpoints:

**В GET `/api/expense-sources`:**
```javascript
app.get('/api/expense-sources', async (req, res) => {
  try {
    // Создаем таблицу expense_sources если она не существует
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expense_sources (
        id SERIAL PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        sheet_url TEXT NOT NULL,
        import_mode VARCHAR(50) DEFAULT 'google_sheets',
        sheet_name VARCHAR(255),
        range_start VARCHAR(20),
        range_end VARCHAR(20),
        column_mapping JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        import_settings JSONB DEFAULT '{}',
        validation_rules JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query('SELECT * FROM expense_sources ORDER BY created_at DESC');
    // ... остальной код
  }
});
```

**В POST `/api/expense-sources`:**
Аналогичный код добавлен в начало POST endpoint'а.

### Шаг 3: Перезапуск сервера
- Остановлен старый процесс сервера
- Запущен новый процесс с обновленным кодом
- Проверена работоспособность API

## Результат

### Тестирование решения
После внесения изменений выполнен повторный тест:

```bash
POST http://localhost:3001/api/expense-sources
```

**Результат:** HTTP 201 Created ✅

```json
{
  "id": 1,
  "category": "Зарплата",
  "sheet_url": "https://docs.google.com/spreadsheets/d/1test/edit",
  "import_mode": "google_sheets",
  "sheet_name": "Лист1",
  "range_start": "A2",
  "range_end": "Z",
  "column_mapping": {},
  "is_active": true,
  "import_settings": {},
  "validation_rules": {},
  "created_at": "2025-10-07T06:26:26.xxx",
  "updated_at": "2025-10-07T06:26:26.xxx"
}
```

### Проверка GET запроса
```bash
GET http://localhost:3001/api/expense-sources
```

**Результат:** HTTP 200 OK ✅
Возвращает массив с созданным источником данных.

## Предотвращение повторения

### Рекомендации для разработки

1. **Стандартизация создания таблиц:**
   - Все API endpoints должны включать код автоматического создания таблиц
   - Использовать единый паттерн для всех endpoints

2. **Улучшение обработки ошибок:**
   - Добавить более детальные сообщения об ошибках
   - Логировать конкретные ошибки базы данных

3. **Тестирование:**
   - Добавить автоматические тесты для всех CRUD операций
   - Тестировать сценарии с отсутствующими таблицами

### Мониторинг

1. **Добавить алерты для ошибок 500**
2. **Мониторить создание новых таблиц**
3. **Регулярно проверять целостность схемы базы данных**

## Файлы, затронутые изменениями

- `server.js` - добавлен код создания таблицы в endpoints
- `scripts/create-expense-sources-table.sql` - новый файл с SQL схемой
- `start-frontend.bat` - вспомогательный скрипт для запуска frontend
- `docs/ISSUE_RESOLUTION_REPORT.md` - данный отчет

## Время решения

**Общее время:** 25 минут
- Диагностика: 10 минут
- Разработка решения: 10 минут
- Тестирование: 5 минут

## Статус

✅ **РЕШЕНО** - Проблема полностью устранена, функциональность восстановлена.

---

**Исполнитель:** Kiro AI Assistant  
**Дата создания отчета:** 7 октября 2025, 06:30 UTC