@echo off
TITLE Site Readiness Verification Server
COLOR 0A

echo =====================================================================
echo       Site Readiness Verification Server (Waitress WSGI)
echo                      Runs on Port 3000
echo =====================================================================
echo.

cd /d "%~dp0"

REM 1. Check Python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in your system PATH!
    echo Please install Python 3.10+ and ensure "Add python.exe to PATH" is checked.
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 2. Check existing virtual environment
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    goto :LAUNCH
)

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    goto :LAUNCH
)

REM If neither exists, create .venv and install requirements
echo [INFO] Virtual environment not found. Creating '.venv'...
python -m venv .venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b 1
)

echo [INFO] Virtual environment created successfully.
echo [INFO] Installing required dependencies (this may take a few minutes)...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install requirements. Please check your internet connection.
    pause
    exit /b 1
)

:LAUNCH
REM 3. Launch Production Waitress WSGI Server on Port 3000
echo.
echo [INFO] Starting multi-threaded Waitress WSGI server on port 3000...
echo [INFO] Local URL:   http://localhost:3000
echo [INFO] Network URL: http://0.0.0.0:3000
echo [INFO] Press Ctrl + C to stop the server.
echo.
python scripts\run_server.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server terminated unexpectedly with exit code %errorlevel%.
)

pause
