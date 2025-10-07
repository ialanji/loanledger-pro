#!/usr/bin/env node

/**
 * Test result reporter and notification system
 * Processes test results and sends notifications
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class TestReporter {
  constructor(options = {}) {
    this.options = {
      reportDir: options.reportDir || 'test-reports',
      webhookUrl: options.webhookUrl || process.env.TEST_WEBHOOK_URL,
      emailConfig: options.emailConfig || null,
      slackConfig: options.slackConfig || null,
      ...options
    };
  }

  /**
   * Load test report
   */
  async loadReport(reportPath) {
    try {
      const reportContent = await fs.readFile(reportPath, 'utf8');
      return JSON.parse(reportContent);
    } catch (error) {
      throw new Error(`Failed to load report: ${error.message}`);
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary(report) {
    const summary = {
      timestamp: report.timestamp,
      duration: report.duration,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      successRate: 0,
      status: 'UNKNOWN'
    };

    // Count test results
    Object.entries(report.summary).forEach(([testType, passed]) => {
      summary.totalTests++;
      if (passed) {
        summary.passedTests++;
      } else {
        summary.failedTests++;
      }
    });

    summary.successRate = summary.totalTests > 0 
      ? Math.round((summary.passedTests / summary.totalTests) * 100) 
      : 0;

    summary.status = summary.failedTests === 0 ? 'PASS' : 'FAIL';

    return summary;
  }

  /**
   * Generate notification message
   */
  generateNotificationMessage(report, summary) {
    const statusIcon = summary.status === 'PASS' ? '✅' : '❌';
    const timestamp = new Date(report.timestamp).toLocaleString();

    return {
      title: `${statusIcon} API Regression Tests - ${summary.status}`,
      summary: `${summary.passedTests}/${summary.totalTests} tests passed (${summary.successRate}%)`,
      details: {
        timestamp,
        duration: `${summary.duration}s`,
        verification: report.summary.verification ? '✅ PASS' : '❌ FAIL',
        playwright: report.summary.playwright ? '✅ PASS' : '❌ FAIL',
        performance: report.summary.performance ? '✅ PASS' : '❌ FAIL'
      },
      recommendations: this.generateRecommendations(report, summary)
    };
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(report, summary) {
    const recommendations = [];

    if (summary.status === 'PASS') {
      recommendations.push('🎉 All tests passed! API is functioning correctly.');
      recommendations.push('📊 Monitor performance metrics for trends.');
      recommendations.push('🔍 Review any warnings in test output.');
    } else {
      recommendations.push('⚠️ Some tests failed. Investigation required.');
      
      if (!report.summary.verification) {
        recommendations.push('🔧 Check basic API functionality and server startup.');
      }
      
      if (!report.summary.playwright) {
        recommendations.push('🎭 Review Playwright test failures for specific endpoint issues.');
      }
      
      if (!report.summary.performance) {
        recommendations.push('⚡ Investigate performance degradation or timeout issues.');
      }
      
      recommendations.push('📋 Follow troubleshooting steps in the full report.');
    }

    return recommendations;
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(message) {
    if (!this.options.webhookUrl) {
      console.log('No webhook URL configured, skipping webhook notification');
      return;
    }

    try {
      const payload = {
        text: message.title,
        attachments: [{
          color: message.title.includes('✅') ? 'good' : 'danger',
          fields: [
            {
              title: 'Summary',
              value: message.summary,
              short: true
            },
            {
              title: 'Duration',
              value: message.details.duration,
              short: true
            },
            {
              title: 'Test Results',
              value: `Verification: ${message.details.verification}\nPlaywright: ${message.details.playwright}\nPerformance: ${message.details.performance}`,
              short: false
            },
            {
              title: 'Recommendations',
              value: message.recommendations.join('\n'),
              short: false
            }
          ],
          footer: 'API Regression Tests',
          ts: Math.floor(new Date(message.details.timestamp).getTime() / 1000)
        }]
      };

      const response = await fetch(this.options.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Webhook notification sent successfully');
      } else {
        console.error(`❌ Webhook notification failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Webhook notification error: ${error.message}`);
    }
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report, summary, message) {
    const statusColor = summary.status === 'PASS' ? '#28a745' : '#dc3545';
    const timestamp = new Date(report.timestamp).toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Regression Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            text-align: center;
        }
        .status {
            font-size: 2em;
            font-weight: bold;
            color: ${statusColor};
            margin-bottom: 10px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card h3 {
            margin-top: 0;
            color: #495057;
        }
        .metric {
            font-size: 2em;
            font-weight: bold;
            color: ${statusColor};
        }
        .test-results {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .test-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .test-item:last-child {
            border-bottom: none;
        }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .recommendations {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .recommendations ul {
            list-style: none;
            padding: 0;
        }
        .recommendations li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .recommendations li:last-child {
            border-bottom: none;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: #6c757d;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="status">${message.title}</div>
        <p>Generated on ${timestamp}</p>
    </div>

    <div class="summary-grid">
        <div class="card">
            <h3>Success Rate</h3>
            <div class="metric">${summary.successRate}%</div>
        </div>
        <div class="card">
            <h3>Tests Passed</h3>
            <div class="metric">${summary.passedTests}/${summary.totalTests}</div>
        </div>
        <div class="card">
            <h3>Duration</h3>
            <div class="metric">${summary.duration}s</div>
        </div>
        <div class="card">
            <h3>Status</h3>
            <div class="metric">${summary.status}</div>
        </div>
    </div>

    <div class="test-results">
        <h3>Test Results</h3>
        <div class="test-item">
            <span>Verification Tests</span>
            <span class="${report.summary.verification ? 'pass' : 'fail'}">
                ${report.summary.verification ? '✅ PASS' : '❌ FAIL'}
            </span>
        </div>
        <div class="test-item">
            <span>Playwright Tests</span>
            <span class="${report.summary.playwright ? 'pass' : 'fail'}">
                ${report.summary.playwright ? '✅ PASS' : '❌ FAIL'}
            </span>
        </div>
        <div class="test-item">
            <span>Performance Tests</span>
            <span class="${report.summary.performance ? 'pass' : 'fail'}">
                ${report.summary.performance ? '✅ PASS' : '❌ FAIL'}
            </span>
        </div>
    </div>

    <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
            ${message.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="footer">
        <p>API Regression Test Report - Generated by automated testing system</p>
    </div>
</body>
</html>`;
  }

  /**
   * Save HTML report
   */
  async saveHTMLReport(htmlContent, filename = 'test-report.html') {
    const reportPath = path.join(this.options.reportDir, filename);
    await fs.writeFile(reportPath, htmlContent);
    console.log(`📄 HTML report saved: ${reportPath}`);
    return reportPath;
  }

  /**
   * Process and report test results
   */
  async processReport(reportPath) {
    console.log(`📊 Processing test report: ${reportPath}`);

    // Load report
    const report = await this.loadReport(reportPath);
    
    // Generate summary
    const summary = this.generateSummary(report);
    
    // Generate notification message
    const message = this.generateNotificationMessage(report, summary);
    
    // Print summary to console
    console.log('\n' + '='.repeat(60));
    console.log('TEST REPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status: ${message.title}`);
    console.log(`Summary: ${message.summary}`);
    console.log(`Timestamp: ${message.details.timestamp}`);
    console.log(`Duration: ${message.details.duration}`);
    console.log('\nTest Results:');
    console.log(`  Verification: ${message.details.verification}`);
    console.log(`  Playwright: ${message.details.playwright}`);
    console.log(`  Performance: ${message.details.performance}`);
    console.log('\nRecommendations:');
    message.recommendations.forEach(rec => console.log(`  ${rec}`));
    console.log('='.repeat(60));

    // Generate and save HTML report
    const htmlContent = this.generateHTMLReport(report, summary, message);
    await this.saveHTMLReport(htmlContent);

    // Send notifications
    await this.sendWebhookNotification(message);

    return {
      report,
      summary,
      message
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Test Reporter

Usage: node scripts/test-reporter.js <report-path> [options]

Arguments:
  report-path             Path to the JSON test report file

Options:
  --webhook-url <url>     Webhook URL for notifications
  --report-dir <dir>      Report directory (default: test-reports)

Examples:
  node scripts/test-reporter.js test-reports/regression-test-report.json
  node scripts/test-reporter.js test-reports/regression-test-report.json --webhook-url https://hooks.slack.com/...
    `);
    process.exit(1);
  }

  const reportPath = args[0];
  const options = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--webhook-url':
        options.webhookUrl = args[++i];
        break;
      case '--report-dir':
        options.reportDir = args[++i];
        break;
    }
  }

  try {
    const reporter = new TestReporter(options);
    await reporter.processReport(reportPath);
    console.log('\n✅ Report processing completed successfully');
  } catch (error) {
    console.error(`❌ Report processing failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default TestReporter;