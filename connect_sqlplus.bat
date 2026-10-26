@echo off
setlocal enabledelayedexpansion
title Oracle SQL*Plus - MediVault Database [localhost:1521/XE]
color 0B
cd /d "%~dp0"

:: Check if user explicitly asked for sysdba or inspection script
if /i "%1"=="sysdba" goto connect_sysdba
if /i "%1"=="admin" goto connect_sysdba
if /i "%1"=="inspect" goto run_inspect
if /i "%1"=="faculty" goto run_inspect

echo ================================================================================
echo         ORACLE SQL*PLUS TERMINAL - MEDIVAULT DATABASE CONNECTOR
echo ================================================================================
echo   Target Database : localhost:1521/XE
echo   Database User   : medivault
echo ================================================================================
echo.

:: 1. Verify SQL*Plus is available in PATH
where sqlplus >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] sqlplus.exe was not found in your system PATH!
    echo         Please ensure Oracle Database 11g XE is installed.
    echo.
    pause
    exit /b 1
)

:: 2. Fast connectivity check
echo [1/2] Checking Oracle Database availability...
python -c "import sys; sys.path.insert(0, 'backend'); from app.core.database import query_all; query_all('SELECT 1 FROM DUAL')" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [+] Oracle Database [localhost:1521/XE] is active and accepting connections.
) else (
    echo       [!] Warning: Unable to ping Oracle Database.
    echo           If connection fails, start OracleServiceXE in services.msc.
)

echo.
echo [2/2] Launching interactive SQL*Plus terminal...
echo ================================================================================
echo.

:: 3. Connect to SQL*Plus with session initialization script
sqlplus medivault/MediVault2026#@localhost:1521/XE @database\sqlplus_init.sql

echo.
echo ================================================================================
echo   Oracle SQL*Plus session has ended.
echo ================================================================================
echo.
pause
exit /b 0

:connect_sysdba
cls
echo ================================================================================
echo         ORACLE SQL*PLUS - CONNECTING AS SYSDBA (ADMINISTRATOR)
echo ================================================================================
echo.
sqlplus / as sysdba
echo.
echo Session ended.
pause
exit /b 0

:run_inspect
cls
echo ================================================================================
echo         ORACLE SQL*PLUS - RUNNING FACULTY INSPECTION SCRIPT
echo ================================================================================
echo.
sqlplus medivault/MediVault2026#@localhost:1521/XE @database\inspect_tables_for_faculty.sql
echo.
echo Inspection script completed.
pause
exit /b 0
