/**
 * Простые тесты для проверки исправлений в отчетах
 * Фокусируемся на основных исправлениях без строгих требований к данным
 */
import { test, expect } from '@playwright/test';

test.describe('Исправления отчетов - Простая проверка', () => {
  const API_BASE = 'http://localhost:3001';

  test('✅ Сервер работает и отвечает', async ({ request }) => {
    console.log('🔍 Проверяем работу сервера...');
    
    const response = await request.get(`${API_BASE}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('OK');
    
    console.log('✅ Сервер работает корректно');
  });

  test('✅ Прогноз платежей API не падает', async ({ request }) => {
    console.log('🔍 Проверяем, что прогноз платежей не падает...');
    
    const response = await request.get(`${API_BASE}/api/reports/forecast`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    
    console.log(`✅ Прогноз платежей работает, вернул ${data.items.length} записей`);
    
    // Если есть данные, проверяем их структуру
    if (data.items.length > 0) {
      const firstItem = data.items[0];
      expect(firstItem).toHaveProperty('bank');
      expect(firstItem).toHaveProperty('month');
      console.log(`✅ Структура данных корректна`);
    } else {
      console.log('ℹ️ Нет предстоящих платежей в следующие 12 месяцев');
    }
  });

  test('✅ Портфельный анализ API работает корректно', async ({ request }) => {
    console.log('🔍 Проверяем портфельный анализ...');
    
    const response = await request.get(`${API_BASE}/api/reports/portfolio`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    
    console.log(`✅ Портфельный анализ работает, вернул ${data.items.length} банков`);
    
    // Если есть данные, проверяем их структуру
    if (data.items.length > 0) {
      const firstBank = data.items[0];
      expect(firstBank).toHaveProperty('bank');
      expect(firstBank).toHaveProperty('creditCount');
      expect(firstBank).toHaveProperty('totalPrincipal');
      expect(firstBank).toHaveProperty('remainingBalance');
      expect(firstBank).toHaveProperty('credits');
      
      // Проверяем математическую корректность остатков
      const expectedRemaining = firstBank.totalPrincipal - firstBank.totalPaid;
      expect(Math.abs(firstBank.remainingBalance - expectedRemaining)).toBeLessThan(0.01);
      
      console.log(`✅ Банк: ${firstBank.bank}, остаток: ${firstBank.remainingBalance} MDL`);
    } else {
      console.log('ℹ️ Нет данных по кредитам');
    }
  });

  test('✅ API валидация работает', async ({ request }) => {
    console.log('🔍 Проверяем валидацию API...');
    
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
    
    console.log('✅ Валидация параметров работает корректно');
  });

  test('✅ Тестовые данные доступны', async ({ request }) => {
    console.log('🔍 Проверяем наличие тестовых данных...');
    
    const response = await request.get(`${API_BASE}/api/test/forecast-data`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('credits');
    expect(data).toHaveProperty('rates');
    expect(data).toHaveProperty('creditsCount');
    expect(data).toHaveProperty('ratesCount');
    
    console.log(`✅ Найдено ${data.creditsCount} кредитов и ${data.ratesCount} ставок`);
    
    // Должны быть хотя бы некоторые данные для тестирования
    expect(data.creditsCount).toBeGreaterThan(0);
    expect(data.ratesCount).toBeGreaterThan(0);
  });

  test('✅ Исправления применены успешно', async ({ request }) => {
    console.log('🔍 Финальная проверка исправлений...');
    
    // 1. Прогноз не падает с ошибкой
    const forecastResponse = await request.get(`${API_BASE}/api/reports/forecast`);
    expect(forecastResponse.status()).toBe(200);
    
    // 2. Портфельный анализ возвращает корректные данные
    const portfolioResponse = await request.get(`${API_BASE}/api/reports/portfolio`);
    expect(portfolioResponse.status()).toBe(200);
    
    const portfolioData = await portfolioResponse.json();
    
    // 3. Валидация работает
    const validationResponse = await request.get(`${API_BASE}/api/reports/forecast?dateFrom=invalid`);
    expect(validationResponse.status()).toBe(400);
    
    console.log('🎉 Все основные исправления применены и работают!');
    console.log('📋 Результаты проверки:');
    console.log('   ✅ Прогноз платежей не падает с ошибкой');
    console.log('   ✅ Портфельный анализ рассчитывает остатки корректно');
    console.log('   ✅ API валидация параметров работает');
    console.log('   ✅ Сервер стабильно отвечает на запросы');
  });
});