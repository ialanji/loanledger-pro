import { spawn } from 'child_process';
import { chromium } from '@playwright/test';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

let serverProcess = null;
let pool = null;

async function globalSetup() {
  console.log('[GLOBAL SETUP] Starting API test environment setup...');

  try {
    // Initialize database connection
    await setupDatabase();
    
    // Start the server if not already running
    await startServer();
    
    // Wait for server to be ready
    await waitForServer();
    
    console.log('[GLOBAL SETUP] API test environment setup complete');
  } catch (error) {
    console.error('[GLOBAL SETUP] Failed to setup test environment:', error);
    throw error;
  }
}

async function setupDatabase() {
  console.log('[GLOBAL SETUP] Setting up database connection...');
  
  const poolConfig = {
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    host: process.env.POSTGRES_HOST || process.env.DB_HOST,
    database: process.env.POSTGRES_DATABASE || process.env.DB_NAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT),
    max: 5, // Reduced pool size for testing
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  pool = new Pool(poolConfig);

  // Test database connection
  try {
    const client = await pool.connect();
    console.log('[GLOBAL SETUP] Database connection successful');
    client.release();
  } catch (error) {
    console.error('[GLOBAL SETUP] Database connection failed:', error);
    throw error;
  }
}

async function startServer() {
  console.log('[GLOBAL SETUP] Starting server...');
  
  // Check if server is already running
  try {
    const response = await fetch('http://localhost:3001/api/ping');
    if (response.ok) {
      console.log('[GLOBAL SETUP] Server already running');
      return;
    }
  } catch (error) {
    // Server not running, start it
  }

  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      stdio: 'pipe',
      env: { ...process.env }
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[SERVER]', output.trim());
      
      if (output.includes('Server running on') || output.includes('Connected to PostgreSQL')) {
        if (!serverReady) {
          serverReady = true;
          setTimeout(resolve, 2000); // Give server extra time to fully initialize
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[SERVER ERROR]', data.toString().trim());
    });

    serverProcess.on('error', (error) => {
      console.error('[SERVER SPAWN ERROR]', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && !serverReady) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

async function waitForServer() {
  console.log('[GLOBAL SETUP] Waiting for server to be ready...');
  
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch('http://localhost:3001/api/version', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        console.log('[GLOBAL SETUP] Server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Server failed to become ready within timeout period');
}

// Store references for cleanup
global.__SERVER_PROCESS__ = serverProcess;
global.__DB_POOL__ = pool;

export default globalSetup;