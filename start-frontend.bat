@echo off
echo Starting Frontend Applications...
echo.
echo Client App will start on: http://localhost:3000
echo Company App will start on: http://localhost:3001
echo.
start cmd /k "cd app && npm start"
timeout /t 2 /nobreak >nul
start cmd /k "cd company-app && npm start"
echo.
echo Both frontend applications are starting...
echo Press any key to close this window.
pause >nul
