@echo off
start "Backend" cmd /k "cd /d "%~dp0backend" && node index.js"
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo Both servers starting...
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
