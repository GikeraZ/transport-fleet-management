@echo off
echo ========================================
echo  Fleet Management System - Setup Script
echo ========================================
echo.

echo Step 1: Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend dependency installation failed
    pause
    exit /b 1
)
echo Backend dependencies installed successfully.
echo.

echo Step 2: Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend dependency installation failed
    pause
    exit /b 1
)
echo Frontend dependencies installed successfully.
echo.

echo Step 3: Setting up database schema...
cd /d "%~dp0"
echo   Make sure PostgreSQL is running and the fleet_management database exists.
echo   If not, create it with: createdb -U postgres fleet_management
echo.
echo   Applying schema...
psql -U postgres -d fleet_management -f database\schema.sql
if %errorlevel% neq 0 (
    echo WARNING: Schema application had issues. Check PostgreSQL connection.
    echo   You can manually run: psql -U postgres -d fleet_management -f database\schema.sql
)

echo.
echo Step 4: Running database seed...
cd /d "%~dp0backend"
node src/utils/seed.js
if %errorlevel% neq 0 (
    echo WARNING: Seed script had issues. Check the error messages above.
)

echo.
echo ========================================
echo  Setup complete!
echo.
echo  To start the system, run: start.bat
echo  Or manually:
echo    Backend:  cd backend ^&^& node index.js
echo    Frontend: cd frontend ^&^& npm run dev
echo.
echo  Default login credentials:
echo    Admin:   admin@fleetmgmt.com / admin123
echo    Driver:  j.wilson@example.com / driver123
echo    Mechanic: d.patel@example.com / mechanic123
echo    Client:  greenvalleyfarm@example.com / client123
echo ========================================
pause
