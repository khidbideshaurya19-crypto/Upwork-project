@echo off
echo ====================================
echo Starting MatchFlow Platform
echo ====================================
echo.
echo Starting all servers...
echo - Backend: http://localhost:5000
echo - Client App: http://localhost:3000
echo - Company App: http://localhost:3001
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start backend in new window
start "Backend Server" cmd /k "cd backend && npm run dev"

REM Wait 3 seconds
timeout /t 3 /nobreak >nul

REM Start client app in new window
start "Client App" cmd /k "cd client-app && npm start"

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Start company app in new window
start "Company App" cmd /k "cd company-app && npm start"

echo.
echo ✅ All servers started!
echo.
echo Check the opened terminal windows for logs.
echo.
pause
