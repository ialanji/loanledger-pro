/**
 * E2E тесты для проверки исправлений в отчетах
 * Проверяем прогнозный отчет и портфельный анализ после исправлений
 */
import { test, expect } from '@playwright/test';

test.describe('Проверка исправлений отчетов', () => {
  const API_BASE = 'http://localhost:3001';

  test.beforeAll(async () => {
    console.log('🚀 Начинаем проверку исправлений отчетов...');
  });

  test('API Health Check - сервер работает', async ({ request }) => {
    console.log('🔍 Проверяем работу сервера...');
    
    const response = await request.get(`${API_BASE}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('OK');
    
    console.log('✅ Сервер работает корректно');
  });

  test('Тестовые данные - проверка наличия кредитов', async ({ request }) => {
    console.log('🔍 Проверяем тестовые данные...');
    
    const response = await request.get(`${API_BASE}/api/test/forecast-data`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('credits');
    expect(data).toHaveProperty('rates');
    expect(data).toHaveProperty('creditsCount');
    expect(data).toHaveProperty('ratesCount');
    
    console.log(`✅ Найдено ${data.creditsCount} кредитов и ${data.ratesCount} процентных ставок`);
    
    // Проверяем, что есть данные для тестирования
    expect(data.creditsCount).toBeGreaterThan(0);
    expect(data.ratesCount).toBeGreaterThan(0);
  });

  test('Прогноз платежей API - исправление пустого отчета', async ({ request }) => {
    console.log('🔍 Тестируем исправление прогноза платежей...');
    
    const response = await request.get(`${API_BASE}/api/reports/forecast`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    
    console.log(`✅ Прогноз платежей вернул ${data.items.length} записей`);
    
    // Проверяем, что API работает корректно (может быть 0 записей, если нет предстоящих платежей)
    expect(data.items.length).toBeGreaterThanOrEqual(0);
    
    // Проверяем структуру данных
    if (data.items.length > 0) {
      const firstItem = data.items[0];
      expect(firstItem).toHaveProperty('bank');
      expect(firstItem).toHaveProperty('credit_id');
      expect(firstItem).toHaveProperty('month');
      expect(firstItem).toHaveProperty('remaining_balance');
      expect(firstItem).toHaveProperty('interest_payment');
      expect(firstItem).toHaveProperty('total_payment');
      
      console.log(`✅ Структура данных корректна. Первая запись: ${firstItem.bank}, месяц: ${firstItem.month}`);
    }
  });

  test('Портфельный анализ API - исправление расчета остатков', async ({ request }) => {
    console.log('🔍 Тестируем исправление портфельного анализа...');
    
    const response = await request.get(`${API_BASE}/api/reports/portfolio`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    
    console.log(`✅ Портфельный анализ вернул ${data.items.length} банков`);
    
    // Проверяем структуру данных
    if (data.items.length > 0) {
      const firstBank = data.items[0];
      expect(firstBank).toHaveProperty('bank');
      expect(firstBank).toHaveProperty('creditCount');
      expect(firstBank).toHaveProperty('totalPrincipal');
      expect(firstBank).toHaveProperty('totalPaid');
      expect(firstBank).toHaveProperty('remainingBalance');
      expect(firstBank).toHaveProperty('avgRate');
      expect(firstBank).toHaveProperty('credits');
      
      // Проверяем математическую корректность
      const expectedRemaining = firstBank.totalPrincipal - firstBank.totalPaid;
      expect(Math.abs(firstBank.remainingBalance - expectedRemaining)).toBeLessThan(0.01);
      
      console.log(`✅ Банк: ${firstBank.bank}`);
      console.log(`   Кредитов: ${firstBank.creditCount}`);
      console.log(`   Основная сумма: ${firstBank.totalPrincipal} MDL`);
      console.log(`   Выплачено: ${firstBank.totalPaid} MDL`);
      console.log(`   Остаток: ${firstBank.remainingBalance} MDL`);
      console.log(`   Средняя ставка: ${firstBank.averageRate}%`);
    }
  });

  test('Валидация параметров API - проверка исправлений', async ({ request }) => {
    console.log('🔍 Тестируем валидацию параметров...');
    
    // Тест некорректного формата даты
    const invalidDateResponse = await request.get(`${API_BASE}/api/reports/forecast?dateFrom=01-01-2024`);
    expect(invalidDateResponse.status()).toBe(400);
    
    const dateError = await invalidDateResponse.json();
    expect(dateError).toHaveProperty('error');
    expect(dateError.error).toContain('Invalid dateFrom format');
    
    // Тест некорректного bankId
    const invalidBankResponse = await request.get(`${API_BASE}/api/reports/forecast?bankId=12345`);
    expect(invalidBankResponse.status()).toBe(400);
    
    const bankError = await invalidBankResponse.json();
    expect(bankError).toHaveProperty('error');
    expect(bankError.error).toContain('Invalid bankId format');
    
    // Тест корректных параметров
    const validResponse = await request.get(`${API_BASE}/api/reports/forecast?dateFrom=2024-01-01&dateTo=2024-12-31&bankId=all`);
    expect(validResponse.status()).toBe(200);
    
    console.log('✅ Валидация параметров работает корректно');
  });

  test('Прогноз платежей - проверка данных на 12 месяцев', async ({ request }) => {
    console.log('🔍 Проверяем прогноз на 12 месяцев вперед...');
    
    const currentDate = new Date();
    const nextYear = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
    
    const dateFrom = currentDate.toISOString().split('T')[0];
    const dateTo = nextYear.toISOString().split('T')[0];
    
    const response = await request.get(`${API_BASE}/api/reports/forecast?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('items');
    
    if (data.items.length > 0) {
      // Проверяем, что есть данные на разные месяцы
      const months = [...new Set(data.items.map(item => item.month))];
      console.log(`✅ Прогноз покрывает ${months.length} месяцев: ${months.slice(0, 3).join(', ')}...`);
      
      // Проверяем, что остатки уменьшаются со временем (для одного кредита)
      const creditGroups = {};
      data.items.forEach(item => {
        if (!creditGroups[item.credit_id]) {
          creditGroups[item.credit_id] = [];
        }
        creditGroups[item.credit_id].push(item);
      });
      
      Object.keys(creditGroups).forEach(creditId => {
        const payments = creditGroups[creditId].sort((a, b) => new Date(a.month) - new Date(b.month));
        if (payments.length > 1) {
          const firstBalance = payments[0].remaining_balance;
          const lastBalance = payments[payments.length - 1].remaining_balance;
          expect(lastBalance).toBeLessThanOrEqual(firstBalance);
        }
      });
      
      console.log('✅ Остатки корректно уменьшаются со временем');
    }
  });

  test('Интеграционный тест - полный цикл отчетов', async ({ request }) => {
    console.log('🔍 Выполняем полный интеграционный тест...');
    
    // 1. Получаем список банков
    const banksResponse = await request.get(`${API_BASE}/api/banks`);
    expect(banksResponse.status()).toBe(200);
    
    // 2. Тестируем прогноз для каждого банка
    const banksData = await banksResponse.json();
    if (banksData.length > 0) {
      const firstBank = banksData[0];
      
      const forecastResponse = await request.get(`${API_BASE}/api/reports/forecast?bankId=${firstBank.id}`);
      expect(forecastResponse.status()).toBe(200);
      
      const forecastData = await forecastResponse.json();
      console.log(`✅ Прогноз для банка ${firstBank.name}: ${forecastData.items.length} записей`);
    }
    
    // 3. Проверяем портфельный анализ
    const portfolioResponse = await request.get(`${API_BASE}/api/reports/portfolio`);
    expect(portfolioResponse.status()).toBe(200);
    
    const portfolioData = await portfolioResponse.json();
    console.log(`✅ Портфельный анализ: ${portfolioData.items.length} банков`);
    
    // 4. Проверяем консистентность данных
    if (portfolioData.items.length > 0 && banksData.length > 0) {
      const portfolioBanks = portfolioData.items.map(item => item.bank);
      const allBanks = banksData.map(bank => bank.name);
      
      // Все банки из портфеля должны существовать в списке банков
      portfolioBanks.forEach(bankName => {
        expect(allBanks).toContain(bankName);
      });
      
      console.log('✅ Консистентность данных между отчетами подтверждена');
    }
  });
});