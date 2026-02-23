@echo off
title Backend Server
cd /d "%~dp0backend"
echo Starting Backend Server on port 5000...
echo.
call node server.js
pause
