require('dotenv').config({ path: 'c:\\site\\loanledger-pro\\.env' });

const { Pool } = require('pg');

const creditId = '2ceff137-41e9-4616-8465-900a76e607ef';

async function main() {
  const pool = new Pool({
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    host: process.env.POSTGRES_HOST || process.env.DB_HOST,
    database: process.env.POSTGRES_DATABASE || process.env.DB_NAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
  });

  try {
    // Dynamic import for ESM module
    const { ScheduleEngine } = await import('./src/services/schedule-engine.js');

    // Fetch credit
    const creditRes = await pool.query('SELECT * FROM credits WHERE id = $1', [creditId]);
    if (creditRes.rows.length === 0) {
      console.log('No credit found');
      return;
    }
    const dbCredit = creditRes.rows[0];

    // Map to ScheduleEngine expected format
    const creditData = {
      id: dbCredit.id,
      contractNumber: dbCredit.contract_number,
      principal: parseFloat(dbCredit.principal),
      termMonths: parseInt(dbCredit.term_months),
      startDate: new Date(dbCredit.start_date),
      method: dbCredit.method || 'classic_annuity',
      defermentMonths: parseInt(dbCredit.deferment_months) || 0,
      paymentDay: parseInt(dbCredit.payment_day) || 1
    };

    // Fetch rates
    const ratesRes = await pool.query('SELECT * FROM credit_rates WHERE credit_id = $1 ORDER BY effective_date', [creditId]);
    const rates = ratesRes.rows.map(row => ({
      annualPercent: parseFloat(row.rate) * 100, // Adjust based on endpoint logic, assuming DB has 0.08 for 8%
      effectiveDate: new Date(row.effective_date)
    }));

    // Fetch adjustments
    const adjustmentsRes = await pool.query('SELECT * FROM principal_adjustments WHERE credit_id = $1 ORDER BY adjustment_date ASC', [creditId]);
    const adjustments = adjustmentsRes.rows.map(adj => ({
      id: adj.id,
      loanId: adj.loan_id,
      amount: parseFloat(adj.amount),
      effectiveDate: new Date(adj.adjustment_date || adj.effective_date),
      type: adj.type
    })).filter(a => a.effectiveDate instanceof Date && !isNaN(a.effectiveDate.getTime()));

    // Generate schedule
    const response = ScheduleEngine.generatePaymentScheduleResponse(creditData, rates, adjustments);

    const schedule = response.schedule || [];
    console.log('Generated schedule due dates:');
    schedule.forEach((payment) => {
      console.log(`Period ${payment.periodNumber}: ${new Date(payment.dueDate).toISOString().split('T')[0]}, Total Due: ${payment.totalDue}`);
    });

    // Mock date for October 31, 2025
    const mockNow = new Date('2025-10-31');
    const endOfCurrentMonth = new Date(mockNow.getFullYear(), mockNow.getMonth() + 1, 0);

    // Fetch existing periods (excluding cancelled)
    const allPaymentsRes = await pool.query(`
      SELECT period_number, status, due_date
      FROM credit_payment
      WHERE credit_id = $1
    `, [creditId]);
    const existingPeriods = new Set(
      allPaymentsRes.rows
        .filter(p => p.status !== 'cancelled')
        .map(p => p.period_number)
    );
    console.log(`Existing periods (excluding cancelled): ${Array.from(existingPeriods).join(', ')}`);

    // Filter unprocessed
    const unprocessed = schedule
      .filter(i => new Date(i.dueDate) <= endOfCurrentMonth && !existingPeriods.has(i.periodNumber));

    console.log('Simulated unprocessed payments:');
    unprocessed.forEach((payment) => {
      console.log(`Period ${payment.periodNumber}: ${new Date(payment.dueDate).toISOString().split('T')[0]}, Total Due: ${payment.totalDue}`);
    });

    // Check for October 2025
    const october2025 = unprocessed.find(p => {
      const d = new Date(p.dueDate);
      return d.getFullYear() === 2025 && d.getMonth() === 9;
    });
    if (october2025) {
      console.log('\nOctober 2025 payment found in unprocessed:', october2025);
    } else {
      console.log('\nNo October 2025 payment in unprocessed');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();