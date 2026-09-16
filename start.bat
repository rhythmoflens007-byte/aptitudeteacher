@echo off
setlocal
title Aptitude Teacher
cd /d "%~dp0"

where python >nul 2>nul || (
  echo Python was not found. Install Python 3.11+ from https://www.python.org/downloads/ and tick "Add python.exe to PATH".
  pause & exit /b 1
)
where npm >nul 2>nul || (
  echo Node.js was not found. Install Node.js 20+ from https://nodejs.org/
  pause & exit /b 1
)

if not exist "apps\api\.venv\Scripts\python.exe" (
  echo [1/2] Setting up the backend. This only happens once...
  python -m venv "apps\api\.venv" || (pause & exit /b 1)
)
"apps\api\.venv\Scripts\python.exe" -m pip install -q -r "apps\api\requirements.txt" || (
  echo Installing backend packages failed. Check your internet connection and try again.
  pause & exit /b 1
)

if not exist "apps\web\node_modules" (
  echo [2/2] Setting up the frontend. This only happens once...
  call npm --prefix apps\web install || (pause & exit /b 1)
)

echo Starting Aptitude Teacher...
start "Aptitude Teacher - backend" cmd /k "cd /d apps\api && .venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"
start "Aptitude Teacher - frontend" cmd /k "npm --prefix apps\web run dev"

echo Waiting for the app to start...
for /l %%i in (1,1,60) do (
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:3000/login -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" && goto ready
  ping -n 2 127.0.0.1 >nul
)
echo The app is taking longer than usual. Check the two server windows for errors.
pause & exit /b 1

:ready
start "" http://localhost:3000
echo.
echo Aptitude Teacher is running at http://localhost:3000
echo Close the two server windows to stop it.
ping -n 6 127.0.0.1 >nul
