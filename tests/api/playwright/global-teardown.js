async function globalTeardown() {
  console.log('[GLOBAL TEARDOWN] Cleaning up test environment...');

  try {
    // Close database pool
    if (global.__DB_POOL__) {
      await global.__DB_POOL__.end();
      console.log('[GLOBAL TEARDOWN] Database pool closed');
    }

    // Stop server process if we started it
    if (global.__SERVER_PROCESS__) {
      global.__SERVER_PROCESS__.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        global.__SERVER_PROCESS__.on('exit', () => {
          console.log('[GLOBAL TEARDOWN] Server process terminated');
          resolve();
        });
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!global.__SERVER_PROCESS__.killed) {
            global.__SERVER_PROCESS__.kill('SIGKILL');
            console.log('[GLOBAL TEARDOWN] Server process force killed');
          }
          resolve();
        }, 5000);
      });
    }

    console.log('[GLOBAL TEARDOWN] Test environment cleanup complete');
  } catch (error) {
    console.error('[GLOBAL TEARDOWN] Error during cleanup:', error);
  }
}

export default globalTeardown;