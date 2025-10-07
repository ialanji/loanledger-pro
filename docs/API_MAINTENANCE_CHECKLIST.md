# API Maintenance Checklist

## Daily Maintenance (5-10 minutes)

### System Health Verification
- [ ] **API Endpoints Status Check**
  ```bash
  curl -s http://localhost:8091/api/health | jq '.'
  curl -s http://localhost:8091/api/aliases | head -5
  curl -s http://localhost:8091/api/expenses | head -5
  ```
  ✅ Expected: HTTP 200 responses with valid JSON

- [ ] **Database Connection Health**
  ```bash
  npm run test:db-health
  ```
  ✅ Expected: Connection successful, no timeout errors

- [ ] **Error Log Review**
  ```bash
  grep "ERROR\|FATAL" server.log | tail -10
  ```
  ✅ Expected: No new critical errors in last 24 hours

- [ ] **Performance Metrics**
  ```bash
  npx playwright test tests/api/performance/response-time.spec.js --reporter=json
  ```
  ✅ Expected: Response times < 500ms for all endpoints

### Quick Diagnostic Tests
- [ ] **Aliases Endpoint Test**
  ```bash
  npx playwright test tests/api/aliases-diagnostic.spec.js --reporter=line
  ```

- [ ] **Expenses Endpoint Test**
  ```bash
  npx playwright test tests/api/expenses-diagnostic.spec.js --reporter=line
  ```

### Resource Monitoring
- [ ] **Server Resource Usage**
  ```bash
  ps aux | grep node | head -5
  df -h | grep -E "/$|/var"
  ```
  ✅ Expected: CPU < 80%, Memory < 80%, Disk < 90%

---

## Weekly Maintenance (30-45 minutes)

### Comprehensive Testing
- [ ] **Full API Test Suite**
  ```bash
  npx playwright test tests/api/ --reporter=html
  ```
  ✅ Expected: All tests pass, generate HTML report

- [ ] **Database Performance Analysis**
  ```sql
  -- Connect to database and run:
  SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public';
  ```

- [ ] **Connection Pool Status**
  ```sql
  SELECT count(*) as active_connections 
  FROM pg_stat_activity 
  WHERE state = 'active';
  ```
  ✅ Expected: < 80% of max connections

### Log Analysis and Cleanup
- [ ] **Error Pattern Analysis**
  ```bash
  grep "ERROR" server.log | awk '{print $4}' | sort | uniq -c | sort -nr
  ```

- [ ] **Log File Rotation**
  ```bash
  # Archive logs older than 7 days
  find . -name "*.log" -mtime +7 -exec gzip {} \;
  ```

- [ ] **Test Result Archive**
  ```bash
  # Archive old test results
  tar -czf "test-results-$(date +%Y%m%d).tar.gz" test-results/
  ```

### Security Checks
- [ ] **Dependency Vulnerability Scan**
  ```bash
  npm audit --audit-level=moderate
  ```
  ✅ Expected: No high or critical vulnerabilities

- [ ] **API Security Test**
  ```bash
  npx playwright test tests/api/security/ --reporter=line
  ```

---

## Monthly Maintenance (2-3 hours)

### Database Maintenance
- [ ] **Database Statistics Update**
  ```sql
  ANALYZE;
  VACUUM ANALYZE;
  ```

- [ ] **Index Performance Review**
  ```sql
  SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes 
  ORDER BY idx_scan DESC;
  ```

- [ ] **Slow Query Analysis**
  ```sql
  SELECT query, mean_time, calls, total_time
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
  ```

### Performance Optimization
- [ ] **API Performance Benchmarking**
  ```bash
  npx playwright test tests/api/performance/ --reporter=json > monthly-performance-report.json
  ```

- [ ] **Load Testing**
  ```bash
  npx playwright test tests/api/load-testing/ --workers=5
  ```

- [ ] **Memory Leak Detection**
  ```bash
  # Monitor memory usage during extended test run
  npx playwright test tests/api/stress/ --repeat-each=100
  ```

### System Updates
- [ ] **Dependency Updates**
  ```bash
  npm outdated
  npm update
  npm audit fix
  ```

- [ ] **Test Suite Updates**
  - [ ] Review and update test data fixtures
  - [ ] Add tests for new API features
  - [ ] Remove obsolete tests

- [ ] **Documentation Updates**
  - [ ] Update API documentation
  - [ ] Review troubleshooting procedures
  - [ ] Update maintenance procedures

### Backup and Recovery
- [ ] **Database Backup Verification**
  ```bash
  # Verify recent backups exist and are valid
  pg_dump your_database > backup-test.sql
  head -20 backup-test.sql
  rm backup-test.sql
  ```

- [ ] **Recovery Procedure Test**
  - [ ] Test database restore procedure (on test environment)
  - [ ] Verify API functionality after restore
  - [ ] Document any issues found

---

## Quarterly Maintenance (Half day)

### Comprehensive System Review
- [ ] **Architecture Review**
  - [ ] Evaluate current system architecture
  - [ ] Identify performance bottlenecks
  - [ ] Plan infrastructure improvements

- [ ] **Security Audit**
  - [ ] Review access controls
  - [ ] Update security procedures
  - [ ] Test incident response procedures

- [ ] **Disaster Recovery Testing**
  - [ ] Test full system recovery
  - [ ] Verify backup integrity
  - [ ] Update recovery documentation

### Strategic Planning
- [ ] **Performance Trend Analysis**
  - [ ] Analyze 3-month performance data
  - [ ] Identify trends and patterns
  - [ ] Plan capacity improvements

- [ ] **Technology Stack Review**
  - [ ] Evaluate current technologies
  - [ ] Plan upgrades and migrations
  - [ ] Update development roadmap

---

## Emergency Response Checklist

### Immediate Response (0-5 minutes)
- [ ] **Assess Service Status**
  ```bash
  curl -I http://localhost:8091/api/health
  ps aux | grep node
  ```

- [ ] **Check System Resources**
  ```bash
  top -n 1 | head -10
  df -h
  free -m
  ```

- [ ] **Review Recent Logs**
  ```bash
  tail -50 server.log | grep ERROR
  ```

### Short-term Response (5-30 minutes)
- [ ] **Service Restart**
  ```bash
  # Graceful restart
  pm2 restart server
  # Or force restart if needed
  pkill -f node && npm run server &
  ```

- [ ] **Database Connection Check**
  ```bash
  npm run test:db-connection
  ```

- [ ] **Run Diagnostic Tests**
  ```bash
  npx playwright test tests/api/diagnostic/ --reporter=line
  ```

### Recovery Verification
- [ ] **Functionality Test**
  ```bash
  npx playwright test tests/api/smoke-tests/ --reporter=line
  ```

- [ ] **Performance Verification**
  ```bash
  npx playwright test tests/api/performance/response-time.spec.js
  ```

- [ ] **Monitor for Stability**
  - [ ] Watch logs for 15 minutes
  - [ ] Run periodic health checks
  - [ ] Document incident details

---

## Maintenance Log Template

```
Date: ___________
Maintenance Type: [ ] Daily [ ] Weekly [ ] Monthly [ ] Emergency
Performed By: ___________

Tasks Completed:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

Issues Found:
- Issue 1: Description and resolution
- Issue 2: Description and resolution

Performance Metrics:
- API Response Time: _____ ms
- Database Connection Count: _____
- Error Rate: _____%

Next Actions:
- Action 1: Due date
- Action 2: Due date

Notes:
_________________________________
_________________________________
```

---

## Contact Information

**Development Team:**
- Primary: [Developer Name] - [Email] - [Phone]
- Secondary: [Developer Name] - [Email] - [Phone]

**System Administration:**
- Primary: [Admin Name] - [Email] - [Phone]
- Emergency: [Emergency Contact] - [Phone]

**Escalation Path:**
1. Development Team (0-30 minutes)
2. System Administration (30-60 minutes)
3. Management (60+ minutes)

---

**Last Updated:** [Current Date]  
**Version:** 1.0  
**Next Review:** [Date + 3 months]