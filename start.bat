@echo off
title Fleet Management System
cd /d "%~dp0"

:: Install dependencies if missing
if not exist "backend\node_modules" (
    echo [Setup] Installing backend dependencies...
    cd backend && call npm install && cd ..
)
if not exist "frontend\node_modules" (
    echo [Setup] Installing frontend dependencies...
    cd frontend && call npm install && cd ..
)

if exist "frontend\dist\index.html" (
    echo [Production Mode] Starting single server on http://localhost:3001
    echo   Backend serves API + built frontend. Open the URL above.
    echo.
    start "Fleet Manager" cmd /k "cd /d "%~dp0backend" && node index.js"
    timeout /t 3 /nobreak >nul
    start "" "http://localhost:3001"
) else (
    echo [Setup] Building frontend for production...
    cd frontend && call npm run build && cd ..
    if exist "frontend\dist\index.html" (
        echo [Production Mode] Starting single server on http://localhost:3001
        echo.
        start "Fleet Manager" cmd /k "cd /d "%~dp0backend" && node index.js"
        timeout /t 3 /nobreak >nul
        start "" "http://localhost:3001"
    ) else (
        echo [Development Mode] Starting two servers...
        echo   Backend:  http://localhost:3001
        echo   Frontend: http://localhost:5173
        echo.
        start "Backend" cmd /k "cd /d "%~dp0backend" && node index.js"
        start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
    )
)
