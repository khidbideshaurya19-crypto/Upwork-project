@echo off
title Company App
cd /d "%~dp0company-app"
echo Starting Company App on port 3001...
echo.
set PORT=3001
call npm start
pause
