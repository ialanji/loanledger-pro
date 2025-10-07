#!/bin/bash

# CI Test Runner Script
# Runs comprehensive API regression tests in CI/CD environment

set -e  # Exit on any error

# Configuration
SERVER_PORT=${SERVER_PORT:-3001}
TEST_TIMEOUT=${TEST_TIMEOUT:-300}
REPORT_DIR=${REPORT_DIR:-test-reports}
NODE_ENV=${NODE_ENV:-test}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Kill server if running
    if [ ! -z "$SERVER_PID" ]; then
        log_info "Stopping server (PID: $SERVER_PID)"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    
    # Kill any remaining node processes
    pkill -f "node server.js" 2>/dev/null || true
    
    log_info "Cleanup completed"
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Main execution
main() {
    log_info "Starting CI Test Runner"
    log_info "Configuration:"
    log_info "  Server Port: $SERVER_PORT"
    log_info "  Test Timeout: ${TEST_TIMEOUT}s"
    log_info "  Report Directory: $REPORT_DIR"
    log_info "  Environment: $NODE_ENV"
    
    # Create report directory
    mkdir -p "$REPORT_DIR"
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed or not in PATH"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    # Install Playwright browsers if needed
    if [ ! -d "node_modules/@playwright" ]; then
        log_info "Installing Playwright browsers..."
        npx playwright install --with-deps
    fi
    
    # Start server
    log_info "Starting server..."
    NODE_ENV=$NODE_ENV PORT=$SERVER_PORT node server.js &
    SERVER_PID=$!
    
    # Wait for server to start
    log_info "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s "http://localhost:$SERVER_PORT/api/version" > /dev/null 2>&1; then
            log_success "Server is ready"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "Server failed to start within timeout"
            exit 1
        fi
        
        sleep 1
    done
    
    # Run verification tests
    log_info "Running API verification tests..."
    if timeout ${TEST_TIMEOUT}s node tests/verify-fixes.js; then
        log_success "Verification tests passed"
        VERIFICATION_RESULT="PASS"
    else
        log_error "Verification tests failed"
        VERIFICATION_RESULT="FAIL"
    fi
    
    # Run Playwright tests
    log_info "Running Playwright API tests..."
    if timeout ${TEST_TIMEOUT}s npx playwright test --config=playwright.api.config.js --reporter=json --output-dir="$REPORT_DIR/playwright"; then
        log_success "Playwright tests passed"
        PLAYWRIGHT_RESULT="PASS"
    else
        log_error "Playwright tests failed"
        PLAYWRIGHT_RESULT="FAIL"
    fi
    
    # Run performance tests (optional)
    log_info "Running performance tests..."
    if timeout $((TEST_TIMEOUT * 2))s npx playwright test --config=playwright.api.config.js performance-load.test.js --reporter=json --output-dir="$REPORT_DIR/performance"; then
        log_success "Performance tests passed"
        PERFORMANCE_RESULT="PASS"
    else
        log_warning "Performance tests failed (non-critical)"
        PERFORMANCE_RESULT="FAIL"
    fi
    
    # Generate summary report
    log_info "Generating test summary..."
    cat > "$REPORT_DIR/ci-test-summary.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "environment": "$NODE_ENV",
  "serverPort": $SERVER_PORT,
  "results": {
    "verification": "$VERIFICATION_RESULT",
    "playwright": "$PLAYWRIGHT_RESULT",
    "performance": "$PERFORMANCE_RESULT"
  },
  "summary": {
    "totalTests": 3,
    "passedTests": $(echo "$VERIFICATION_RESULT $PLAYWRIGHT_RESULT $PERFORMANCE_RESULT" | grep -o "PASS" | wc -l),
    "failedTests": $(echo "$VERIFICATION_RESULT $PLAYWRIGHT_RESULT $PERFORMANCE_RESULT" | grep -o "FAIL" | wc -l)
  }
}
EOF
    
    # Print summary
    echo ""
    log_info "========================================="
    log_info "CI TEST SUMMARY"
    log_info "========================================="
    log_info "Verification Tests: $VERIFICATION_RESULT"
    log_info "Playwright Tests: $PLAYWRIGHT_RESULT"
    log_info "Performance Tests: $PERFORMANCE_RESULT"
    
    # Determine overall result
    if [ "$VERIFICATION_RESULT" = "PASS" ] && [ "$PLAYWRIGHT_RESULT" = "PASS" ]; then
        log_success "Overall Result: PASS"
        log_info "========================================="
        exit 0
    else
        log_error "Overall Result: FAIL"
        log_info "========================================="
        exit 1
    fi
}

# Help function
show_help() {
    echo "CI Test Runner"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT       Server port (default: 3001)"
    echo "  -t, --timeout SECONDS Test timeout in seconds (default: 300)"
    echo "  -r, --report-dir DIR  Report directory (default: test-reports)"
    echo "  -e, --env ENV         Environment (default: test)"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SERVER_PORT           Server port"
    echo "  TEST_TIMEOUT          Test timeout in seconds"
    echo "  REPORT_DIR            Report directory"
    echo "  NODE_ENV              Node environment"
    echo ""
    echo "Examples:"
    echo "  $0                    Run with default settings"
    echo "  $0 -p 3002 -t 600     Run on port 3002 with 10 minute timeout"
    echo "  $0 --env staging       Run in staging environment"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            SERVER_PORT="$2"
            shift 2
            ;;
        -t|--timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        -r|--report-dir)
            REPORT_DIR="$2"
            shift 2
            ;;
        -e|--env)
            NODE_ENV="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main