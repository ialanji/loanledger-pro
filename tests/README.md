# Структура тестов LoanLedger Pro

Эта папка содержит все тесты, отладочные скрипты и утилиты для проекта LoanLedger Pro.

## Структура папок

### 📁 `unit/`
Модульные тесты для отдельных компонентов и функций.
- Тестируют изолированные части кода
- Быстрые и независимые тесты
- Именование: `*.test.js` или `*.spec.js`

### 📁 `integration/`
Интеграционные тесты для API и взаимодействия компонентов.
- Тестируют взаимодействие между модулями
- Тесты API endpoints
- Именование: `test_*.js` или `test_*.cjs`

**Содержимое:**
- `test_banking_api.cjs` - Тесты банковского API
- `test_credit_creation.cjs` - Тесты создания кредитов
- `test_payment_creation.cjs` - Тесты создания платежей
- `expenses.test.js` - Тесты расходов
- `payments.test.js` - Тесты платежей

### 📁 `debug/`
Отладочные скрипты для диагностики проблем.
- Скрипты для отладки конкретных функций
- Диагностические утилиты
- Именование: `debug_*.js` или `debug_*.cjs`

**Содержимое:**
- `debug_credit_creation.cjs` - Отладка создания кредитов
- `debug_payment_update.cjs` - Отладка обновления платежей
- `debug_schedule.mjs` - Отладка расписания платежей

### 📁 `database/`
Скрипты для работы с базой данных.
- Создание таблиц и схем
- Миграции
- SQL скрипты
- Именование: `create_*.js`, `*.sql`

**Содержимое:**
- `create_tables.cjs` - Создание таблиц PostgreSQL
- `create_tables_postgresql.sql` - SQL скрипт создания таблиц
- `database.db` - SQLite база данных для тестов

### 📁 `scripts/`
Утилитарные скрипты и вспомогательные инструменты.
- Проверка данных
- Настройка окружения
- Вспомогательные утилиты

**Содержимое:**
- `check_*.cjs` - Скрипты проверки данных
- `setupTests.js` - Настройка тестового окружения
- `eslint.config.js` - Конфигурация ESLint

### 📁 `utils/`
Общие утилиты для тестов.
- Вспомогательные функции
- Моки и фикстуры
- Общие настройки

## Соглашения по именованию

### Тесты
- **Модульные тесты**: `ComponentName.test.js` или `functionName.spec.js`
- **Интеграционные тесты**: `test_feature_name.js` или `test_api_endpoint.cjs`

### Отладочные скрипты
- **Отладка**: `debug_feature_name.js` или `debug_issue_description.cjs`

### База данных
- **Создание**: `create_table_name.js` или `create_schema.sql`
- **Миграции**: `migrate_version_description.js`

### Скрипты
- **Проверка**: `check_data_type.js` или `verify_feature.cjs`
- **Настройка**: `setup_environment.js`

## Запуск тестов

### Все тесты
\`\`\`bash
npm test
\`\`\`

### Модульные тесты
\`\`\`bash
npm run test:unit
\`\`\`

### Интеграционные тесты
\`\`\`bash
npm run test:integration
\`\`\`

### Отладочные скрипты
\`\`\`bash
node tests/debug/debug_script_name.cjs
\`\`\`

## Создание новых тестов

1. **Определите тип теста** (unit, integration, debug)
2. **Выберите соответствующую папку**
3. **Следуйте соглашениям по именованию**
4. **Добавьте описание в этот README при необходимости**

## Примеры

### Создание модульного теста
\`\`\`javascript
// tests/unit/CreditCalculator.test.js
describe('CreditCalculator', () => {
  test('should calculate monthly payment correctly', () => {
    // тест логика
  });
});
\`\`\`

### Создание интеграционного теста
\`\`\`javascript
// tests/integration/test_credit_api.cjs
const http = require('http');

async function testCreditCreation() {
  // тест API
}
\`\`\`

### Создание отладочного скрипта
\`\`\`javascript
// tests/debug/debug_payment_calculation.cjs
async function debugPaymentIssue() {
  console.log('Отладка расчета платежей...');
  // отладочная логика
}
\`\`\`