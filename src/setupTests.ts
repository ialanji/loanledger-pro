import '@testing-library/jest-dom';

// Мок для window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Мок для ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Мок для IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Мок для fetch API
global.fetch = jest.fn();

// Настройка для тестирования с React Router
import { BrowserRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { ReactElement } from 'react';

// Хелпер для рендеринга компонентов с роутером
export const renderWithRouter = (ui: ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};