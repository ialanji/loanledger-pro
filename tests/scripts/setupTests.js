// Настройка для тестирования API
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/loanledger_test';

// Мок для базы данных
const mockDb = {
  query: jest.fn(),
  end: jest.fn()
};

// Глобальные моки
global.console = {
  ...console,
  // Отключаем логи в тестах, кроме ошибок
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error
};

// Хелпер для очистки моков после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});

module.exports = {
  mockDb
};