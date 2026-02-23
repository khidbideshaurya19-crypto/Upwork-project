@echo off
echo ===================================================
echo   MOVING PROJECT OUTSIDE ONEDRIVE
echo ===================================================
echo.
echo This will copy your project to C:\Projects\upwork
echo (outside of OneDrive) to fix the node_modules issue.
echo.
pause

REM Create Projects directory
if not exist "C:\Projects" mkdir "C:\Projects"
if not exist "C:\Projects\upwork" mkdir "C:\Projects\upwork"

echo.
echo Copying files (this may take a moment)...
echo.

REM Copy all files except node_modules and .git
xcopy "%~dp0*" "C:\Projects\upwork\" /E /I /H /Y /EXCLUDE:%~dp0exclude.txt

REM Create exclude file
echo node_modules > "%~dp0exclude.txt"
echo .git >> "%~dp0exclude.txt"

echo.
echo ===================================================
echo   FILES COPIED SUCCESSFULLY!
echo ===================================================
echo.
echo Now installing dependencies...
echo.

cd /d "C:\Projects\upwork\backend"
echo Installing backend dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Backend install failed
    pause
    exit /b 1
)

cd /d "C:\Projects\upwork\client-app"
echo.
echo Installing client-app dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Client-app install failed
    pause
    exit /b 1
)

cd /d "C:\Projects\upwork\company-app"
echo.
echo Installing company-app dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Company-app install failed
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   ALL DEPENDENCIES INSTALLED SUCCESSFULLY!
echo ===================================================
echo.
echo Your project is now at: C:\Projects\upwork
echo.
echo To start the applications:
echo   1. Backend:     cd C:\Projects\upwork\backend     then    node server.js
echo   2. Client-app:  cd C:\Projects\upwork\client-app  then    npm start
echo   3. Company-app: cd C:\Projects\upwork\company-app then    npm start
echo.
echo Opening the new project location in Explorer...
explorer "C:\Projects\upwork"
echo.
pause
