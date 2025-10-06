/**
 * Тестирование прогнозного отчета с различными комбинациями фильтров
 * Задача 10.1: Test list view with various filter combinations
 */

const testCases = [
  {
    name: 'Без фильтров (все данные)',
    filters: {},
    description: 'Должен отображать все доступные данные прогноза',
    expectedBehavior: 'Показать все кредиты и платежи'
  },
  {
    name: 'Только dateFrom',
    filters: { dateFrom: '2024-01-01' },
    description: 'Должен показать кредиты, начинающиеся с указанной даты',
    expectedBehavior: 'Фильтрация по start_date >= dateFrom'
  },
  {
    name: 'Только dateTo', 
    filters: { dateTo: '2024-12-31' },
    description: 'Должен показать кредиты до указанной даты',
    expectedBehavior: 'Фильтрация по start_date <= dateTo'
  },
  {
    name: 'Диапазон дат',
    filters: { dateFrom: '2024-01-01', dateTo: '2024-12-31' },
    description: 'Должен показать кредиты в указанном диапазоне дат',
    expectedBehavior: 'Фильтрация по start_date >= dateFrom AND start_date <= dateTo'
  },
  {
    name: 'Фильтр по банку',
    filters: { bankId: 'test-bank-uuid' },
    description: 'Должен показать кредиты только выбранного банка',
    expectedBehavior: 'Фильтрация по bank_id = bankId'
  },
  {
    name: 'Все фильтры вместе',
    filters: { 
      dateFrom: '2024-01-01', 
      dateTo: '2024-12-31', 
      bankId: 'test-bank-uuid' 
    },
    description: 'Должен применить все фильтры одновременно',
    expectedBehavior: 'Комбинированная фильтрация по всем параметрам'
  }
];

// Функция для тестирования API эндпоинта
async function testForecastAPI(filters) {
  const params = new URLSearchParams();
  
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.bankId) params.append('bankId', filters.bankId);
  
  const url = `/api/reports/forecast${params.toString() ? `?${params.toString()}` : ''}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      data,
      itemCount: data.items ? data.items.length : 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Функция для валидации структуры ответа
function validateForecastResponse(data) {
  const errors = [];
  
  if (!data.items || !Array.isArray(data.items)) {
    errors.push('Отсутствует массив items в ответе');
    return errors;
  }
  
  data.items.forEach((item, index) => {
    const requiredFields = ['bank', 'creditNumber', 'month', 'principalAmount', 'interestAmount', 'totalAmount'];
    
    requiredFields.forEach(field => {
      if (item[field] === undefined || item[field] === null) {
        errors.push(`Отсутствует поле ${field} в элементе ${index}`);
      }
    });
    
    // Проверка типов данных
    if (typeof item.principalAmount !== 'number') {
      errors.push(`principalAmount должно быть числом в элементе ${index}`);
    }
    
    if (typeof item.interestAmount !== 'number') {
      errors.push(`interestAmount должно быть числом в элементе ${index}`);
    }
    
    if (typeof item.totalAmount !== 'number') {
      errors.push(`totalAmount должно быть числом в элементе ${index}`);
    }
    
    // Проверка формата месяца (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(item.month)) {
      errors.push(`Неверный формат месяца ${item.month} в элементе ${index}`);
    }
  });
  
  return errors;
}

// Основная функция тестирования
async function runForecastFilterTests() {
  console.log('🧪 Запуск тестов прогнозного отчета с фильтрами...\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`📋 Тест: ${testCase.name}`);
    console.log(`   Фильтры: ${JSON.stringify(testCase.filters)}`);
    console.log(`   Описание: ${testCase.description}`);
    
    const result = await testForecastAPI(testCase.filters);
    
    if (result.success) {
      const validationErrors = validateForecastResponse(result.data);
      
      if (validationErrors.length === 0) {
        console.log(`   ✅ Успешно - получено ${result.itemCount} элементов`);
        results.push({ ...testCase, status: 'PASS', itemCount: result.itemCount });
      } else {
        console.log(`   ❌ Ошибки валидации:`);
        validationErrors.forEach(error => console.log(`      - ${error}`));
        results.push({ ...testCase, status: 'FAIL', errors: validationErrors });
      }
    } else {
      console.log(`   ❌ Ошибка API: ${result.error}`);
      results.push({ ...testCase, status: 'ERROR', error: result.error });
    }
    
    console.log('');
  }
  
  // Сводка результатов
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  
  console.log('📊 Сводка результатов:');
  console.log(`   ✅ Пройдено: ${passed}`);
  console.log(`   ❌ Провалено: ${failed}`);
  console.log(`   🚫 Ошибки: ${errors}`);
  console.log(`   📈 Общий процент успеха: ${Math.round((passed / results.length) * 100)}%`);
  
  return results;
}

// Экспорт для использования в других тестах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCases,
    testForecastAPI,
    validateForecastResponse,
    runForecastFilterTests
  };
}

// Автозапуск при прямом выполнении
if (typeof window !== 'undefined') {
  // Браузерная среда - добавляем кнопку для запуска тестов
  console.log('Тесты прогнозного отчета загружены. Используйте runForecastFilterTests() для запуска.');
} else if (require.main === module) {
  // Node.js среда - запускаем тесты
  runForecastFilterTests().catch(console.error);
}