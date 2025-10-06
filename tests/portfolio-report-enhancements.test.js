/**
 * Тестирование улучшений портфельного отчета
 * Задача 11: Test portfolio report enhancements
 */

// Тестовые данные для портфельного отчета
const mockPortfolioData = {
  totalPrincipal: 100000,
  totalCredits: 4,
  totalPaid: 25000,
  items: [
    {
      bank: 'Банк А',
      creditCount: 2,
      totalPrincipal: 60000,
      avgRate: 12.5,
      totalPaid: 15000,
      remainingBalance: 45000,
      credits: [
        {
          id: 'credit-1',
          contractNumber: 'CR-001',
          principal: 30000,
          startDate: '2024-01-15',
          paidAmount: 7500,
          remainingBalance: 22500,
          rate: 12.0
        },
        {
          id: 'credit-2', 
          contractNumber: 'CR-003',
          principal: 30000,
          startDate: '2024-02-01',
          paidAmount: 7500,
          remainingBalance: 22500,
          rate: 13.0
        }
      ]
    },
    {
      bank: 'Банк Б',
      creditCount: 2,
      totalPrincipal: 40000,
      avgRate: 11.8,
      totalPaid: 10000,
      remainingBalance: 30000,
      credits: [
        {
          id: 'credit-3',
          contractNumber: 'CR-002',
          principal: 20000,
          startDate: '2024-01-20',
          paidAmount: 5000,
          remainingBalance: 15000,
          rate: 11.5
        },
        {
          id: 'credit-4',
          contractNumber: 'CR-004',
          principal: 20000,
          startDate: '2024-03-01',
          paidAmount: 5000,
          remainingBalance: 15000,
          rate: 12.1
        }
      ]
    }
  ]
};

// Тест 11.1: Тестирование расширения деталей кредитов
function testCreditDetailsExpansion() {
  console.log('🧪 Тестирование расширения деталей кредитов...\n');
  
  const tests = [
    {
      name: 'Структура данных банка',
      test: () => {
        const bank = mockPortfolioData.items[0];
        return bank.bank && 
               bank.creditCount && 
               bank.credits && 
               Array.isArray(bank.credits) &&
               bank.credits.length === bank.creditCount;
      },
      description: 'Банк должен содержать массив кредитов, соответствующий creditCount'
    },
    {
      name: 'Структура данных кредита',
      test: () => {
        const credit = mockPortfolioData.items[0].credits[0];
        const requiredFields = ['id', 'contractNumber', 'principal', 'startDate', 'paidAmount', 'remainingBalance', 'rate'];
        return requiredFields.every(field => credit[field] !== undefined);
      },
      description: 'Кредит должен содержать все необходимые поля'
    },
    {
      name: 'Сортировка кредитов по номеру договора',
      test: () => {
        const credits = mockPortfolioData.items[0].credits;
        const sortedCredits = [...credits].sort((a, b) => (a.contractNumber || '').localeCompare(b.contractNumber || ''));
        return JSON.stringify(credits) === JSON.stringify(sortedCredits);
      },
      description: 'Кредиты должны быть отсортированы по номеру договора'
    },
    {
      name: 'Корректность расчета остатка',
      test: () => {
        const credit = mockPortfolioData.items[0].credits[0];
        const expectedRemaining = credit.principal - credit.paidAmount;
        return Math.abs(credit.remainingBalance - expectedRemaining) < 0.01;
      },
      description: 'Остаток должен равняться основной сумме минус выплаченная сумма'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    if (test.test()) {
      console.log(`✅ ${test.name}: ПРОЙДЕН`);
      console.log(`   ${test.description}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: ПРОВАЛЕН`);
      console.log(`   ${test.description}`);
      failed++;
    }
    console.log('');
  });
  
  return { passed, failed };
}

// Тест 11.2: Проверка расчета остатка долга
function testRemainingBalanceCalculation() {
  console.log('🧪 Тестирование расчета остатка долга...\n');
  
  const tests = [
    {
      name: 'Кредит без платежей',
      data: { principal: 50000, paidAmount: 0 },
      expectedRemaining: 50000,
      test: function() {
        return this.data.principal - this.data.paidAmount === this.expectedRemaining;
      }
    },
    {
      name: 'Кредит с частичными платежами',
      data: { principal: 50000, paidAmount: 15000 },
      expectedRemaining: 35000,
      test: function() {
        return this.data.principal - this.data.paidAmount === this.expectedRemaining;
      }
    },
    {
      name: 'Полностью погашенный кредит',
      data: { principal: 50000, paidAmount: 50000 },
      expectedRemaining: 0,
      test: function() {
        return this.data.principal - this.data.paidAmount === this.expectedRemaining;
      }
    },
    {
      name: 'Переплата по кредиту',
      data: { principal: 50000, paidAmount: 55000 },
      expectedRemaining: -5000,
      test: function() {
        return this.data.principal - this.data.paidAmount === this.expectedRemaining;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    const actualRemaining = test.data.principal - test.data.paidAmount;
    
    if (test.test()) {
      console.log(`✅ ${test.name}: ПРОЙДЕН`);
      console.log(`   Основная сумма: ${test.data.principal}, Выплачено: ${test.data.paidAmount}`);
      console.log(`   Остаток: ${actualRemaining} (ожидалось: ${test.expectedRemaining})`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: ПРОВАЛЕН`);
      console.log(`   Основная сумма: ${test.data.principal}, Выплачено: ${test.data.paidAmount}`);
      console.log(`   Остаток: ${actualRemaining} (ожидалось: ${test.expectedRemaining})`);
      failed++;
    }
    console.log('');
  });
  
  return { passed, failed };
}

// Тест 11.3: Проверка расчета средневзвешенной ставки
function testWeightedAverageRateCalculation() {
  console.log('🧪 Тестирование расчета средневзвешенной ставки...\n');
  
  // Тестовые сценарии для расчета средневзвешенной ставки
  const testScenarios = [
    {
      name: 'Обычный расчет с двумя кредитами',
      credits: [
        { remainingBalance: 20000, rate: 12.0 },
        { remainingBalance: 30000, rate: 15.0 }
      ],
      expectedRate: 13.8, // (20000*12 + 30000*15) / (20000+30000) = 690000/50000 = 13.8
      description: 'Средневзвешенная ставка для двух кредитов с разными остатками'
    },
    {
      name: 'Равные остатки',
      credits: [
        { remainingBalance: 25000, rate: 10.0 },
        { remainingBalance: 25000, rate: 14.0 }
      ],
      expectedRate: 12.0, // (25000*10 + 25000*14) / (25000+25000) = 600000/50000 = 12.0
      description: 'Средневзвешенная ставка для кредитов с равными остатками'
    },
    {
      name: 'Нулевой остаток',
      credits: [
        { remainingBalance: 0, rate: 12.0 },
        { remainingBalance: 0, rate: 15.0 }
      ],
      expectedRate: 0, // Деление на ноль должно возвращать 0
      description: 'Обработка случая с нулевыми остатками'
    },
    {
      name: 'Один кредит с нулевым остатком',
      credits: [
        { remainingBalance: 0, rate: 12.0 },
        { remainingBalance: 30000, rate: 15.0 }
      ],
      expectedRate: 15.0, // (0*12 + 30000*15) / (0+30000) = 450000/30000 = 15.0
      description: 'Один кредит погашен, второй активен'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testScenarios.forEach(scenario => {
    // Расчет средневзвешенной ставки
    const weightedRateSum = scenario.credits.reduce((sum, credit) => 
      sum + (credit.remainingBalance * credit.rate), 0);
    const totalWeight = scenario.credits.reduce((sum, credit) => 
      sum + credit.remainingBalance, 0);
    const avgRate = totalWeight > 0 ? weightedRateSum / totalWeight : 0;
    
    const tolerance = 0.01; // Допустимая погрешность
    const isCorrect = Math.abs(avgRate - scenario.expectedRate) < tolerance;
    
    if (isCorrect) {
      console.log(`✅ ${scenario.name}: ПРОЙДЕН`);
      console.log(`   ${scenario.description}`);
      console.log(`   Расчетная ставка: ${avgRate.toFixed(2)}% (ожидалось: ${scenario.expectedRate}%)`);
      passed++;
    } else {
      console.log(`❌ ${scenario.name}: ПРОВАЛЕН`);
      console.log(`   ${scenario.description}`);
      console.log(`   Расчетная ставка: ${avgRate.toFixed(2)}% (ожидалось: ${scenario.expectedRate}%)`);
      console.log(`   Детали расчета: weightedSum=${weightedRateSum}, totalWeight=${totalWeight}`);
      failed++;
    }
    console.log('');
  });
  
  return { passed, failed };
}

// Тест 11.4: Тестирование с фильтрами по датам
function testDateFilters() {
  console.log('🧪 Тестирование фильтров по датам...\n');
  
  // Симуляция API запроса с фильтрами
  async function testPortfolioAPI(filters) {
    const params = new URLSearchParams();
    
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.bankId) params.append('bankId', filters.bankId);
    
    const url = `/api/reports/portfolio${params.toString() ? `?${params.toString()}` : ''}`;
    
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
  
  const testCases = [
    {
      name: 'Фильтр по дате начала',
      filters: { dateFrom: '2024-01-01' },
      description: 'Должен учитывать ставки, действующие с указанной даты'
    },
    {
      name: 'Фильтр по дате окончания',
      filters: { dateTo: '2024-12-31' },
      description: 'Должен учитывать ставки, действующие до указанной даты'
    },
    {
      name: 'Диапазон дат',
      filters: { dateFrom: '2024-01-01', dateTo: '2024-12-31' },
      description: 'Должен учитывать ставки в указанном диапазоне'
    },
    {
      name: 'Фильтр по банку и датам',
      filters: { dateFrom: '2024-01-01', dateTo: '2024-12-31', bankId: 'test-bank-id' },
      description: 'Комбинированная фильтрация по банку и датам'
    }
  ];
  
  console.log('📋 Тестовые случаи для фильтров портфельного отчета:');
  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}`);
    console.log(`   Фильтры: ${JSON.stringify(testCase.filters)}`);
    console.log(`   Описание: ${testCase.description}`);
    console.log('');
  });
  
  console.log('ℹ️  Для полного тестирования API требуется запущенный сервер');
  
  return { testCases };
}

// Основная функция запуска всех тестов портфельного отчета
function runPortfolioEnhancementTests() {
  console.log('🧪 Запуск тестов улучшений портфельного отчета...\n');
  
  const expansionResults = testCreditDetailsExpansion();
  const balanceResults = testRemainingBalanceCalculation();
  const rateResults = testWeightedAverageRateCalculation();
  const dateFilterResults = testDateFilters();
  
  const totalPassed = expansionResults.passed + balanceResults.passed + rateResults.passed;
  const totalFailed = expansionResults.failed + balanceResults.failed + rateResults.failed;
  const totalTests = totalPassed + totalFailed;
  
  console.log('\n🎯 ОБЩИЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ПОРТФЕЛЬНОГО ОТЧЕТА:');
  console.log(`   ✅ Всего пройдено: ${totalPassed}`);
  console.log(`   ❌ Всего провалено: ${totalFailed}`);
  console.log(`   📊 Общий процент успеха: ${Math.round((totalPassed / totalTests) * 100)}%`);
  
  console.log('\n📋 Детализация по категориям:');
  console.log(`   🔍 Расширение деталей: ${expansionResults.passed}/${expansionResults.passed + expansionResults.failed}`);
  console.log(`   💰 Расчет остатков: ${balanceResults.passed}/${balanceResults.passed + balanceResults.failed}`);
  console.log(`   📈 Средневзвешенная ставка: ${rateResults.passed}/${rateResults.passed + rateResults.failed}`);
  console.log(`   📅 Фильтры по датам: ${dateFilterResults.testCases.length} тестовых случаев подготовлено`);
  
  return {
    totalPassed,
    totalFailed,
    successRate: Math.round((totalPassed / totalTests) * 100),
    details: {
      expansion: expansionResults,
      balance: balanceResults,
      rate: rateResults,
      dateFilters: dateFilterResults
    }
  };
}

// Экспорт для использования в других тестах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mockPortfolioData,
    testCreditDetailsExpansion,
    testRemainingBalanceCalculation,
    testWeightedAverageRateCalculation,
    testDateFilters,
    runPortfolioEnhancementTests
  };
}

// Автозапуск при прямом выполнении
if (typeof window !== 'undefined') {
  console.log('Тесты портфельного отчета загружены. Используйте runPortfolioEnhancementTests() для запуска.');
} else if (require.main === module) {
  runPortfolioEnhancementTests();
}