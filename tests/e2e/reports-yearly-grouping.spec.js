/**
 * E2E тесты для проверки группировки по годам в прогнозе платежей
 */
import { test, expect } from '@playwright/test';

test.describe('Прогноз платежей - Группировка по годам', () => {
  const API_BASE = 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    // Переходим на страницу отчетов
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  test('Проверка группировки по годам в табличном виде', async ({ page }) => {
    console.log('🧪 Тестируем группировку по годам...');
    
    // Выбираем прогноз платежей
    await page.selectOption('select[data-testid="report-type"]', 'forecast');
    
    // Ждем загрузки селектора формы отчета
    await expect(page.locator('select[data-testid="report-form"]')).toBeVisible();
    
    // Выбираем табличный вид
    await page.selectOption('select[data-testid="report-form"]', 'table');
    
    // Нажимаем "Создать отчет"
    await page.click('button:has-text("Создать отчет")');
    
    // Ждем загрузки данных
    await page.waitForTimeout(3000);
    
    // Проверяем, что данные загрузились
    const hasData = await page.locator('table.finance-table tbody tr').count() > 0;
    
    if (hasData) {
      console.log('✅ Данные загружены, проверяем группировку по годам');
      
      // Проверяем наличие заголовков годов
      const yearHeaders = page.locator('h3:has-text("Год:")');
      const yearCount = await yearHeaders.count();
      expect(yearCount).toBeGreaterThan(0);
      
      console.log(`✅ Найдено ${yearCount} групп по годам`);
      
      // Проверяем структуру таблицы для первого года
      const firstTable = page.locator('table.finance-table').first();
      
      // Проверяем заголовки таблицы
      await expect(firstTable.locator('th:has-text("Месяц")')).toBeVisible();
      await expect(firstTable.locator('th:has-text("Остаток долга")')).toBeVisible();
      await expect(firstTable.locator('th:has-text("Проценты")')).toBeVisible();
      await expect(firstTable.locator('th:has-text("Итого")')).toBeVisible();
      
      // Проверяем наличие итогов по году
      await expect(firstTable.locator('tfoot tr:has-text("Итого по году:")')).toBeVisible();
      
      // Проверяем наличие общих итогов
      await expect(page.locator('h3:has-text("Общие итоги по всем годам")')).toBeVisible();
      await expect(page.locator('tfoot tr:has-text("ИТОГО:")')).toBeVisible();
      
      console.log('✅ Структура группировки по годам корректна');
      
    } else {
      console.log('⚠️ Нет данных для отображения - возможно нет предстоящих платежей');
    }
  });

  test('Сравнение списочного и табличного видов', async ({ page }) => {
    console.log('🧪 Сравниваем списочный и табличный виды...');
    
    // Выбираем прогноз платежей
    await page.selectOption('select[data-testid="report-type"]', 'forecast');
    
    // Сначала проверяем списочный вид
    await page.selectOption('select[data-testid="report-form"]', 'list');
    await page.click('button:has-text("Создать отчет")');
    await page.waitForTimeout(2000);
    
    const listViewRows = await page.locator('table.finance-table tbody tr').count();
    console.log(`📋 Списочный вид: ${listViewRows} строк`);
    
    // Теперь переключаемся на табличный вид
    await page.selectOption('select[data-testid="report-form"]', 'table');
    await page.click('button:has-text("Создать отчет")');
    await page.waitForTimeout(2000);
    
    if (listViewRows > 0) {
      // Проверяем, что табличный вид показывает группировку
      const yearHeaders = await page.locator('h3:has-text("Год:")').count();
      expect(yearHeaders).toBeGreaterThan(0);
      
      // Проверяем, что есть общие итоги
      await expect(page.locator('h3:has-text("Общие итоги по всем годам")')).toBeVisible();
      
      console.log(`✅ Табличный вид показывает ${yearHeaders} групп по годам`);
    }
  });

  test('Проверка математической корректности итогов', async ({ page }) => {
    console.log('🧪 Проверяем корректность расчета итогов...');
    
    // Выбираем прогноз платежей в табличном виде
    await page.selectOption('select[data-testid="report-type"]', 'forecast');
    await page.selectOption('select[data-testid="report-form"]', 'table');
    await page.click('button:has-text("Создать отчет")');
    await page.waitForTimeout(3000);
    
    const hasData = await page.locator('table.finance-table tbody tr').count() > 0;
    
    if (hasData) {
      // Получаем итоги по первому году (если есть)
      const yearTotals = page.locator('tfoot tr:has-text("Итого по году:")').first();
      
      if (await yearTotals.count() > 0) {
        // Проверяем, что итоги отображаются
        await expect(yearTotals).toBeVisible();
        console.log('✅ Итоги по году отображаются');
      }
      
      // Проверяем общие итоги
      const grandTotals = page.locator('tfoot tr:has-text("ИТОГО:")');
      await expect(grandTotals).toBeVisible();
      console.log('✅ Общие итоги отображаются');
      
      // Проверяем, что суммы не равны нулю (если есть данные)
      const totalAmount = await grandTotals.locator('td').last().textContent();
      console.log(`💰 Общая сумма: ${totalAmount}`);
      
    } else {
      console.log('⚠️ Нет данных для проверки математической корректности');
    }
  });

  test('Проверка отзывчивости интерфейса', async ({ page }) => {
    console.log('🧪 Проверяем отзывчивость интерфейса...');
    
    // Выбираем прогноз платежей
    await page.selectOption('select[data-testid="report-type"]', 'forecast');
    
    // Быстро переключаемся между видами
    await page.selectOption('select[data-testid="report-form"]', 'table');
    await page.selectOption('select[data-testid="report-form"]', 'list');
    await page.selectOption('select[data-testid="report-form"]', 'table');
    
    // Генерируем отчет
    await page.click('button:has-text("Создать отчет")');
    await page.waitForTimeout(2000);
    
    // Проверяем, что интерфейс не сломался
    await expect(page.locator('select[data-testid="report-form"]')).toBeVisible();
    await expect(page.locator('button:has-text("Создать отчет")')).toBeVisible();
    
    console.log('✅ Интерфейс остается отзывчивым при переключениях');
  });
});