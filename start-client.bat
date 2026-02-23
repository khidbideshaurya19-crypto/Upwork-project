@echo off
title Client App
cd /d "%~dp0client-app"
echo Starting Client App on port 3000...
echo.
set PORT=3000
call npm start
pause
