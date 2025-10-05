import { calculateDashboardStats, parseNumeric, ScheduleData } from '../dashboardCalculations';
import { DashboardStats } from '@/types/credit';

// Mock console methods to avoid cluttering test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('parseNumeric', () => {
  test('should parse valid numbers correctly', () => {
    expect(parseNumeric(100)).toBe(100);
    expect(parseNumeric(100.5)).toBe(100.5);
    expect(parseNumeric('100')).toBe(100);
    expect(parseNumeric('100.5')).toBe(100.5);
  });

  test('should handle invalid inputs gracefully', () => {
    expect(parseNumeric(null)).toBe(0);
    expect(parseNumeric(undefined)).toBe(0);
    expect(parseNumeric('')).toBe(0);
    expect(parseNumeric('invalid')).toBe(0);
    expect(parseNumeric({})).toBe(0);
    expect(parseNumeric([])).toBe(0);
  });

  test('should handle edge cases', () => {
    expect(parseNumeric('0')).toBe(0);
    expect(parseNumeric(0)).toBe(0);
    expect(parseNumeric('-100')).toBe(-100);
    expect(parseNumeric(-100)).toBe(-100);
  });
});

describe('calculateDashboardStats', () => {
  // Mock data for testing
  const mockCredits = [
    {
      id: '1',
      principal: 100000,
      status: 'active'
    },
    {
      id: '2', 
      principal: 200000,
      status: 'active'
    },
    {
      id: '3',
      principal: 50000,
      status: 'closed'
    }
  ];

  const mockPayments = [
    {
      id: 'p1',
      creditId: '1',
      dueDate: '2024-12-15',
      principalDue: 5000,
      interestDue: 1000,
      totalDue: 6000,
      status: 'paid'
    },
    {
      id: 'p2',
      creditId: '1',
      dueDate: '2024-12-20',
      principalDue: 5000,
      interestDue: 950,
      totalDue: 5950,
      status: 'scheduled'
    },
    {
      id: 'p3',
      creditId: '2',
      dueDate: '2024-11-15',
      principalDue: 8000,
      interestDue: 2000,
      totalDue: 10000,
      status: 'overdue'
    }
  ];

  const mockScheduleData: ScheduleData[] = [
    {
      creditId: '1',
      schedule: {
        totals: {
          totalInterest: 25000
        }
      }
    },
    {
      creditId: '2',
      schedule: {
        totals: {
          totalInterest: 45000
        }
      }
    }
  ];

  describe('with schedule data available', () => {
    test('should calculate stats using schedule-based method', () => {
      const result = calculateDashboardStats(mockCredits, mockPayments, mockScheduleData);

      expect(result).toEqual({
        totalCredits: 3,
        activeCredits: 2,
        totalPrincipal: 350000, // 100000 + 200000 + 50000
        remainingPrincipal: 345000, // 350000 - 5000 (only paid principal, overdue doesn't reduce remaining)
        projectedInterest: 70000, // 25000 + 45000 from schedule data
        thisMonthDue: expect.any(Number),
        thisMonthPrincipal: expect.any(Number),
        thisMonthInterest: expect.any(Number),
        overdueAmount: 10000, // p3 total due
        totalPaid: 5000 // Only paid principal payments count toward totalPaid
      });
    });

    test('should use total interest from schedules without subtracting paid interest', () => {
      const result = calculateDashboardStats(mockCredits, mockPayments, mockScheduleData);
      
      // Should be exactly the sum of schedule totals, not reduced by paid interest
      expect(result.projectedInterest).toBe(70000);
    });
  });

  describe('without schedule data (fallback method)', () => {
    test('should calculate stats using payment-based method', () => {
      const result = calculateDashboardStats(mockCredits, mockPayments, []);

      expect(result).toEqual({
        totalCredits: 3,
        activeCredits: 2,
        totalPrincipal: 350000,
        remainingPrincipal: 345000,
        projectedInterest: 3950, // 1000 + 950 + 2000 from payments
        thisMonthDue: expect.any(Number),
        thisMonthPrincipal: expect.any(Number),
        thisMonthInterest: expect.any(Number),
        overdueAmount: 10000,
        totalPaid: 5000
      });
    });

    test('should handle undefined schedule data', () => {
      const result = calculateDashboardStats(mockCredits, mockPayments, undefined);
      
      expect(result.projectedInterest).toBe(3950);
      expect(result.totalCredits).toBe(3);
    });
  });

  describe('numeric parsing with various input types', () => {
    test('should handle string numeric values in credits', () => {
      const creditsWithStrings = [
        { id: '1', principal: '100000', status: 'active' },
        { id: '2', principal: '200000.50', status: 'active' }
      ];

      const result = calculateDashboardStats(creditsWithStrings, [], []);
      expect(result.totalPrincipal).toBe(300000.5);
    });

    test('should handle string numeric values in payments', () => {
      const paymentsWithStrings = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: '2024-12-15',
          principalDue: '5000',
          interestDue: '1000',
          totalDue: '6000',
          status: 'paid'
        }
      ];

      const result = calculateDashboardStats(mockCredits, paymentsWithStrings, []);
      expect(result.totalPaid).toBe(5000);
      expect(result.projectedInterest).toBe(1000);
    });

    test('should handle mixed field names (camelCase and snake_case)', () => {
      const paymentsWithSnakeCase = [
        {
          id: 'p1',
          creditId: '1',
          due_date: '2024-12-15',
          principal_due: 5000,
          interest_due: 1000,
          total_due: 6000,
          status: 'paid'
        }
      ];

      const result = calculateDashboardStats(mockCredits, paymentsWithSnakeCase, []);
      expect(result.totalPaid).toBe(5000);
      expect(result.projectedInterest).toBe(1000);
    });
  });

  describe('edge cases with empty or invalid data', () => {
    test('should handle empty credits array', () => {
      const result = calculateDashboardStats([], mockPayments, []);
      
      expect(result.totalCredits).toBe(0);
      expect(result.activeCredits).toBe(0);
      expect(result.totalPrincipal).toBe(0);
      expect(result.remainingPrincipal).toBe(0);
    });

    test('should handle empty payments array', () => {
      const result = calculateDashboardStats(mockCredits, [], mockScheduleData);
      
      expect(result.totalPaid).toBe(0);
      expect(result.thisMonthDue).toBe(0);
      expect(result.overdueAmount).toBe(0);
      expect(result.projectedInterest).toBe(70000); // From schedule data
    });

    test('should handle credits with invalid principal values', () => {
      const invalidCredits = [
        { id: '1', principal: null, status: 'active' },
        { id: '2', principal: 'invalid', status: 'active' },
        { id: '3', principal: undefined, status: 'active' }
      ];

      const result = calculateDashboardStats(invalidCredits, [], []);
      expect(result.totalPrincipal).toBe(0);
    });

    test('should handle payments with invalid numeric values', () => {
      const invalidPayments = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: '2024-12-15',
          principalDue: null,
          interestDue: 'invalid',
          totalDue: undefined,
          status: 'paid'
        }
      ];

      const result = calculateDashboardStats(mockCredits, invalidPayments, []);
      expect(result.totalPaid).toBe(0);
      expect(result.projectedInterest).toBe(0);
    });

    test('should handle payments with invalid dates', () => {
      const invalidDatePayments = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: 'invalid-date',
          principalDue: 5000,
          interestDue: 1000,
          totalDue: 6000,
          status: 'scheduled'
        },
        {
          id: 'p2',
          creditId: '1',
          dueDate: null,
          principalDue: 3000,
          interestDue: 500,
          totalDue: 3500,
          status: 'scheduled'
        }
      ];

      const result = calculateDashboardStats(mockCredits, invalidDatePayments, []);
      
      // Should not include payments with invalid dates in monthly calculations
      expect(result.thisMonthDue).toBe(0);
      expect(result.thisMonthPrincipal).toBe(0);
      expect(result.thisMonthInterest).toBe(0);
    });

    test('should handle schedule data with missing totals', () => {
      const incompleteScheduleData: ScheduleData[] = [
        {
          creditId: '1',
          schedule: {} // Missing totals
        },
        {
          creditId: '2',
          schedule: {
            totals: {} // Missing totalInterest
          }
        }
      ];

      const result = calculateDashboardStats(mockCredits, mockPayments, incompleteScheduleData);
      expect(result.projectedInterest).toBe(0); // Should default to 0 when totals are missing
    });
  });

  describe('monthly calculations', () => {
    test('should correctly identify current month payments', () => {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const thisMonthPayments = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: new Date(currentYear, currentMonth, 15).toISOString(),
          principalDue: 5000,
          interestDue: 1000,
          totalDue: 6000,
          status: 'scheduled'
        },
        {
          id: 'p2',
          creditId: '1',
          dueDate: new Date(currentYear, currentMonth, 25).toISOString(),
          principalDue: 3000,
          interestDue: 500,
          totalDue: 3500,
          status: 'pending'
        }
      ];

      const result = calculateDashboardStats(mockCredits, thisMonthPayments, []);
      
      expect(result.thisMonthDue).toBe(9500); // 6000 + 3500
      expect(result.thisMonthPrincipal).toBe(8000); // 5000 + 3000
      expect(result.thisMonthInterest).toBe(1500); // 1000 + 500
    });

    test('should exclude payments from other months', () => {
      const otherMonthPayments = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: '2024-01-15', // Different month
          principalDue: 5000,
          interestDue: 1000,
          totalDue: 6000,
          status: 'scheduled'
        }
      ];

      const result = calculateDashboardStats(mockCredits, otherMonthPayments, []);
      
      expect(result.thisMonthDue).toBe(0);
      expect(result.thisMonthPrincipal).toBe(0);
      expect(result.thisMonthInterest).toBe(0);
    });
  });

  describe('overdue calculations', () => {
    test('should correctly calculate overdue amounts', () => {
      const overduePayments = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: '2024-11-15',
          principalDue: 5000,
          interestDue: 1000,
          totalDue: 6000,
          status: 'overdue'
        },
        {
          id: 'p2',
          creditId: '2',
          dueDate: '2024-10-20',
          principalDue: 3000,
          interestDue: 500,
          totalDue: 3500,
          status: 'overdue'
        }
      ];

      const result = calculateDashboardStats(mockCredits, overduePayments, []);
      expect(result.overdueAmount).toBe(9500); // 6000 + 3500
    });

    test('should exclude non-overdue payments from overdue calculation', () => {
      const mixedStatusPayments = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: '2024-11-15',
          principalDue: 5000,
          interestDue: 1000,
          totalDue: 6000,
          status: 'overdue'
        },
        {
          id: 'p2',
          creditId: '2',
          dueDate: '2024-10-20',
          principalDue: 3000,
          interestDue: 500,
          totalDue: 3500,
          status: 'paid'
        }
      ];

      const result = calculateDashboardStats(mockCredits, mixedStatusPayments, []);
      expect(result.overdueAmount).toBe(6000); // Only the overdue payment
    });
  });

  describe('validation and error handling', () => {
    test('should ensure non-negative remaining principal', () => {
      const highPayments = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: '2024-12-15',
          principalDue: 400000, // More than total principal
          interestDue: 1000,
          totalDue: 401000,
          status: 'paid'
        }
      ];

      const result = calculateDashboardStats(mockCredits, highPayments, []);
      expect(result.remainingPrincipal).toBe(0); // Should be clamped to 0, not negative
    });

    test('should handle calculation errors gracefully', () => {
      // This test ensures the function doesn't throw errors with problematic data
      const problematicData = [
        {
          id: 'p1',
          creditId: '1',
          dueDate: '2024-12-15',
          principalDue: Infinity,
          interestDue: NaN,
          totalDue: -1,
          status: 'paid'
        }
      ];

      expect(() => {
        calculateDashboardStats(mockCredits, problematicData, []);
      }).not.toThrow();
    });
  });
});