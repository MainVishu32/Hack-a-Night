@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20 or newer, then reopen this file.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing project dependencies for the first run...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and npm output.
    pause
    exit /b 1
  )
)
call npm run dev
pause
