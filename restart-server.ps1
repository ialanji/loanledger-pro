# PowerShell script to restart the server

Write-Host "=== Restarting Server ===" -ForegroundColor Cyan

# Find and kill processes on port 3001
Write-Host "`nFinding processes on port 3001..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "Found $($processes.Count) process(es) on port 3001" -ForegroundColor Yellow
    foreach ($pid in $processes) {
        Write-Host "Killing process $pid..." -ForegroundColor Red
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Waiting for port to be released..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
} else {
    Write-Host "No processes found on port 3001" -ForegroundColor Green
}

# Start the server
Write-Host "`nStarting server..." -ForegroundColor Green
Write-Host "Run this command in a new terminal:" -ForegroundColor Cyan
Write-Host "npm run server" -ForegroundColor White

Write-Host "`nOr run it here (Ctrl+C to stop):" -ForegroundColor Cyan
npm run server
