@echo off
chcp 65001 >nul
title MediVault - Service Shutdown Utility
color 0C
cd /d "%~dp0"

echo ================================================================================
echo                   STOPPING MEDIVAULT BACKGROUND SERVICES
echo ================================================================================
echo.

echo [1/3] Terminating Frontend processes on Port 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
    echo   Terminated PID %%a (Port 3000)
)

echo [2/3] Terminating Backend processes on Port 8000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
    echo   Terminated PID %%a (Port 8000)
)

echo [3/3] Closing MediVault terminal windows...
taskkill /fi "windowtitle eq MediVault - Backend*" /f /t >nul 2>&1
taskkill /fi "windowtitle eq MediVault - Frontend*" /f /t >nul 2>&1

echo.
echo ================================================================================
echo               ALL MEDIVAULT SERVICES HAVE BEEN STOPPED CLEANLY
echo ================================================================================
ping 127.0.0.1 -n 3 >nul
exit /b 0
