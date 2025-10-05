import { DashboardStats, Credit, Payment } from '@/types/credit';

/**
 * Helper function to safely parse numeric values
 */
export const parseNumeric = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Interface for schedule data used in calculations
 */
export interface ScheduleData {
  creditId: string;
  schedule?: {
    totals?: {
      totalInterest?: number;
    };
  };
}

/**
 * Calculate dashboard statistics from credits, payments, and schedule data
 * @param credits - Array of credit objects
 * @param payments - Array of payment objects
 * @param allScheduleData - Optional array of schedule data for interest calculations
 * @param historicalPayments - Optional array of actual historical payments for accurate paid interest calculation
 * @returns DashboardStats object with calculated values
 */
export const calculateDashboardStats = (
  credits: any[], 
  payments: any[], 
  allScheduleData?: ScheduleData[],
  historicalPayments?: any[]
): DashboardStats => {
  console.log('=== DASHBOARD INTEREST CALCULATION START ===');
  console.log('calculateDashboardStats input:', { 
    creditsCount: credits.length, 
    paymentsCount: payments.length, 
    scheduleDataCount: allScheduleData?.length || 0,
    historicalPaymentsCount: historicalPayments?.length || 0
  });
  
  // Log data source usage for debugging and verification
  console.log('Data source analysis:', {
    hasHistoricalPayments: !!(historicalPayments && historicalPayments.length > 0),
    hasScheduleData: !!(allScheduleData && allScheduleData.length > 0),
    dataSourcePriority: historicalPayments && historicalPayments.length > 0 ? 'historical-payments' : 'scheduled-payments',
    calculationMethod: allScheduleData && allScheduleData.length > 0 ? 'schedule-based' : 'payment-based'
  });
  
  const activeCredits = credits.filter(c => c.status === 'active');
  console.log('Active credits:', activeCredits);
  
  // Parse string values to numbers to prevent NaN
  const totalPrincipal = credits.reduce((sum, credit) => {
    const principal = parseNumeric(credit.principal);
    console.log('Credit principal:', { original: credit.principal, parsed: principal });
    return sum + principal;
  }, 0);
  
  console.log('Total principal calculated:', totalPrincipal);
  
  // Calculate remaining principal - only count PRINCIPAL payments, not interest
  const totalPrincipalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, payment) => {
      // Only count principal_due, not interest_due or total_due
      const principalPaid = parseNumeric(payment.principalDue || payment.principal_due);
      console.log('Principal payment:', { original: payment.principal_due, parsed: principalPaid });
      return sum + principalPaid;
    }, 0);
  
  console.log('Total principal paid calculated:', totalPrincipalPaid);
  
  const remainingPrincipal = totalPrincipal - totalPrincipalPaid;
  
  // Calculate total projected interest from schedule data for ALL credits
  let totalProjectedInterest = 0;
  
  console.log('--- INTEREST CALCULATION PHASE ---');
  console.log('Schedule data availability check:', {
    hasScheduleData: !!(allScheduleData && allScheduleData.length > 0),
    scheduleDataLength: allScheduleData?.length || 0,
    activeCreditsCount: activeCredits.length
  });
  
  if (allScheduleData && allScheduleData.length > 0) {
    console.log('Using SCHEDULE-BASED calculation method');
    
    // Log each credit's schedule data for debugging
    allScheduleData.forEach((scheduleItem, index) => {
      const totalInterest = parseNumeric(scheduleItem.schedule?.totals?.totalInterest || 0);
      console.log(`Schedule ${index + 1} - Credit ${scheduleItem.creditId}:`, {
        creditId: scheduleItem.creditId,
        totalInterest,
        hasSchedule: !!scheduleItem.schedule,
        hasTotals: !!scheduleItem.schedule?.totals,
        rawTotalInterest: scheduleItem.schedule?.totals?.totalInterest
      });
    });
    
    // Sum up total interest from all credit schedules - this is the total interest cost
    const totalInterestFromAllSchedules = allScheduleData.reduce((sum, scheduleItem, index) => {
      const totalInterest = parseNumeric(scheduleItem.schedule?.totals?.totalInterest || 0);
      const newSum = sum + totalInterest;
      console.log(`Accumulating interest ${index + 1}:`, {
        creditId: scheduleItem.creditId,
        interestAmount: totalInterest,
        runningTotal: newSum
      });
      return newSum;
    }, 0);
    
    // Calculate already paid interest using historical payments if available, otherwise fall back to scheduled payments
    let paidInterest = 0;
    
    if (historicalPayments && historicalPayments.length > 0) {
      console.log('Using HISTORICAL PAYMENTS for paid interest calculation');
      
      // Use actual historical payments from payments table
      paidInterest = historicalPayments
        .filter(p => p.status === 'paid' || !p.status) // Include payments without status (assume paid)
        .reduce((sum, payment, index) => {
          const interestAmount = parseNumeric(payment.interest_amount);
          if (index < 5) { // Log first few for debugging
            console.log(`Historical payment ${index + 1}:`, {
              paymentId: payment.id,
              creditId: payment.credit_id,
              paymentDate: payment.payment_date,
              interestAmount,
              rawInterestAmount: payment.interest_amount
            });
          }
          return sum + interestAmount;
        }, 0);
      
      console.log('Historical payments paid interest calculation:', {
        totalHistoricalPayments: historicalPayments.length,
        paidPayments: historicalPayments.filter(p => p.status === 'paid' || !p.status).length,
        totalPaidInterest: paidInterest,
        dataSource: 'historical-payments-table'
      });
    } else {
      console.log('Using SCHEDULED PAYMENTS fallback for paid interest calculation');
      
      // Fallback: Calculate already paid/accrued interest (all payments with dueDate in the past or today)
      const today = new Date();
      paidInterest = payments
        .filter(p => {
          const due = new Date(p.dueDate || p.due_date);
          return !isNaN(due.getTime()) && due <= today;
        })
        .reduce((sum, payment) => {
          const interestPortion = parseNumeric(payment.interestDue || payment.interest_due);
          return sum + interestPortion;
        }, 0);
      
      console.log('Scheduled payments paid interest calculation:', {
        totalScheduledPayments: payments.length,
        pastDuePayments: payments.filter(p => {
          const due = new Date(p.dueDate || p.due_date);
          return !isNaN(due.getTime()) && due <= new Date();
        }).length,
        totalPaidInterest: paidInterest,
        dataSource: 'scheduled-payments-fallback'
      });
    }

    // Corrected projected interest formula: total interest from schedules minus actual paid interest from historical payments
    // Ensure result is non-negative using Math.max(0, calculation)
    totalProjectedInterest = Math.max(0, totalInterestFromAllSchedules - paidInterest);

    // Add comprehensive logging for debugging and verification
    console.log('=== CORRECTED PROJECTED INTEREST CALCULATION ===');
    console.log('Formula: Math.max(0, totalInterestFromSchedules - actualPaidInterest)');
    console.log('Calculation breakdown:', {
      totalInterestFromSchedules: totalInterestFromAllSchedules,
      actualPaidInterest: paidInterest,
      rawCalculation: totalInterestFromAllSchedules - paidInterest,
      finalProjectedInterest: totalProjectedInterest,
      wasNegative: (totalInterestFromAllSchedules - paidInterest) < 0,
      dataSource: historicalPayments && historicalPayments.length > 0 ? 'historical-payments' : 'scheduled-payments'
    });

    console.log('SCHEDULE-BASED calculation complete:', {
      totalInterestFromAllSchedules,
      paidInterest,
      calculationMethod: 'schedule-based',
      totalProjectedInterest,
      creditsProcessed: allScheduleData.length,
      formula: 'Math.max(0, totalScheduledInterest - actualPaidInterest)'
    });
  } else {
    console.log('Using PAYMENT-BASED fallback calculation method');
    console.log('Fallback reason:', {
      noScheduleData: !allScheduleData,
      emptyScheduleData: allScheduleData && allScheduleData.length === 0,
      paymentsAvailable: payments.length
    });
    
    // Log payment data for debugging
    const interestPayments = payments.map(payment => ({
      id: payment.id,
      creditId: payment.creditId,
      interestDue: parseNumeric(payment.interestDue || payment.interest_due),
      rawInterestDue: payment.interestDue || payment.interest_due,
      status: payment.status
    }));
    
    console.log('Payment interest breakdown:', interestPayments.slice(0, 5)); // Log first 5 for brevity
    if (interestPayments.length > 5) {
      console.log(`... and ${interestPayments.length - 5} more payments`);
    }
    
    // Fallback: calculate total projected interest from all payments
    totalProjectedInterest = payments
      .reduce((sum, payment, index) => {
        const interestDue = parseNumeric(payment.interestDue || payment.interest_due);
        if (index < 5) { // Log first few for debugging
          console.log(`Payment ${index + 1} interest:`, {
            paymentId: payment.id,
            interestDue,
            runningTotal: sum + interestDue
          });
        }
        return sum + interestDue;
      }, 0);
    
    console.log('PAYMENT-BASED calculation complete:', {
      totalProjectedInterest,
      calculationMethod: 'payment-based',
      paymentsProcessed: payments.length
    });
  }

  // Calculate this month's payments - include all payments for current month
  console.log('--- MONTHLY CALCULATIONS PHASE ---');
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  console.log('Current date analysis:', { 
    currentMonth, 
    currentYear, 
    currentDate: currentDate.toISOString(),
    monthName: currentDate.toLocaleString('default', { month: 'long' })
  });
  
  // Add error handling for date parsing
  const thisMonthPayments = payments.filter((p, index) => {
    try {
      const dueDate = new Date(p.dueDate || p.due_date);
      
      // Check for invalid dates
      if (isNaN(dueDate.getTime())) {
        console.warn(`Invalid date for payment ${p.id}:`, p.dueDate || p.due_date);
        return false;
      }
      
      const paymentMonth = dueDate.getMonth();
      const paymentYear = dueDate.getFullYear();
      const matches = paymentMonth === currentMonth && paymentYear === currentYear;
      
      if (index < 3 || matches) { // Log first few and all matches
        console.log(`Payment ${index + 1} date check:`, {
          paymentId: p.id,
          dueDate: p.dueDate || p.due_date,
          parsedDate: dueDate.toISOString(),
          paymentMonth,
          paymentYear,
          status: p.status,
          matches
        });
      }
      
      return matches;
    } catch (error) {
      console.error(`Error processing payment ${p.id} date:`, error, {
        rawDate: p.dueDate || p.due_date
      });
      return false;
    }
  });
  
  console.log('Monthly payments filtering complete:', {
    totalPayments: payments.length,
    thisMonthPayments: thisMonthPayments.length,
    monthlyPaymentIds: thisMonthPayments.map(p => p.id)
  });
  
  // Calculate monthly totals with detailed logging
  console.log('--- MONTHLY TOTALS CALCULATION ---');
  
  const thisMonthDue = thisMonthPayments.reduce((sum, payment, index) => {
    const totalDue = parseNumeric(payment.totalDue || payment.total_due);
    const newSum = sum + totalDue;
    
    console.log(`Monthly payment ${index + 1}:`, {
      paymentId: payment.id,
      totalDue,
      rawTotalDue: payment.totalDue || payment.total_due,
      runningTotal: newSum
    });
    
    return newSum;
  }, 0);
  
  // Calculate principal and interest for current month with error handling
  const thisMonthPrincipal = thisMonthPayments.reduce((sum, payment, index) => {
    try {
      const principalDue = parseNumeric(payment.principalDue || payment.principal_due);
      if (index < 3) { // Log first few
        console.log(`Monthly principal ${index + 1}:`, {
          paymentId: payment.id,
          principalDue,
          rawPrincipalDue: payment.principalDue || payment.principal_due
        });
      }
      return sum + principalDue;
    } catch (error) {
      console.error(`Error calculating principal for payment ${payment.id}:`, error);
      return sum;
    }
  }, 0);
  
  const thisMonthInterest = thisMonthPayments.reduce((sum, payment, index) => {
    try {
      const interestDue = parseNumeric(payment.interestDue || payment.interest_due);
      if (index < 3) { // Log first few
        console.log(`Monthly interest ${index + 1}:`, {
          paymentId: payment.id,
          interestDue,
          rawInterestDue: payment.interestDue || payment.interest_due
        });
      }
      return sum + interestDue;
    } catch (error) {
      console.error(`Error calculating interest for payment ${payment.id}:`, error);
      return sum;
    }
  }, 0);
  
  // Calculate overdue amount with comprehensive logging
  console.log('--- OVERDUE CALCULATIONS PHASE ---');
  
  const overduePayments = payments.filter(p => p.status === 'overdue');
  console.log('Overdue payments analysis:', {
    totalPayments: payments.length,
    overdueCount: overduePayments.length,
    overduePaymentIds: overduePayments.map(p => p.id)
  });
  
  const overdueAmount = overduePayments.reduce((sum, payment, index) => {
    try {
      const totalDue = parseNumeric(payment.totalDue || payment.total_due);
      const newSum = sum + totalDue;
      
      console.log(`Overdue payment ${index + 1}:`, {
        paymentId: payment.id,
        totalDue,
        rawTotalDue: payment.totalDue || payment.total_due,
        dueDate: payment.dueDate || payment.due_date,
        runningTotal: newSum
      });
      
      return newSum;
    } catch (error) {
      console.error(`Error calculating overdue amount for payment ${payment.id}:`, error);
      return sum;
    }
  }, 0);
  
  console.log('Monthly calculations summary:', {
    thisMonthDue,
    thisMonthPrincipal,
    thisMonthInterest,
    overdueAmount,
    monthlyPaymentsCount: thisMonthPayments.length
  });

  const result = {
    totalCredits: credits.length,
    activeCredits: activeCredits.length,
    totalPrincipal,
    remainingPrincipal: Math.max(0, remainingPrincipal), // Ensure non-negative
    projectedInterest: totalProjectedInterest, // Show total projected interest cost
    thisMonthDue,
    thisMonthPrincipal,
    thisMonthInterest,
    overdueAmount,
    totalPaid: totalPrincipalPaid
  };
  
  // Validation and final logging
  console.log('--- VALIDATION AND FINAL RESULTS ---');
  
  // Validate calculation results
  const validationChecks = {
    totalPrincipalValid: !isNaN(totalPrincipal) && totalPrincipal >= 0,
    remainingPrincipalValid: !isNaN(remainingPrincipal) && remainingPrincipal >= 0,
    projectedInterestValid: !isNaN(totalProjectedInterest) && totalProjectedInterest >= 0,
    monthlyTotalsValid: !isNaN(thisMonthDue) && !isNaN(thisMonthPrincipal) && !isNaN(thisMonthInterest),
    overdueAmountValid: !isNaN(overdueAmount) && overdueAmount >= 0
  };
  
  console.log('Calculation validation:', validationChecks);
  
  // Log any validation failures
  Object.entries(validationChecks).forEach(([check, isValid]) => {
    if (!isValid) {
      console.error(`VALIDATION FAILED: ${check}`);
    }
  });
  
  console.log('=== DASHBOARD INTEREST CALCULATION COMPLETE ===');
  
  // Log data source information for production debugging
  const dataSourceInfo = {
    historicalPaymentsUsed: !!(historicalPayments && historicalPayments.length > 0),
    scheduleDataUsed: !!(allScheduleData && allScheduleData.length > 0),
    primaryDataSource: historicalPayments && historicalPayments.length > 0 ? 'historical-payments-table' : 'scheduled-payments-fallback',
    calculationMethod: allScheduleData && allScheduleData.length > 0 ? 'schedule-based' : 'payment-based'
  };
  
  console.log('=== PRODUCTION DEBUGGING INFO ===');
  console.log('Data source information:', dataSourceInfo);
  
  // Log intermediate calculation values
  const intermediateValues = {
    totalPrincipal,
    totalPrincipalPaid,
    remainingPrincipal,
    paidInterestCalculationSource: historicalPayments && historicalPayments.length > 0 ? 'historical-payments' : 'scheduled-payments',
    totalProjectedInterest
  };
  
  console.log('Intermediate calculation values:', intermediateValues);
  
  // Log final projected interest result with calculation method used
  console.log('=== FINAL PROJECTED INTEREST RESULT ===');
  console.log('Final projected interest calculation:', {
    result: totalProjectedInterest,
    formattedResult: `${totalProjectedInterest.toLocaleString()} L`,
    calculationFormula: allScheduleData && allScheduleData.length > 0 ? 
      'Math.max(0, totalScheduledInterest - actualPaidInterest)' : 
      'sum(allPayments.interestDue)',
    dataSourceUsed: dataSourceInfo.primaryDataSource,
    isFixedCalculation: !!(historicalPayments && historicalPayments.length > 0),
    expectedRange: totalProjectedInterest < 2500000 ? 'within-expected-range' : 'needs-investigation'
  });
  
  console.log('Final calculation summary:', {
    totalProjectedInterest,
    calculationMethod: allScheduleData && allScheduleData.length > 0 ? 'schedule-based' : 'payment-based',
    scheduleDataAvailable: !!(allScheduleData && allScheduleData.length > 0),
    historicalPaymentsAvailable: !!(historicalPayments && historicalPayments.length > 0),
    dataSourceCounts: {
      credits: credits.length,
      activeCredits: activeCredits.length,
      payments: payments.length,
      scheduleItems: allScheduleData?.length || 0,
      historicalPayments: historicalPayments?.length || 0
    },
    calculationResults: {
      totalPrincipal,
      remainingPrincipal,
      totalProjectedInterest,
      thisMonthDue,
      overdueAmount
    }
  });
  
  console.log('Dashboard stats result:', result);
  console.log('=== END DASHBOARD CALCULATION ===');
  return result;
};