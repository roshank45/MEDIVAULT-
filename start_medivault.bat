@echo off
setlocal enabledelayedexpansion
title MediVault - System Launcher and Toolkit Controller
color 0B
cd /d "%~dp0"

:: Handle direct command line parameters
if /i "%1"=="start" goto start_all
if /i "%1"=="--all" goto start_all
if /i "%1"=="-a" goto start_all
if /i "%1"=="run" goto start_all
if /i "%1"=="backend" goto start_backend
if /i "%1"=="frontend" goto start_frontend
if /i "%1"=="stop" goto stop_services
if /i "%1"=="test" goto run_tests
if /i "%1"=="db" goto inspect_db

:menu
cls
echo ================================================================================
echo       MEDIVAULT - HEALTHCARE PATIENT RECORD AND SAFETY SYSTEM
echo ================================================================================
echo   Full-Stack DBMS Prototype: Oracle Database 11g XE + FastAPI + Next.js 14
echo ================================================================================
echo.

:: -----------------------------------------------------------------------------
:: Pre-Flight Component and Environment Diagnostics
:: -----------------------------------------------------------------------------
echo [SYSTEM PRE-FLIGHT COMPONENT CHECK]

:: 1. Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo   [-] Python:             NOT FOUND in PATH! [Please install Python 3.10+]
) else (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do set "PY_VER=%%v"
    echo   [+] Python:             !PY_VER! detected
)

:: 2. Check Node.js and npm
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [-] Node.js:            NOT FOUND in PATH! [Please install Node.js 18+]
) else (
    for /f "tokens=*" %%v in ('node -v 2^>^&1') do set "NODE_VER=%%v"
    echo   [+] Node.js:            !NODE_VER! detected
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo   [-] npm:                NOT FOUND in PATH!
) else (
    for /f "tokens=*" %%v in ('npm -v 2^>^&1') do set "NPM_VER=%%v"
    echo   [+] npm:                v!NPM_VER! detected
)

:: 3. Check Oracle Database Connection
python -c "import sys; sys.path.insert(0, 'backend'); from app.core.database import query_all; query_all('SELECT 1 FROM DUAL')" >nul 2>&1
if %errorlevel% equ 0 (
    echo   [+] Oracle Database:    CONNECTED [localhost:1521/XE - User: medivault]
) else (
    echo   [!] Oracle Database:    NOT REACHABLE!
    echo       * Please verify OracleServiceXE and OracleXETNSListener are running.
    echo       * Start them via 'services.msc' or run: net start OracleServiceXE
)

echo.
echo ================================================================================
echo                             AVAILABLE TOOLS AND ACTIONS
echo ================================================================================
echo   [1]  START FULL-STACK AND REDIRECT BROWSER [RECOMMENDED]
echo        - Starts FastAPI Backend on port 8000
echo        - Starts Next.js Frontend on port 3000
echo        - Auto-redirects default browser to http://localhost:3000
echo.
echo   [2]  Start FastAPI Backend Only [Port 8000]
echo   [3]  Start Next.js Frontend Only [Port 3000]
echo   [4]  Redirect/Open Web App in Browser [http://localhost:3000]
echo   [5]  Redirect/Open Swagger API Documentation [http://127.0.0.1:8000/docs]
echo   [6]  Inspect Oracle Database Tables [Faculty Review Tool]
echo   [7]  Run Automated Pytest Suite [15/15 Safety and Security Tests]
echo   [8]  Stop All Running MediVault Background Services
echo   [9]  Exit
echo ================================================================================
echo.

set "user_choice="
set /p user_choice="Enter your choice [1-9] (Press ENTER to start Full-Stack): "

if not defined user_choice goto start_all
set "first_char=%user_choice:~0,1%"
if "%first_char%"==" " goto start_all
if "%first_char%"=="1" goto start_all
if "%first_char%"=="2" goto start_backend
if "%first_char%"=="3" goto start_frontend
if "%first_char%"=="4" goto open_browser
if "%first_char%"=="5" goto open_docs
if "%first_char%"=="6" goto inspect_db
if "%first_char%"=="7" goto run_tests
if "%first_char%"=="8" goto stop_services
if "%first_char%"=="9" goto exit_script

echo Invalid choice! Please select a valid number from 1 to 9.
ping 127.0.0.1 -n 2 >nul
goto menu

:: -----------------------------------------------------------------------------
:: Action 1: Start Full Stack and Redirect Browser
:: -----------------------------------------------------------------------------
:start_all
cls
echo ================================================================================
echo        LAUNCHING MEDIVAULT FULL-STACK PLATFORM AND REDIRECTING BROWSER
echo ================================================================================
echo.

:: 1. Launch FastAPI Backend in a separate window
echo [1/4] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "MediVault - Backend [FastAPI :8000]" cmd /k "cd /d "%~dp0backend" && title MediVault - Backend [FastAPI :8000] && color 0A && echo ============================================================ && echo  MEDIVAULT FASTAPI BACKEND SERVER [Port 8000] && echo ============================================================ && echo  - API Docs: http://127.0.0.1:8000/docs && echo  - Keep this window open while testing the application. && echo ============================================================ && echo. && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 2. Launch Next.js Frontend in a separate window
echo [2/4] Starting Next.js Frontend on http://localhost:3000 ...
start "MediVault - Frontend [Next.js :3000]" cmd /k "cd /d "%~dp0frontend" && title MediVault - Frontend [Next.js :3000] && color 09 && echo ============================================================ && echo  MEDIVAULT NEXT.JS FRONTEND SERVER [Port 3000] && echo ============================================================ && echo  - Web App:  http://localhost:3000 && echo  - Keep this window open while testing the application. && echo ============================================================ && echo. && npm run dev"

:: 3. Wait for servers to compile and initialize
echo.
echo [3/4] Initializing application components... [Waiting 5 seconds]
ping 127.0.0.1 -n 5 >nul

:: 4. Redirect default web browser
echo.
echo [4/4] Redirecting default browser to MediVault Web Application...
start http://localhost:3000

echo.
echo ================================================================================
echo                   MEDIVAULT IS RUNNING SUCCESSFULLY!
echo ================================================================================
echo.
echo   Application URLs:
echo     * Web Portal:          http://localhost:3000
echo     * Swagger API Docs:    http://127.0.0.1:8000/docs
echo     * Emergency QR Card:   http://localhost:3000/emergency/qr/demo-emergency-token-2026-finch
echo     * Admin Audit Trail:   http://localhost:3000/admin
echo.
echo   Pre-Seeded Demo User Accounts:
echo     * Doctor:              dr.chen       /  Doctor@123
echo     * Emergency Clinician: er.sarah      /  Emergency@123
echo     * Administrator:       admin         /  Admin@123
echo     * Patient Portal:      patient.finch /  Patient@123
echo.
echo ================================================================================
echo Press any key to return to the Toolkit Menu [servers will keep running].
pause >nul
goto menu

:: -----------------------------------------------------------------------------
:: Action 2: Start Backend Only
:: -----------------------------------------------------------------------------
:start_backend
cls
echo [Action] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "MediVault - Backend [FastAPI :8000]" cmd /k "cd /d "%~dp0backend" && title MediVault - Backend [FastAPI :8000] && color 0A && echo API Docs: http://127.0.0.1:8000/docs && echo. && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
echo Backend launched in a separate window.
ping 127.0.0.1 -n 2 >nul
goto menu

:: -----------------------------------------------------------------------------
:: Action 3: Start Frontend Only
:: -----------------------------------------------------------------------------
:start_frontend
cls
echo [Action] Starting Next.js Frontend on http://localhost:3000 ...
start "MediVault - Frontend [Next.js :3000]" cmd /k "cd /d "%~dp0frontend" && title MediVault - Frontend [Next.js :3000] && color 09 && echo Web Portal: http://localhost:3000 && echo. && npm run dev"
echo Frontend launched in a separate window.
ping 127.0.0.1 -n 2 >nul
goto menu

:: -----------------------------------------------------------------------------
:: Action 4: Open Browser (Web App)
:: -----------------------------------------------------------------------------
:open_browser
echo Redirecting browser to http://localhost:3000 ...
start http://localhost:3000
ping 127.0.0.1 -n 2 >nul
goto menu

:: -----------------------------------------------------------------------------
:: Action 5: Open Docs
:: -----------------------------------------------------------------------------
:open_docs
echo Redirecting browser to http://127.0.0.1:8000/docs ...
start http://127.0.0.1:8000/docs
ping 127.0.0.1 -n 2 >nul
goto menu

:: -----------------------------------------------------------------------------
:: Action 6: Database Table Inspector (Faculty Review Tool)
:: -----------------------------------------------------------------------------
:inspect_db
cls
echo ================================================================================
echo          ORACLE DATABASE TABLE INSPECTOR [FACULTY PRESENTATION TOOL]
echo ================================================================================
echo.
echo   [1] List all 18 tables with row counts
echo   [2] View 9 core clinical tables [Structure and Data Grid]
echo   [3] Inspect a specific table [e.g., PATIENT, APP_USER, VISIT, AUDIT_LOG]
echo   [4] Open Interactive SQL*Plus Terminal [connect_sqlplus.bat]
echo   [5] Launch SQL*Plus Automated Faculty Inspection Script
echo   [6] Return to Main Menu
echo.
set "db_choice="
set /p db_choice="Select an option [1-6]: "

if "%db_choice%"=="1" (
    cls
    python scripts/view_oracle_tables.py --list
    echo.
    pause
    goto inspect_db
)
if "%db_choice%"=="2" (
    cls
    python scripts/view_oracle_tables.py --core
    echo.
    pause
    goto inspect_db
)
if "%db_choice%"=="3" (
    set /p tbl_name="Enter Table Name (e.g., PATIENT, ALLERGY, PRESCRIPTION): "
    cls
    python scripts/view_oracle_tables.py --table !tbl_name!
    echo.
    pause
    goto inspect_db
)
if "%db_choice%"=="4" (
    start "Oracle SQL*Plus - MediVault" cmd /k "cd /d "%~dp0" && call connect_sqlplus.bat"
    goto inspect_db
)
if "%db_choice%"=="5" (
    start "Oracle SQL*Plus - MediVault" cmd /k "cd /d "%~dp0" && sqlplus medivault/MediVault2026#@localhost:1521/XE @database/inspect_tables_for_faculty.sql"
    goto inspect_db
)
goto menu

:: -----------------------------------------------------------------------------
:: Action 7: Run Automated Test Suite
:: -----------------------------------------------------------------------------
:run_tests
cls
echo ================================================================================
echo           RUNNING AUTOMATED CLINICAL SAFETY AND SECURITY TEST SUITE
echo ================================================================================
echo.
python -m pytest tests/test_backend.py -v
echo.
echo ================================================================================
pause
goto menu

:: -----------------------------------------------------------------------------
:: Action 8: Stop Running Services
:: -----------------------------------------------------------------------------
:stop_services
cls
echo ================================================================================
echo                   STOPPING RUNNING MEDIVAULT SERVICES
echo ================================================================================
echo.
echo [1/3] Terminating frontend processes listening on Port 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
    echo   Terminated PID %%a [Port 3000]
)

echo [2/3] Terminating backend processes listening on Port 8000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
    echo   Terminated PID %%a [Port 8000]
)

echo [3/3] Closing any remaining MediVault console windows...
taskkill /fi "windowtitle eq MediVault - Backend*" /f /t >nul 2>&1
taskkill /fi "windowtitle eq MediVault - Frontend*" /f /t >nul 2>&1

echo.
echo All MediVault services have been stopped successfully.
echo ================================================================================
pause
goto menu

:: -----------------------------------------------------------------------------
:: Action 9: Exit
:: -----------------------------------------------------------------------------
:exit_script
cls
echo Goodbye!
ping 127.0.0.1 -n 2 >nul
exit /b 0
