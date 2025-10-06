#!/usr/bin/env node

/**
 * Скрипт для проверки исправлений в отчетах
 * Проверяет работу сервера и запускает E2E тесты
 */

import { spawn } from 'child_process';
import http from 'http';

const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:5173';

// Функция для проверки доступности сервера
function checkServer(url, name) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${name} сервер работает (${url})`);
        resolve(true);
      } else {
        console.log(`❌ ${name} сервер вернул статус ${res.statusCode}`);
        reject(false);
      }
    });

    req.on('error', (err) => {
      console.log(`❌ ${name} сервер недоступен: ${err.message}`);
      reject(false);
    });

    req.on('timeout', () => {
      console.log(`❌ ${name} сервер не отвечает (timeout)`);
      req.destroy();
      reject(false);
    });

    req.end();
  });
}

// Функция для запуска Playwright тестов
function runPlaywrightTests() {
  return new Promise((resolve, reject) => {
    console.log('\n🚀 Запускаем E2E тесты для проверки исправлений...\n');
    
    const playwright = spawn('npx', ['playwright', 'test', 'tests/e2e/reports-verification.spec.js', '--reporter=line'], {
      stdio: 'inherit',
      shell: true
    });

    playwright.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Все тесты прошли успешно!');
        resolve(true);
      } else {
        console.log(`\n❌ Тесты завершились с кодом ${code}`);
        reject(false);
      }
    });

    playwright.on('error', (err) => {
      console.log(`❌ Ошибка запуска тестов: ${err.message}`);
      reject(false);
    });
  });
}

// Основная функция
async function main() {
  console.log('🔍 Проверка исправлений в отчетах\n');
  
  try {
    // Проверяем доступность backend сервера
    await checkServer(API_BASE, 'Backend API');
    
    // Запускаем тесты
    await runPlaywrightTests();
    
    console.log('\n🎉 Проверка завершена успешно!');
    console.log('\n📋 Результаты:');
    console.log('   ✅ Прогноз платежей показывает данные');
    console.log('   ✅ Портфельный анализ рассчитывает правильные остатки');
    console.log('   ✅ API валидация работает корректно');
    console.log('   ✅ Все исправления применены успешно');
    
  } catch (error) {
    console.log('\n❌ Проверка не удалась');
    console.log('\n🔧 Возможные решения:');
    console.log('   1. Убедитесь, что backend сервер запущен: npm run server');
    console.log('   2. Проверьте подключение к базе данных');
    console.log('   3. Убедитесь, что в базе есть тестовые данные');
    process.exit(1);
  }
}

// Запускаем проверку
main();