@echo off
echo === Killing processes on port 3001 ===
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo === Waiting 2 seconds ===
timeout /t 2 /nobreak >nul

echo.
echo === Starting server ===
echo Press Ctrl+C to stop
npm run server
