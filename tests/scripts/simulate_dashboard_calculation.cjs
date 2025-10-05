// Simulate dashboard calculation with fixed historical data

// Mock data based on what we found in the database
const mockCredits = [
  { id: 'b21af78c-b94a-4c29-92a5-ee01bb6c715a', principal: 10000000, status: 'active' },
  { id: '2ceff137-41e9-4616-8465-900a76e607ef', principal: 25000000, status: 'active' }
];

const mockScheduleData = [
  {
    creditId: 'b21af78c-b94a-4c29-92a5-ee01bb6c715a',
    schedule: { totals: { totalInterest: 1200000 } } // Example total interest for first credit
  },
  {
    creditId: '2ceff137-41e9-4616-8465-900a76e607ef', 
    schedule: { totals: { totalInterest: 1458049 } } // Example total interest for second credit
  }
];

// Historical payments data from our test (total paid interest: 2,471,748.10)
const mockHistoricalPayments = [
  { credit_id: 'b21af78c-b94a-4c29-92a5-ee01bb6c715a', interest_amount: 1200000, status: 'paid' },
  { credit_id: '2ceff137-41e9-4616-8465-900a76e607ef', interest_amount: 1271748.10, status: 'paid' }
];

function calculateProjectedInterest(scheduleData, historicalPayments) {
  console.log('=== SIMULATING DASHBOARD CALCULATION ===');
  
  // Calculate total interest from schedules
  const totalInterestFromSchedules = scheduleData.reduce((sum, item) => {
    const interest = parseFloat(item.schedule?.totals?.totalInterest || 0);
    console.log(`Schedule for ${item.creditId}: ${interest}`);
    return sum + interest;
  }, 0);
  
  console.log('Total interest from schedules:', totalInterestFromSchedules);
  
  // Calculate paid interest from historical payments
  const paidInterest = historicalPayments.reduce((sum, payment) => {
    const interest = parseFloat(payment.interest_amount || 0);
    console.log(`Paid interest for ${payment.credit_id}: ${interest}`);
    return sum + interest;
  }, 0);
  
  console.log('Total paid interest:', paidInterest);
  
  // Calculate projected interest (remaining)
  const projectedInterest = Math.max(0, totalInterestFromSchedules - paidInterest);
  
  console.log('=== CALCULATION RESULT ===');
  console.log('Formula: Math.max(0, totalScheduledInterest - actualPaidInterest)');
  console.log('Calculation:', `${totalInterestFromSchedules} - ${paidInterest} = ${projectedInterest}`);
  console.log('Expected result should be close to 2,202,688 L');
  
  return projectedInterest;
}

// Test with our mock data
const result = calculateProjectedInterest(mockScheduleData, mockHistoricalPayments);

console.log('\n=== COMPARISON WITH REQUIREMENTS ===');
const expectedResult = 2202688;
const difference = Math.abs(result - expectedResult);
const percentageDiff = (difference / expectedResult) * 100;

console.log(`Expected: ${expectedResult} L`);
console.log(`Calculated: ${result} L`);
console.log(`Difference: ${difference} L (${percentageDiff.toFixed(2)}%)`);

if (percentageDiff < 10) {
  console.log('✅ Result is within acceptable range (< 10% difference)');
} else {
  console.log('❌ Result differs significantly from expected value');
}

console.log('\n=== WHAT DASHBOARD SHOULD SHOW ===');
console.log(`The dashboard should show approximately ${result} L as projected interest`);
console.log('This represents the remaining interest to be paid on active credits');