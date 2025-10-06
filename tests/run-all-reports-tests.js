/**
 * Запуск всех тестов для улучшений отчетов
 * Задачи 10-11: Комплексное тестирование функциональности отчетов
 */

// Импорт тестовых модулей (если в Node.js среде)
let forecastFiltersTests, forecastTableTests, portfolioTests;

if (typeof require !== 'undefined') {
  try {
    forecastFiltersTests = require('./forecast-report-filters.test.js');
    forecastTableTests = require('./forecast-table-view.test.js');
    portfolioTests = require('./portfolio-report-enhancements.test.js');
  } catch (error) {
    console.log('⚠️  Некоторые тестовые модули не найдены. Запуск в браузерной среде.');
  }
}

// Основная функция запуска всех тестов
async function runAllReportsTests() {
  console.log('🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ УЛУЧШЕНИЙ ОТЧЕТОВ');
  console.log('=' .repeat(60));
  console.log('');
  
  const results = {
    forecastFilters: null,
    forecastTable: null,
    portfolio: null,
    totalPassed: 0,
    totalFailed: 0,
    totalTests: 0
  };
  
  // 1. Тестирование фильтров прогнозного отчета
  console.log('📊 БЛОК 1: ТЕСТИРОВАНИЕ ФИЛЬТРОВ ПРОГНОЗНОГО ОТЧЕТА');
  console.log('-'.repeat(50));
  
  if (forecastFiltersTests && forecastFiltersTests.runForecastFilterTests) {
    try {
      results.forecastFilters = await forecastFiltersTests.runForecastFilterTests();
      console.log('✅ Тестирование фильтров прогнозного отчета завершено');
    } catch (error) {
      console.log('❌ Ошибка при тестировании фильтров:', error.message);
      results.forecastFilters = { error: error.message };
    }
  } else {
    console.log('ℹ️  Тесты фильтров прогнозного отчета недоступны в текущей среде');
    console.log('   Для запуска используйте: node tests/forecast-report-filters.test.js');
  }
  
  console.log('');
  
  // 2. Тестирование табличного вида прогнозного отчета
  console.log('📋 БЛОК 2: ТЕСТИРОВАНИЕ ТАБЛИЧНОГО ВИДА ПРОГНОЗНОГО ОТЧЕТА');
  console.log('-'.repeat(50));
  
  if (forecastTableTests && forecastTableTests.runTableViewTests) {
    try {
      results.forecastTable = forecastTableTests.runTableViewTests();
      console.log('✅ Тестирование табличного вида завершено');
    } catch (error) {
      console.log('❌ Ошибка при тестировании табличного вида:', error.message);
      results.forecastTable = { error: error.message };
    }
  } else {
    console.log('ℹ️  Тесты табличного вида недоступны в текущей среде');
    console.log('   Для запуска используйте: node tests/forecast-table-view.test.js');
  }
  
  console.log('');
  
  // 3. Тестирование улучшений портфельного отчета
  console.log('💼 БЛОК 3: ТЕСТИРОВАНИЕ УЛУЧШЕНИЙ ПОРТФЕЛЬНОГО ОТЧЕТА');
  console.log('-'.repeat(50));
  
  if (portfolioTests && portfolioTests.runPortfolioEnhancementTests) {
    try {
      results.portfolio = portfolioTests.runPortfolioEnhancementTests();
      console.log('✅ Тестирование портфельного отчета завершено');
    } catch (error) {
      console.log('❌ Ошибка при тестировании портфельного отчета:', error.message);
      results.portfolio = { error: error.message };
    }
  } else {
    console.log('ℹ️  Тесты портфельного отчета недоступны в текущей среде');
    console.log('   Для запуска используйте: node tests/portfolio-report-enhancements.test.js');
  }
  
  console.log('');
  
  // Подсчет общих результатов
  if (results.forecastTable && !results.forecastTable.error) {
    results.totalPassed += results.forecastTable.totalPassed || 0;
    results.totalFailed += results.forecastTable.totalFailed || 0;
  }
  
  if (results.portfolio && !results.portfolio.error) {
    results.totalPassed += results.portfolio.totalPassed || 0;
    results.totalFailed += results.portfolio.totalFailed || 0;
  }
  
  results.totalTests = results.totalPassed + results.totalFailed;
  
  // Итоговый отчет
  console.log('🎯 ИТОГОВЫЙ ОТЧЕТ ПО ТЕСТИРОВАНИЮ');
  console.log('=' .repeat(60));
  console.log('');
  
  console.log('📊 Результаты по блокам:');
  
  if (results.forecastFilters && !results.forecastFilters.error) {
    console.log('   📈 Фильтры прогнозного отчета: API тесты выполнены');
  } else if (results.forecastFilters && results.forecastFilters.error) {
    console.log('   ❌ Фильтры прогнозного отчета: Ошибка выполнения');
  } else {
    console.log('   ⏭️  Фильтры прогнозного отчета: Пропущено (требует API)');
  }
  
  if (results.forecastTable && !results.forecastTable.error) {
    console.log(`   📋 Табличный вид: ${results.forecastTable.totalPassed}/${results.forecastTable.totalPassed + results.forecastTable.totalFailed} (${results.forecastTable.successRate}%)`);
  } else if (results.forecastTable && results.forecastTable.error) {
    console.log('   ❌ Табличный вид: Ошибка выполнения');
  } else {
    console.log('   ⏭️  Табличный вид: Пропущено');
  }
  
  if (results.portfolio && !results.portfolio.error) {
    console.log(`   💼 Портфельный отчет: ${results.portfolio.totalPassed}/${results.portfolio.totalPassed + results.portfolio.totalFailed} (${results.portfolio.successRate}%)`);
  } else if (results.portfolio && results.portfolio.error) {
    console.log('   ❌ Портфельный отчет: Ошибка выполнения');
  } else {
    console.log('   ⏭️  Портфельный отчет: Пропущено');
  }
  
  console.log('');
  console.log('📈 Общая статистика:');
  console.log(`   ✅ Всего пройдено: ${results.totalPassed}`);
  console.log(`   ❌ Всего провалено: ${results.totalFailed}`);
  console.log(`   📊 Всего тестов: ${results.totalTests}`);
  
  if (results.totalTests > 0) {
    const successRate = Math.round((results.totalPassed / results.totalTests) * 100);
    console.log(`   🎯 Общий процент успеха: ${successRate}%`);
    
    if (successRate >= 90) {
      console.log('   🏆 ОТЛИЧНЫЙ РЕЗУЛЬТАТ! Все основные функции работают корректно.');
    } else if (successRate >= 75) {
      console.log('   👍 ХОРОШИЙ РЕЗУЛЬТАТ! Большинство функций работает корректно.');
    } else if (successRate >= 50) {
      console.log('   ⚠️  УДОВЛЕТВОРИТЕЛЬНЫЙ РЕЗУЛЬТАТ. Требуется доработка некоторых функций.');
    } else {
      console.log('   🚨 НЕУДОВЛЕТВОРИТЕЛЬНЫЙ РЕЗУЛЬТАТ. Требуется серьезная доработка.');
    }
  } else {
    console.log('   ℹ️  Тесты не выполнялись или недоступны в текущей среде');
  }
  
  console.log('');
  console.log('📝 Рекомендации:');
  console.log('   1. Для полного тестирования API запустите сервер разработки');
  console.log('   2. Проверьте браузерную консоль на наличие ошибок JavaScript');
  console.log('   3. Убедитесь, что все компоненты корректно импортируют зависимости');
  console.log('   4. Протестируйте функциональность вручную в интерфейсе');
  
  return results;
}

// Функция для создания отчета о тестировании
function generateTestReport(results) {
  const timestamp = new Date().toISOString();
  
  const report = {
    timestamp,
    summary: {
      totalPassed: results.totalPassed,
      totalFailed: results.totalFailed,
      totalTests: results.totalTests,
      successRate: results.totalTests > 0 ? Math.round((results.totalPassed / results.totalTests) * 100) : 0
    },
    details: {
      forecastFilters: results.forecastFilters,
      forecastTable: results.forecastTable,
      portfolio: results.portfolio
    },
    recommendations: [
      'Запустите сервер для полного тестирования API эндпоинтов',
      'Проверьте браузерную консоль на JavaScript ошибки',
      'Протестируйте UI компоненты вручную',
      'Убедитесь в корректности всех импортов и зависимостей'
    ]
  };
  
  return report;
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllReportsTests,
    generateTestReport
  };
}

// Автозапуск при прямом выполнении
if (typeof window !== 'undefined') {
  console.log('🧪 Комплексные тесты отчетов загружены.');
  console.log('   Используйте runAllReportsTests() для запуска всех тестов.');
  console.log('   Используйте generateTestReport(results) для создания отчета.');
} else if (require.main === module) {
  runAllReportsTests().then(results => {
    const report = generateTestReport(results);
    console.log('\n📄 Отчет о тестировании сохранен в переменной report');
  }).catch(console.error);
}