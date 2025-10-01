const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

// Database connection using environment variables
const pool = new Pool({
  user: process.env.POSTGRES_USER || process.env.DB_USER,
  host: process.env.POSTGRES_HOST || process.env.DB_HOST,
  database: process.env.POSTGRES_DATABASE || process.env.DB_NAME,
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT),
});

async function checkConstraints() {
  console.log('🔍 Checking credits table constraints...\n');

  try {
    // Check all constraints on the credits table
    const constraintsResult = await pool.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'credits'::regclass
      ORDER BY conname
    `);

    console.log('Credits table constraints:');
    constraintsResult.rows.forEach(constraint => {
      console.log(`\n- ${constraint.constraint_name} (${constraint.constraint_type}):`);
      console.log(`  ${constraint.constraint_definition}`);
    });

    // Specifically check the method column constraint
    console.log('\n🔍 Checking method column constraint details...\n');
    
    const methodConstraintResult = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'credits'::regclass 
        AND conname LIKE '%method%'
    `);

    if (methodConstraintResult.rows.length > 0) {
      methodConstraintResult.rows.forEach(constraint => {
        console.log(`Method constraint: ${constraint.constraint_name}`);
        console.log(`Definition: ${constraint.constraint_definition}`);
      });
    } else {
      console.log('No method-specific constraints found.');
    }

    // Check what values are currently in the method column
    console.log('\n🔍 Checking existing method values...\n');
    
    const existingMethodsResult = await pool.query(`
      SELECT DISTINCT method, COUNT(*) as count
      FROM credits 
      GROUP BY method
      ORDER BY method
    `);

    if (existingMethodsResult.rows.length > 0) {
      console.log('Existing method values in credits table:');
      existingMethodsResult.rows.forEach(row => {
        console.log(`- "${row.method}" (${row.count} records)`);
      });
    } else {
      console.log('No existing credits found.');
    }

  } catch (error) {
    console.error('❌ Error checking constraints:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
  } finally {
    await pool.end();
  }
}

checkConstraints();