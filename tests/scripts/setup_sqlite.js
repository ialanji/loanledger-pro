const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Create database connection
const db = new sqlite3.Database('./database.db');

console.log('Setting up SQLite database...');

// Create tables
db.serialize(() => {
  // Create credits table
  db.run(`CREATE TABLE IF NOT EXISTS credits (
    id TEXT PRIMARY KEY,
    credit_number TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    rate DECIMAL(5,4) NOT NULL,
    term_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create credit_payment table
  db.run(`CREATE TABLE IF NOT EXISTS credit_payment (
    id TEXT PRIMARY KEY,
    credit_id TEXT NOT NULL,
    period_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    payment_date DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credit_id) REFERENCES credits(id)
  )`);

  // Insert sample credit data
  const creditId = 'a0e3cd5b-b9f9-42b0-9103-4af862a1d9df';
  db.run(`INSERT OR REPLACE INTO credits (id, credit_number, client_name, amount, rate, term_months, start_date, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [creditId, 'GA202503S805/3524/2', 'Test Client', 100000, 0.12, 36, '2024-01-01', 'active']);

  // Insert sample payment periods (some paid, some pending)
  const payments = [];
  for (let i = 1; i <= 36; i++) {
    const dueDate = new Date(2024, i - 1, 1); // Monthly payments starting from Jan 2024
    const isPaid = i <= 20; // First 20 periods are paid
    
    payments.push([
      `payment-${creditId}-${i}`,
      creditId,
      i,
      dueDate.toISOString().split('T')[0],
      2500, // principal
      1000, // interest
      3500, // total
      isPaid ? 3500 : 0, // paid amount
      isPaid ? dueDate.toISOString().split('T')[0] : null, // payment date
      isPaid ? 'paid' : 'pending'
    ]);
  }

  const stmt = db.prepare(`INSERT OR REPLACE INTO credit_payment 
    (id, credit_id, period_number, due_date, principal_amount, interest_amount, total_amount, paid_amount, payment_date, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  payments.forEach(payment => {
    stmt.run(payment);
  });
  
  stmt.finalize();

  console.log('Database setup complete!');
  console.log(`- Created credit: ${creditId}`);
  console.log('- Created 36 payment periods (20 paid, 16 pending)');
});

db.close();