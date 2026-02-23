@echo off
echo ====================================
echo MatchFlow Platform Setup
echo ====================================
echo.

echo [1/3] Installing Backend Dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/3] Installing Client App Dependencies...
cd client-app
call npm install
if %errorlevel% neq 0 (
    echo Error installing client-app dependencies!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [3/3] Installing Company App Dependencies...
cd company-app
call npm install
if %errorlevel% neq 0 (
    echo Error installing company-app dependencies!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ====================================
echo ✅ Installation Complete!
echo ====================================
echo.
echo Next Steps:
echo 1. Edit backend\.env and add your MongoDB URI
echo 2. Run start-all.bat to start all servers
echo.
echo Or run them individually:
echo - Backend: cd backend ^&^& npm run dev
echo - Client: cd client-app ^&^& npm start
echo - Company: cd company-app ^&^& npm start
echo.
pause
