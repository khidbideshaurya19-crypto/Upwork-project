@echo off
echo ====================================
echo   Starting Development Environment
echo ====================================
echo.
echo Backend will start on: http://localhost:5000
echo Frontend will start on: http://localhost:3000
echo   - Clients login and see client dashboard
echo   - Companies login and see company dashboard
echo.
echo Starting Backend...
start cmd /k "cd backend && npm start"
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend...
start cmd /k "cd app && npm start"
echo.
echo ====================================
echo All applications are starting!
echo ====================================
echo.
echo Press any key to close this window.
pause >nul
