@echo off
echo ====================================
echo Starting MatchFlow Platform
echo ====================================
echo.
echo Starting all servers...
echo - Backend: http://localhost:5000
echo - Main App: http://localhost:3000
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start backend in new window
start "Backend Server" cmd /k "cd backend && npm run dev"

REM Wait 3 seconds
timeout /t 3 /nobreak >nul

REM Start main app in new window
start "Main App" cmd /k "cd app && npm start"

echo.
echo ✅ All servers started!
echo.
echo Visit http://localhost:3000 to access the application
echo.
pause
