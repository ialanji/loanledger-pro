// Jest setup for server-side tests
// This file is run before each test file in the server test suite

// Global test configuration
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);