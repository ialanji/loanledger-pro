@echo off
echo Killing server process...
taskkill /F /PID 16812 2>nul
timeout /t 2 /nobreak >nul
echo Server killed. Please start it manually with: npm run server
