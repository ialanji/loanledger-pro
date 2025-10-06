# Design Document

## Overview

Исправление расчета и отображения прогресса выплаты на Dashboard. Текущая реализация может показывать некорректные данные из-за неправильного использования переменных или проблем с загрузкой данных. Необходимо обеспечить корректный расчет процента выплаченной суммы от общей суммы кредитов.

## Architecture

### Current Implementation Analysis

Текущий код использует следующую формула для расчета прогресса:
```typescript
(((creditTypeTotals?.total || stats.totalPrincipal) - stats.remainingPrincipal) / (creditTypeTotals?.total || stats.totalPrincipal) * 100)
```

Проблемы:
1. Использует `remainingPrincipal` вместо прямого расчета выплаченной суммы
2. Может быть несоответствие между `creditTypeTotals?.total` и `stats.totalPrincipal`
3. Не учитывает `stats.totalPaid`, который уже рассчитывается в `calculateDashboardStats`

### Proposed Solution

Использовать прямой расчет на основе `stats.totalPaid`:
```typescript
(stats.totalPaid / stats.totalPrincipal * 100)
```

## Components and Interfaces

### Dashboard Component Updates

#### Progress Display Section
- **Location**: Блок "ДЕТАЛИ ОСТАТКА" в правой колонке
- **Current Element**: Прогресс-бар с текстом "Прогресс выплаты"
- **Updates Needed**:
  1. Исправить формулу расчета процента
  2. Добавить отображение конкретных сумм
  3. Обеспечить корректную анимацию прогресс-бара

#### Data Flow
```
API Data → calculateDashboardStats() → stats.totalPaid → Progress Calculation → UI Display
```

### Progress Calculation Logic

#### Input Data
- `stats.totalPrincipal`: Общая сумма всех кредитов
- `stats.totalPaid`: Фактически выплаченная сумма (из исторических платежей)

#### Calculation Formula
```typescript
const progressPercentage = stats.totalPrincipal > 0 
  ? (stats.totalPaid / stats.totalPrincipal * 100).toFixed(1)
  : '0.0';
```

#### Safety Checks
- Проверка деления на ноль
- Ограничение максимального значения до 100%
- Обработка случаев отсутствия данных

## Data Models

### Stats Interface Extension
Убедиться, что интерфейс `DashboardStats` включает:
```typescript
interface DashboardStats {
  totalPrincipal: number;    // Общая сумма кредитов
  totalPaid: number;         // Выплаченная сумма
  remainingPrincipal: number; // Остаток основного долга
  // ... другие поля
}
```

### Display Format
- **Процент**: `XX.X%` (одна десятичная)
- **Суммы**: `X,XXX,XXX.XX MDL` (с разделителями тысяч)
- **Прогресс-бар**: Ширина от 0% до 100%

## Error Handling

### Data Loading States
1. **Loading**: Показать индикатор загрузки вместо прогресса
2. **No Data**: Показать 0.0% если нет данных
3. **API Error**: Показать сообщение об ошибке

### Edge Cases
1. **Переплата**: Ограничить прогресс максимумом 100%
2. **Отрицательные значения**: Показать 0% если расчет дает отрицательное значение
3. **NaN/Infinity**: Показать 0% при некорректных расчетах

## Testing Strategy

### Unit Tests
1. Тест расчета прогресса с различными входными данными
2. Тест обработки граничных случаев (0, отрицательные, переплата)
3. Тест форматирования отображения

### Integration Tests
1. Тест загрузки данных из API
2. Тест корректности отображения в UI
3. Тест анимации прогресс-бара

### E2E Tests
1. Проверка отображения прогресса на реальных данных
2. Тест обновления прогресса при изменении данных
3. Тест состояний загрузки и ошибок

## Implementation Details

### Code Changes Required

#### 1. Progress Calculation Fix
Заменить текущую формулу:
```typescript
// Старая формула (может быть некорректной)
{(((creditTypeTotals?.total || stats.totalPrincipal) - stats.remainingPrincipal) / (creditTypeTotals?.total || stats.totalPrincipal) * 100).toFixed(1)}% выплачено

// Новая формула (прямой расчет)
{stats.totalPrincipal > 0 ? (stats.totalPaid / stats.totalPrincipal * 100).toFixed(1) : '0.0'}% выплачено
```

#### 2. Progress Bar Width
Обновить стиль прогресс-бара:
```typescript
style={{
  width: `${stats.totalPrincipal > 0 ? Math.min((stats.totalPaid / stats.totalPrincipal * 100), 100) : 0}%`
}}
```

#### 3. Additional Information Display
Добавить отображение конкретных сумм:
```typescript
<div className="flex justify-between text-xs text-gray-500 mt-1">
  <span>Выплачено: {formatCurrency(stats.totalPaid)}</span>
  <span>Всего: {formatCurrency(stats.totalPrincipal)}</span>
</div>
```

### Performance Considerations
- Расчеты выполняются только при изменении данных
- Анимация прогресс-бара оптимизирована с CSS transitions
- Форматирование валюты кэшируется

### Accessibility
- Прогресс-бар имеет соответствующие ARIA атрибуты
- Текстовое описание прогресса доступно для скрин-ридеров
- Цветовая схема соответствует контрастности

## Migration Strategy

1. **Backup**: Сохранить текущую реализацию
2. **Gradual Update**: Обновить расчет, затем UI
3. **Testing**: Проверить на тестовых данных
4. **Rollout**: Развернуть с мониторингом