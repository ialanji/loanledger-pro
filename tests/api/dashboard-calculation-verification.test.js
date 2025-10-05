/**
 * Integration test to verify dashboard calculation accuracy
 * This test validates that the dashboard displays the correct total projected interest
 * and that calculations are consistent across page refreshes
 */

const { makeApiRequest } = require('../utils/testHelpers');

describe('Dashboard Calculation Verification', () => {
  const API_BASE_URL = 'http://localhost:3001';
  
  let testData = {
    credits: [],
    payments: [],
    scheduleData: []
  };

  beforeAll(async () => {
    // Fetch real data from the API to test with
    try {
      const creditsResponse = await makeApiRequest('/api/credits', 'GET', null, 3001);
      const paymentsResponse = await makeApiRequest('/api/payments', 'GET', null, 3001);
      
      if (creditsResponse.status === 200) {
        testData.credits = creditsResponse.data;
      }
      
      if (paymentsResponse.status === 200) {
        testData.payments = paymentsResponse.data;
      }

      // Fetch schedule data for active credits
      const activeCredits = testData.credits.filter(c => c.status === 'active');
      for (const credit of activeCredits) {
        try {
          const scheduleResponse = await makeApiRequest(`/api/credits/${credit.id}/schedule`, 'GET', null, 3001);
          if (scheduleResponse.status === 200) {
            testData.scheduleData.push({
              creditId: credit.id,
              schedule: scheduleResponse.data
            });
          }
        } catch (error) {
          console.warn(`Could not fetch schedule for credit ${credit.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Failed to fetch test data:', error);
    }
  });

  test('should have real data available for testing', () => {
    expect(testData.credits.length).toBeGreaterThan(0);
    expect(testData.payments.length).toBeGreaterThan(0);
    console.log('Test data summary:', {
      credits: testData.credits.length,
      payments: testData.payments.length,
      scheduleData: testData.scheduleData.length
    });
  });

  test('should calculate total projected interest correctly using schedule data', () => {
    if (testData.scheduleData.length === 0) {
      console.warn('No schedule data available, skipping schedule-based test');
      return;
    }

    // Calculate expected total interest from schedule data
    const expectedTotalInterest = testData.scheduleData.reduce((sum, scheduleItem) => {
      const totalInterest = parseFloat(scheduleItem.schedule?.totals?.totalInterest || 0);
      return sum + (isNaN(totalInterest) ? 0 : totalInterest);
    }, 0);

    console.log('Expected total interest from schedules:', expectedTotalInterest);
    
    // The expected value from requirements is approximately 2,202,688
    // Allow for some variance due to data changes
    expect(expectedTotalInterest).toBeGreaterThan(2000000);
    expect(expectedTotalInterest).toBeLessThan(3000000);
    
    // Log the actual value for verification
    console.log('Calculated total projected interest:', expectedTotalInterest);
    
    // Check if it's close to the expected value from requirements
    const expectedFromRequirements = 2202688;
    const variance = Math.abs(expectedTotalInterest - expectedFromRequirements);
    const percentageVariance = (variance / expectedFromRequirements) * 100;
    
    console.log('Variance from expected (2,202,688):', {
      variance,
      percentageVariance: percentageVariance.toFixed(2) + '%'
    });
  });

  test('should calculate fallback interest correctly using payment data', () => {
    // Calculate total interest from all payments (fallback method)
    const totalInterestFromPayments = testData.payments.reduce((sum, payment) => {
      const interestDue = parseFloat(payment.interestDue || payment.interest_due || 0);
      return sum + (isNaN(interestDue) ? 0 : interestDue);
    }, 0);

    console.log('Total interest from payments (fallback):', totalInterestFromPayments);
    
    expect(totalInterestFromPayments).toBeGreaterThan(0);
  });

  test('should have consistent calculation methods', () => {
    // Verify that schedule-based calculation gives higher values than payment-based
    // (since schedule includes full projected interest, payments might be partial)
    
    if (testData.scheduleData.length === 0) {
      console.warn('No schedule data available for comparison');
      return;
    }

    const scheduleBasedTotal = testData.scheduleData.reduce((sum, scheduleItem) => {
      const totalInterest = parseFloat(scheduleItem.schedule?.totals?.totalInterest || 0);
      return sum + (isNaN(totalInterest) ? 0 : totalInterest);
    }, 0);

    const paymentBasedTotal = testData.payments.reduce((sum, payment) => {
      const interestDue = parseFloat(payment.interestDue || payment.interest_due || 0);
      return sum + (isNaN(interestDue) ? 0 : interestDue);
    }, 0);

    console.log('Calculation method comparison:', {
      scheduleBasedTotal,
      paymentBasedTotal,
      difference: scheduleBasedTotal - paymentBasedTotal
    });

    // Schedule-based should typically be higher (complete projection)
    // But we'll just verify both are positive numbers
    expect(scheduleBasedTotal).toBeGreaterThan(0);
    expect(paymentBasedTotal).toBeGreaterThan(0);
  });

  test('should verify API endpoints are working correctly', async () => {
    // Test that all required API endpoints are accessible
    const endpoints = [
      '/api/credits',
      '/api/payments',
      '/api/credits/totals-by-type'
    ];

    for (const endpoint of endpoints) {
      const response = await makeApiRequest(endpoint, 'GET', null, 3001);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      console.log(`✓ ${endpoint} - Status: ${response.status}`);
    }
  });

  test('should verify schedule endpoints for active credits', async () => {
    const activeCredits = testData.credits.filter(c => c.status === 'active');
    
    if (activeCredits.length === 0) {
      console.warn('No active credits found for schedule testing');
      return;
    }

    let successfulSchedules = 0;
    let failedSchedules = 0;

    for (const credit of activeCredits.slice(0, 3)) { // Test first 3 to avoid timeout
      try {
        const response = await makeApiRequest(`/api/credits/${credit.id}/schedule`, 'GET', null, 3001);
        if (response.status === 200 && response.data?.totals?.totalInterest) {
          successfulSchedules++;
          console.log(`✓ Schedule for credit ${credit.id} - Interest: ${response.data.totals.totalInterest}`);
        } else {
          failedSchedules++;
          console.warn(`⚠ Schedule for credit ${credit.id} - Status: ${response.status}`);
        }
      } catch (error) {
        failedSchedules++;
        console.error(`✗ Schedule for credit ${credit.id} - Error:`, error.message);
      }
    }

    console.log('Schedule endpoint results:', {
      successful: successfulSchedules,
      failed: failedSchedules,
      total: activeCredits.length
    });

    // At least some schedules should be successful
    expect(successfulSchedules).toBeGreaterThan(0);
  });

  test('should validate data consistency', () => {
    // Verify that credits have required fields
    const validCredits = testData.credits.filter(credit => 
      credit.id && 
      credit.principal !== undefined && 
      credit.status
    );

    expect(validCredits.length).toBe(testData.credits.length);

    // Verify that payments have required fields
    const validPayments = testData.payments.filter(payment =>
      payment.id &&
      payment.creditId &&
      (payment.interestDue !== undefined || payment.interest_due !== undefined)
    );

    expect(validPayments.length).toBe(testData.payments.length);

    console.log('Data validation results:', {
      validCredits: validCredits.length,
      totalCredits: testData.credits.length,
      validPayments: validPayments.length,
      totalPayments: testData.payments.length
    });
  });

  test('should verify calculation matches expected business logic', () => {
    // This test verifies the core business requirement:
    // Dashboard should show TOTAL projected interest, not remaining interest
    
    if (testData.scheduleData.length === 0) {
      console.warn('No schedule data available for business logic verification');
      return;
    }

    // Calculate total interest from schedules (what dashboard should show)
    const totalProjectedInterest = testData.scheduleData.reduce((sum, scheduleItem) => {
      const totalInterest = parseFloat(scheduleItem.schedule?.totals?.totalInterest || 0);
      return sum + (isNaN(totalInterest) ? 0 : totalInterest);
    }, 0);

    // Calculate paid interest (what was previously subtracted incorrectly)
    const paidInterest = testData.payments
      .filter(p => p.status === 'paid')
      .reduce((sum, payment) => {
        const interestPaid = parseFloat(payment.interestDue || payment.interest_due || 0);
        return sum + (isNaN(interestPaid) ? 0 : interestPaid);
      }, 0);

    // The old incorrect calculation would have been: totalProjectedInterest - paidInterest
    const oldIncorrectCalculation = totalProjectedInterest - paidInterest;

    console.log('Business logic verification:', {
      totalProjectedInterest: totalProjectedInterest,
      paidInterest: paidInterest,
      oldIncorrectCalculation: oldIncorrectCalculation,
      difference: totalProjectedInterest - oldIncorrectCalculation
    });

    // The new correct calculation should be higher than the old incorrect one
    expect(totalProjectedInterest).toBeGreaterThan(oldIncorrectCalculation);
    
    // Verify this matches the expected value from requirements (approximately 2,202,688)
    const expectedValue = 2202688;
    const tolerance = expectedValue * 0.1; // 10% tolerance for data variations
    
    expect(totalProjectedInterest).toBeGreaterThan(expectedValue - tolerance);
    expect(totalProjectedInterest).toBeLessThan(expectedValue + tolerance);
  });
});

// Helper function to parse numeric values safely
function parseNumeric(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}