@echo off
if exist "%~dp0frontend\dist\index.html" (
    echo [Production Mode] Starting single server on http://localhost:3001
    echo   The backend serves both API and the built frontend.
    echo.
    start "Fleet Manager" cmd /k "cd /d "%~dp0backend" && node index.js"
    timeout /t 3 /nobreak >nul
    start "" "http://localhost:3001"
) else (
    echo [Development Mode] Starting two servers...
    echo   Backend:  http://localhost:3001
    echo   Frontend: http://localhost:5173
    echo.
    echo   To build for production: cd frontend ^&^& npm run build
    echo.
    start "Backend" cmd /k "cd /d "%~dp0backend" && node index.js"
    start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
)
