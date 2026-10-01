@echo off
TITLE Update Site Readiness Application
COLOR 0B

echo =====================================================================
echo       Update Site Readiness App from GitHub (Standalone)
echo       Safely pulls code updates without touching local runtime data.
echo =====================================================================
echo.

cd /d "%~dp0"

REM 1. Check Git installation
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not found in your system PATH!
    echo Please install Git for Windows from: https://git-scm.com/
    pause
    exit /b 1
)

REM 2. Pull updates from GitHub
echo [INFO] Fetching and pulling latest code from origin main...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Git pull failed! Please check your network connection or resolve local conflicts.
    pause
    exit /b 1
)

REM 3. Update Python dependencies if virtual environment exists
if exist ".venv\Scripts\python.exe" (
    echo [INFO] Checking and updating Python dependencies...
    .venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
) else if exist "venv\Scripts\python.exe" (
    echo [INFO] Checking and updating Python dependencies...
    venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
)

echo.
echo =====================================================================
echo [SUCCESS] Site Readiness update complete! Local data preserved.
echo You can now run start.bat to launch the application.
echo =====================================================================
echo.
pause
