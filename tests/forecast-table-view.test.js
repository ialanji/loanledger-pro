/**
 * Тестирование табличного вида прогнозного отчета
 * Задача 10.2: Test table view rendering
 */

// Тестовые данные для проверки трансформации
const mockForecastData = {
  items: [
    {
      bank: 'Банк А',
      creditNumber: 'CR-001',
      month: '2024-01',
      principalAmount: 10000,
      interestAmount: 500,
      totalAmount: 10500
    },
    {
      bank: 'Банк Б',
      creditNumber: 'CR-002', 
      month: '2024-01',
      principalAmount: 15000,
      interestAmount: 750,
      totalAmount: 15750
    },
    {
      bank: 'Банк А',
      creditNumber: 'CR-003',
      month: '2024-02',
      principalAmount: 12000,
      interestAmount: 600,
      totalAmount: 12600
    },
    {
      bank: 'Банк Б',
      creditNumber: 'CR-004',
      month: '2024-02',
      principalAmount: 18000,
      interestAmount: 900,
      totalAmount: 18900
    }
  ]
};

// Копия функции transformToPivotTable из компонента для тестирования
function transformToPivotTable(items) {
  const pivotData = {};

  items.forEach(item => {
    const key = item.month; // Формат: "2024-01"
    const [year, monthNum] = key.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('ru-RU', { 
      year: 'numeric', 
      month: 'long' 
    });

    if (!pivotData[key]) {
      pivotData[key] = {
        year: parseInt(year),
        month: monthName,
        banks: {},
        totals: { principal: 0, interest: 0 }
      };
    }

    // Инициализируем данные банка, если их нет
    if (!pivotData[key].banks[item.bank]) {
      pivotData[key].banks[item.bank] = { principal: 0, interest: 0 };
    }

    // Агрегируем суммы по банкам
    pivotData[key].banks[item.bank].principal += item.principalAmount || 0;
    pivotData[key].banks[item.bank].interest += item.interestAmount || 0;

    // Обновляем общие итоги
    pivotData[key].totals.principal += item.principalAmount || 0;
    pivotData[key].totals.interest += item.interestAmount || 0;
  });

  // Преобразуем в массив и сортируем по году/месяцу
  return Object.entries(pivotData)
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// Копия функции getUniqueBankNames из компонента для тестирования
function getUniqueBankNames(items) {
  const bankNames = [...new Set(items.map(item => item.bank))];
  return bankNames.sort(); // Сортируем по алфавиту для консистентного отображения
}

// Тесты трансформации данных
function testPivotTableTransformation() {
  console.log('🧪 Тестирование трансформации в сводную таблицу...\n');
  
  const pivotData = transformToPivotTable(mockForecastData.items);
  const uniqueBanks = getUniqueBankNames(mockForecastData.items);
  
  console.log('📊 Результат трансформации:');
  console.log('Уникальные банки:', uniqueBanks);
  console.log('Данные сводной таблицы:', JSON.stringify(pivotData, null, 2));
  
  // Проверки структуры
  const tests = [
    {
      name: 'Количество месяцев',
      test: () => pivotData.length === 2,
      expected: 2,
      actual: pivotData.length
    },
    {
      name: 'Уникальные банки',
      test: () => uniqueBanks.length === 2 && uniqueBanks.includes('Банк А') && uniqueBanks.includes('Банк Б'),
      expected: ['Банк А', 'Банк Б'],
      actual: uniqueBanks
    },
    {
      name: 'Данные за январь 2024',
      test: () => {
        const jan2024 = pivotData.find(p => p.key === '2024-01');
        return jan2024 && 
               jan2024.banks['Банк А'].principal === 10000 &&
               jan2024.banks['Банк Б'].principal === 15000 &&
               jan2024.totals.principal === 25000;
      },
      expected: 'Корректные данные за январь',
      actual: pivotData.find(p => p.key === '2024-01')
    },
    {
      name: 'Данные за февраль 2024',
      test: () => {
        const feb2024 = pivotData.find(p => p.key === '2024-02');
        return feb2024 && 
               feb2024.banks['Банк А'].principal === 12000 &&
               feb2024.banks['Банк Б'].principal === 18000 &&
               feb2024.totals.principal === 30000;
      },
      expected: 'Корректные данные за февраль',
      actual: pivotData.find(p => p.key === '2024-02')
    },
    {
      name: 'Сортировка по месяцам',
      test: () => {
        return pivotData[0].key === '2024-01' && pivotData[1].key === '2024-02';
      },
      expected: 'Январь перед февралем',
      actual: pivotData.map(p => p.key)
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    if (test.test()) {
      console.log(`✅ ${test.name}: ПРОЙДЕН`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: ПРОВАЛЕН`);
      console.log(`   Ожидалось: ${JSON.stringify(test.expected)}`);
      console.log(`   Получено: ${JSON.stringify(test.actual)}`);
      failed++;
    }
  });
  
  console.log(`\n📈 Результаты тестирования трансформации:`);
  console.log(`   ✅ Пройдено: ${passed}`);
  console.log(`   ❌ Провалено: ${failed}`);
  console.log(`   📊 Процент успеха: ${Math.round((passed / tests.length) * 100)}%`);
  
  return { passed, failed, pivotData, uniqueBanks };
}

// Тест вычисления общих итогов
function testGrandTotalsCalculation() {
  console.log('\n🧪 Тестирование вычисления общих итогов...\n');
  
  const pivotData = transformToPivotTable(mockForecastData.items);
  const uniqueBanks = getUniqueBankNames(mockForecastData.items);
  
  // Вычисляем общие итоги (копия логики из компонента)
  const grandTotals = {
    principal: pivotData.reduce((sum, row) => sum + row.totals.principal, 0),
    interest: pivotData.reduce((sum, row) => sum + row.totals.interest, 0),
    banks: uniqueBanks.reduce((acc, bank) => {
      acc[bank] = {
        principal: pivotData.reduce((sum, row) => sum + (row.banks[bank]?.principal || 0), 0),
        interest: pivotData.reduce((sum, row) => sum + (row.banks[bank]?.interest || 0), 0)
      };
      return acc;
    }, {})
  };
  
  console.log('📊 Общие итоги:', JSON.stringify(grandTotals, null, 2));
  
  // Проверки итогов
  const tests = [
    {
      name: 'Общий итог по основному долгу',
      test: () => grandTotals.principal === 55000, // 10000 + 15000 + 12000 + 18000
      expected: 55000,
      actual: grandTotals.principal
    },
    {
      name: 'Общий итог по процентам',
      test: () => grandTotals.interest === 2750, // 500 + 750 + 600 + 900
      expected: 2750,
      actual: grandTotals.interest
    },
    {
      name: 'Итог по Банку А (основной долг)',
      test: () => grandTotals.banks['Банк А'].principal === 22000, // 10000 + 12000
      expected: 22000,
      actual: grandTotals.banks['Банк А'].principal
    },
    {
      name: 'Итог по Банку Б (основной долг)',
      test: () => grandTotals.banks['Банк Б'].principal === 33000, // 15000 + 18000
      expected: 33000,
      actual: grandTotals.banks['Банк Б'].principal
    },
    {
      name: 'Итог по Банку А (проценты)',
      test: () => grandTotals.banks['Банк А'].interest === 1100, // 500 + 600
      expected: 1100,
      actual: grandTotals.banks['Банк А'].interest
    },
    {
      name: 'Итог по Банку Б (проценты)',
      test: () => grandTotals.banks['Банк Б'].interest === 1650, // 750 + 900
      expected: 1650,
      actual: grandTotals.banks['Банк Б'].interest
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    if (test.test()) {
      console.log(`✅ ${test.name}: ПРОЙДЕН`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: ПРОВАЛЕН`);
      console.log(`   Ожидалось: ${test.expected}`);
      console.log(`   Получено: ${test.actual}`);
      failed++;
    }
  });
  
  console.log(`\n📈 Результаты тестирования итогов:`);
  console.log(`   ✅ Пройдено: ${passed}`);
  console.log(`   ❌ Провалено: ${failed}`);
  console.log(`   📊 Процент успеха: ${Math.round((passed / tests.length) * 100)}%`);
  
  return { passed, failed, grandTotals };
}

// Тест сравнения данных между списочным и табличным видами
function testDataConsistency() {
  console.log('\n🧪 Тестирование консистентности данных между видами...\n');
  
  const pivotData = transformToPivotTable(mockForecastData.items);
  
  // Вычисляем итоги из исходных данных (как в списочном виде)
  const listViewTotals = {
    principal: mockForecastData.items.reduce((sum, item) => sum + (item.principalAmount || 0), 0),
    interest: mockForecastData.items.reduce((sum, item) => sum + (item.interestAmount || 0), 0),
    total: mockForecastData.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0)
  };
  
  // Вычисляем итоги из сводной таблицы (как в табличном виде)
  const tableViewTotals = {
    principal: pivotData.reduce((sum, row) => sum + row.totals.principal, 0),
    interest: pivotData.reduce((sum, row) => sum + row.totals.interest, 0),
    total: pivotData.reduce((sum, row) => sum + row.totals.principal + row.totals.interest, 0)
  };
  
  console.log('📊 Итоги списочного вида:', listViewTotals);
  console.log('📊 Итоги табличного вида:', tableViewTotals);
  
  const tests = [
    {
      name: 'Консистентность основного долга',
      test: () => listViewTotals.principal === tableViewTotals.principal,
      expected: listViewTotals.principal,
      actual: tableViewTotals.principal
    },
    {
      name: 'Консистентность процентов',
      test: () => listViewTotals.interest === tableViewTotals.interest,
      expected: listViewTotals.interest,
      actual: tableViewTotals.interest
    },
    {
      name: 'Консистентность общих итогов',
      test: () => listViewTotals.total === tableViewTotals.total,
      expected: listViewTotals.total,
      actual: tableViewTotals.total
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    if (test.test()) {
      console.log(`✅ ${test.name}: ПРОЙДЕН`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: ПРОВАЛЕН`);
      console.log(`   Ожидалось: ${test.expected}`);
      console.log(`   Получено: ${test.actual}`);
      failed++;
    }
  });
  
  console.log(`\n📈 Результаты тестирования консистентности:`);
  console.log(`   ✅ Пройдено: ${passed}`);
  console.log(`   ❌ Провалено: ${failed}`);
  console.log(`   📊 Процент успеха: ${Math.round((passed / tests.length) * 100)}%`);
  
  return { passed, failed };
}

// Основная функция запуска всех тестов табличного вида
function runTableViewTests() {
  console.log('🧪 Запуск тестов табличного вида прогнозного отчета...\n');
  
  const transformationResults = testPivotTableTransformation();
  const totalsResults = testGrandTotalsCalculation();
  const consistencyResults = testDataConsistency();
  
  const totalPassed = transformationResults.passed + totalsResults.passed + consistencyResults.passed;
  const totalFailed = transformationResults.failed + totalsResults.failed + consistencyResults.failed;
  const totalTests = totalPassed + totalFailed;
  
  console.log('\n🎯 ОБЩИЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ТАБЛИЧНОГО ВИДА:');
  console.log(`   ✅ Всего пройдено: ${totalPassed}`);
  console.log(`   ❌ Всего провалено: ${totalFailed}`);
  console.log(`   📊 Общий процент успеха: ${Math.round((totalPassed / totalTests) * 100)}%`);
  
  return {
    totalPassed,
    totalFailed,
    successRate: Math.round((totalPassed / totalTests) * 100)
  };
}

// Экспорт для использования в других тестах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mockForecastData,
    transformToPivotTable,
    getUniqueBankNames,
    testPivotTableTransformation,
    testGrandTotalsCalculation,
    testDataConsistency,
    runTableViewTests
  };
}

// Автозапуск при прямом выполнении
if (typeof window !== 'undefined') {
  console.log('Тесты табличного вида загружены. Используйте runTableViewTests() для запуска.');
} else if (require.main === module) {
  runTableViewTests();
}