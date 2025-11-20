@echo off
echo.
echo ====================================
echo   Career Echo AI - Complete Setup
echo ====================================
echo.

cd /d "%~dp0"

echo Step 1: Checking environment...
call npm run check:env
if errorlevel 1 (
    echo.
    echo ERROR: Environment variables not configured!
    echo Please update your .env file and try again.
    pause
    exit /b 1
)

echo.
echo Step 2: Starting Backend Server...
start "Backend Server" cmd /k "npm run server:dev"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Step 3: Starting Frontend...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ====================================
echo   Servers are starting!
echo ====================================
echo.
echo Backend: http://localhost:4000
echo Frontend: Will show in the new window
echo.
echo Press any key to close this window...
pause > nul
