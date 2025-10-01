/**
 * Вспомогательные функции для тестов LoanLedger Pro
 */

const { Pool } = require('pg');
const http = require('http');

/**
 * Создание подключения к тестовой базе данных
 */
function createTestDbConnection() {
  return new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DATABASE || 'loanledger_pro_test',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    port: process.env.POSTGRES_PORT || 5432,
  });
}

/**
 * Выполнение HTTP запроса к API
 * @param {string} path - Путь API
 * @param {string} method - HTTP метод
 * @param {Object} data - Данные для отправки
 * @param {number} port - Порт сервера
 * @returns {Promise<Object>} Ответ сервера
 */
function makeApiRequest(path, method = 'GET', data = null, port = 3001) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: jsonBody,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && (method === 'POST' || method === 'PUT')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Создание тестового банка
 * @param {Pool} pool - Подключение к БД
 * @returns {Promise<Object>} Данные созданного банка
 */
async function createTestBank(pool) {
  const result = await pool.query(`
    INSERT INTO banks (name, code, country, currency_code)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, code
  `, ['Test Bank', 'TESTBANK', 'MD', 'MDL']);
  
  return result.rows[0];
}

/**
 * Создание тестового кредита
 * @param {Pool} pool - Подключение к БД
 * @param {number} bankId - ID банка
 * @returns {Promise<Object>} Данные созданного кредита
 */
async function createTestCredit(pool, bankId) {
  const creditData = {
    bank_id: bankId,
    amount: 100000,
    rate: 12.5,
    term: 24,
    method: 'annuity',
    start_date: '2024-01-01'
  };

  const result = await pool.query(`
    INSERT INTO credits (bank_id, amount, rate, term, method, start_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [creditData.bank_id, creditData.amount, creditData.rate, creditData.term, creditData.method, creditData.start_date]);
  
  return result.rows[0];
}

/**
 * Очистка тестовых данных
 * @param {Pool} pool - Подключение к БД
 */
async function cleanupTestData(pool) {
  await pool.query('DELETE FROM payments WHERE credit_id IN (SELECT id FROM credits WHERE bank_id IN (SELECT id FROM banks WHERE code = $1))', ['TESTBANK']);
  await pool.query('DELETE FROM credits WHERE bank_id IN (SELECT id FROM banks WHERE code = $1)', ['TESTBANK']);
  await pool.query('DELETE FROM banks WHERE code = $1', ['TESTBANK']);
}

/**
 * Ожидание определенного времени
 * @param {number} ms - Миллисекунды
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Генерация случайного числа в диапазоне
 * @param {number} min - Минимальное значение
 * @param {number} max - Максимальное значение
 * @returns {number} Случайное число
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Форматирование даты для PostgreSQL
 * @param {Date} date - Дата
 * @returns {string} Отформатированная дата
 */
function formatDateForDb(date) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  createTestDbConnection,
  makeApiRequest,
  createTestBank,
  createTestCredit,
  cleanupTestData,
  sleep,
  randomBetween,
  formatDateForDb
};