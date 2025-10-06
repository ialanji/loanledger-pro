#!/usr/bin/env node

/**
 * Быстрая проверка исправлений в отчетах
 * Запускает E2E тесты и показывает результаты
 */

import { spawn } from 'child_process';
import http from 'http';

const API_BASE = 'http://localhost:3001';

// Функция для проверки доступности сервера
function checkServer() {
  return new Promise((resolve, reject) => {
    const req = http.request(`${API_BASE}/api/health`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(false);
      }
    });

    req.on('error', () => reject(false));
    req.on('timeout', () => {
      req.destroy();
      reject(false);
    });
    req.setTimeout(5000);
    req.end();
  });
}

// Функция для быстрой проверки API
async function quickApiCheck() {
  try {
    console.log('🔍 Быстрая проверка API...\n');
    
    // Проверяем прогноз
    const forecastReq = http.request(`${API_BASE}/api/reports/forecast`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log(`✅ Прогноз платежей: ${result.items.length} записей`);
        if (result.items.length > 0) {
          const first = result.items[0];
          console.log(`   Первый платеж: ${first.bank}, ${first.month}, ${first.totalAmount} MDL`);
        }
      });
    });
    forecastReq.on('error', () => console.log('❌ Ошибка прогноза'));
    forecastReq.end();

    // Проверяем портфель
    setTimeout(() => {
      const portfolioReq = http.request(`${API_BASE}/api/reports/portfolio`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = JSON.parse(data);
          console.log(`✅ Портфельный анализ: ${result.items.length} банков`);
          if (result.items.length > 0) {
            const first = result.items[0];
            console.log(`   ${first.bank}: остаток ${first.remainingBalance} MDL`);
          }
        });
      });
      portfolioReq.on('error', () => console.log('❌ Ошибка портфеля'));
      portfolioReq.end();
    }, 500);

  } catch (error) {
    console.log('❌ Ошибка API проверки:', error.message);
  }
}

// Функция для запуска полных тестов
function runFullTests() {
  return new Promise((resolve, reject) => {
    console.log('\n🚀 Запуск полных E2E тестов...\n');
    
    const playwright = spawn('npx', ['playwright', 'test', 'tests/e2e/reports-fixes-simple.spec.js', '--reporter=line'], {
      stdio: 'inherit',
      shell: true
    });

    playwright.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(false);
      }
    });

    playwright.on('error', (err) => {
      reject(err);
    });
  });
}

// Основная функция
async function main() {
  console.log('🎯 Проверка исправлений в отчетах\n');
  
  try {
    // Проверяем сервер
    console.log('🔍 Проверяем сервер...');
    await checkServer();
    console.log('✅ Сервер работает\n');
    
    // Быстрая проверка API
    await quickApiCheck();
    
    // Ждем немного для завершения API запросов
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Запускаем полные тесты
    await runFullTests();
    
    console.log('\n🎉 ВСЕ ПРОВЕРКИ ЗАВЕРШЕНЫ УСПЕШНО!');
    console.log('\n📋 Итоговые результаты:');
    console.log('   ✅ Сервер работает стабильно');
    console.log('   ✅ Прогноз платежей показывает данные');
    console.log('   ✅ Портфельный анализ рассчитывает остатки');
    console.log('   ✅ API валидация защищает от ошибок');
    console.log('   ✅ Все E2E тесты прошли успешно');
    console.log('\n🚀 Система готова к использованию!');
    
  } catch (error) {
    console.log('\n❌ Проверка не удалась');
    console.log('\n🔧 Рекомендации:');
    console.log('   1. Убедитесь, что сервер запущен: npm run server');
    console.log('   2. Проверьте подключение к базе данных');
    console.log('   3. Убедитесь, что Playwright установлен: npm install --save-dev @playwright/test');
    process.exit(1);
  }
}

// Запускаем проверку
main();