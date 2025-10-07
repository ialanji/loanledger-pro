#!/usr/bin/env node

/**
 * Automated regression testing script
 * Runs comprehensive API tests and generates reports
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class RegressionTestRunner {
  constructor(options = {}) {
    this.options = {
      serverPort: options.serverPort || 3001,
      testTimeout: options.testTimeout || 300000, // 5 minutes
      reportDir: options.reportDir || 'test-reports',
      verbose: options.verbose || false,
      ...options
    };
    
    this.serverProcess = null;
    this.testResults = {
      verification: null,
      playwright: null,
      performance: null,
      startTime: new Date(),
      endTime: null
    };
  }

  /**
   * Log message with timestamp
   */
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const prefix = this.options.verbose ? `[${timestamp}] [${level}]` : `[${level}]`;
    console.log(`${prefix} ${message}`);
  }

  /**
   * Start the server for testing
   */
  async startServer() {
    this.log('Starting server for testing...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['server.js'], {
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PORT: this.options.serverPort.toString(),
          LOG_LEVEL: 'ERROR' // Reduce log noise during testing
        },
        stdio: this.options.verbose ? 'inherit' : 'pipe'
      });

      this.serverProcess.on('error', (error) => {
        this.log(`Server startup error: ${error.message}`, 'ERROR');
        reject(error);
      });

      // Wait for server to start
      setTimeout(() => {
        this.log(`Server started on port ${this.options.serverPort}`);
        resolve();
      }, 5000);
    });
  }

  /**
   * Stop the server
   */
  async stopServer() {
    if (this.serverProcess) {
      this.log('Stopping server...');
      this.serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        this.serverProcess.on('exit', resolve);
        setTimeout(() => {
          this.serverProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      });
      
      this.serverProcess = null;
      this.log('Server stopped');
    }
  }

  /**
   * Wait for server to be ready
   */
  async waitForServer(maxAttempts = 30) {
    this.log('Waiting for server to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.options.serverPort}/api/version`);
        if (response.ok) {
          this.log('Server is ready');
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Server failed to become ready within timeout');
  }

  /**
   * Run verification tests
   */
  async runVerificationTests() {
    this.log('Running API verification tests...');
    
    try {
      const { stdout, stderr } = await execAsync('node tests/verify-fixes.js', {
        timeout: this.options.testTimeout,
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      });
      
      this.testResults.verification = {
        success: true,
        output: stdout,
        error: stderr
      };
      
      this.log('Verification tests completed successfully');
      return true;
    } catch (error) {
      this.testResults.verification = {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      };
      
      this.log(`Verification tests failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Run Playwright tests
   */
  async runPlaywrightTests() {
    this.log('Running Playwright API tests...');
    
    try {
      const { stdout, stderr } = await execAsync(
        'npx playwright test --config=playwright.api.config.js --reporter=json',
        {
          timeout: this.options.testTimeout,
          env: {
            ...process.env,
            NODE_ENV: 'test'
          }
        }
      );
      
      this.testResults.playwright = {
        success: true,
        output: stdout,
        error: stderr
      };
      
      this.log('Playwright tests completed successfully');
      return true;
    } catch (error) {
      this.testResults.playwright = {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      };
      
      this.log(`Playwright tests failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    this.log('Running performance tests...');
    
    try {
      const { stdout, stderr } = await execAsync(
        'npx playwright test --config=playwright.api.config.js performance-load.test.js --reporter=json',
        {
          timeout: this.options.testTimeout * 2, // Performance tests take longer
          env: {
            ...process.env,
            NODE_ENV: 'test'
          }
        }
      );
      
      this.testResults.performance = {
        success: true,
        output: stdout,
        error: stderr
      };
      
      this.log('Performance tests completed successfully');
      return true;
    } catch (error) {
      this.testResults.performance = {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      };
      
      this.log(`Performance tests failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Generate test report
   */
  async generateReport() {
    this.log('Generating test report...');
    
    this.testResults.endTime = new Date();
    const duration = this.testResults.endTime - this.testResults.startTime;
    
    const report = {
      timestamp: this.testResults.endTime.toISOString(),
      duration: Math.round(duration / 1000), // seconds
      summary: {
        verification: this.testResults.verification?.success || false,
        playwright: this.testResults.playwright?.success || false,
        performance: this.testResults.performance?.success || false
      },
      details: this.testResults
    };
    
    // Create report directory
    await fs.mkdir(this.options.reportDir, { recursive: true });
    
    // Write JSON report
    const jsonReportPath = path.join(this.options.reportDir, 'regression-test-report.json');
    await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));
    
    // Write markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const mdReportPath = path.join(this.options.reportDir, 'regression-test-report.md');
    await fs.writeFile(mdReportPath, markdownReport);
    
    this.log(`Test report generated: ${jsonReportPath}`);
    this.log(`Markdown report generated: ${mdReportPath}`);
    
    return report;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    const successIcon = '✅';
    const failIcon = '❌';
    
    return `# API Regression Test Report

## Summary

**Date:** ${report.timestamp}  
**Duration:** ${report.duration} seconds  
**Overall Status:** ${Object.values(report.summary).every(s => s) ? successIcon + ' PASS' : failIcon + ' FAIL'}

## Test Results

### Verification Tests
**Status:** ${report.summary.verification ? successIcon + ' PASS' : failIcon + ' FAIL'}

${report.details.verification ? `
**Output:**
\`\`\`
${report.details.verification.output}
\`\`\`

${report.details.verification.error ? `**Errors:**
\`\`\`
${report.details.verification.error}
\`\`\`` : ''}
` : 'Not executed'}

### Playwright Tests
**Status:** ${report.summary.playwright ? successIcon + ' PASS' : failIcon + ' FAIL'}

${report.details.playwright ? `
${report.details.playwright.error ? `**Errors:**
\`\`\`
${report.details.playwright.error}
\`\`\`` : ''}
` : 'Not executed'}

### Performance Tests
**Status:** ${report.summary.performance ? successIcon + ' PASS' : failIcon + ' FAIL'}

${report.details.performance ? `
${report.details.performance.error ? `**Errors:**
\`\`\`
${report.details.performance.error}
\`\`\`` : ''}
` : 'Not executed'}

## Recommendations

${Object.values(report.summary).every(s => s) ? `
🎉 All tests passed! The API is functioning correctly.

**Next Steps:**
- Monitor performance metrics for trends
- Review any warnings in test output
- Consider adding more test coverage for edge cases
` : `
⚠️ Some tests failed. Please investigate the issues above.

**Troubleshooting Steps:**
1. Check server logs for errors
2. Verify database connectivity
3. Review recent code changes
4. Run tests individually to isolate issues
5. Check environment configuration
`}

## Test Configuration

- **Server Port:** ${this.options.serverPort}
- **Test Timeout:** ${this.options.testTimeout}ms
- **Environment:** test
- **Report Directory:** ${this.options.reportDir}
`;
  }

  /**
   * Run all regression tests
   */
  async runAll() {
    this.log('Starting API regression tests...');
    
    let allPassed = true;
    
    try {
      // Start server
      await this.startServer();
      await this.waitForServer();
      
      // Run verification tests
      const verificationPassed = await this.runVerificationTests();
      allPassed = allPassed && verificationPassed;
      
      // Run Playwright tests (continue even if verification fails)
      const playwrightPassed = await this.runPlaywrightTests();
      allPassed = allPassed && playwrightPassed;
      
      // Run performance tests (optional, continue even if others fail)
      if (this.options.includePerformance !== false) {
        const performancePassed = await this.runPerformanceTests();
        allPassed = allPassed && performancePassed;
      }
      
    } catch (error) {
      this.log(`Test execution error: ${error.message}`, 'ERROR');
      allPassed = false;
    } finally {
      // Always stop server and generate report
      await this.stopServer();
      const report = await this.generateReport();
      
      // Print summary
      this.log('='.repeat(50));
      this.log('REGRESSION TEST SUMMARY');
      this.log('='.repeat(50));
      this.log(`Verification Tests: ${report.summary.verification ? 'PASS' : 'FAIL'}`);
      this.log(`Playwright Tests: ${report.summary.playwright ? 'PASS' : 'FAIL'}`);
      this.log(`Performance Tests: ${report.summary.performance ? 'PASS' : 'FAIL'}`);
      this.log(`Overall Result: ${allPassed ? 'PASS' : 'FAIL'}`);
      this.log(`Duration: ${report.duration} seconds`);
      this.log('='.repeat(50));
    }
    
    return allPassed;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--port':
      case '-p':
        options.serverPort = parseInt(args[++i]);
        break;
      case '--timeout':
      case '-t':
        options.testTimeout = parseInt(args[++i]) * 1000; // Convert to ms
        break;
      case '--report-dir':
      case '-r':
        options.reportDir = args[++i];
        break;
      case '--no-performance':
        options.includePerformance = false;
        break;
      case '--help':
      case '-h':
        console.log(`
API Regression Test Runner

Usage: node scripts/run-regression-tests.js [options]

Options:
  -v, --verbose           Enable verbose logging
  -p, --port <port>       Server port (default: 3001)
  -t, --timeout <sec>     Test timeout in seconds (default: 300)
  -r, --report-dir <dir>  Report directory (default: test-reports)
  --no-performance        Skip performance tests
  -h, --help              Show this help message

Examples:
  node scripts/run-regression-tests.js
  node scripts/run-regression-tests.js --verbose --port 3002
  node scripts/run-regression-tests.js --timeout 600 --no-performance
        `);
        process.exit(0);
    }
  }
  
  const runner = new RegressionTestRunner(options);
  const success = await runner.runAll();
  
  process.exit(success ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default RegressionTestRunner;