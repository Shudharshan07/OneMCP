@echo off
echo Building frontend...
cd /d "D:\Projects\Dell\frontend"
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed. Aborting.
    pause
    exit /b 1
)

echo.
echo Starting backend...
cd /d "D:\Projects\Dell\compiler"
start "DAG Proxy Visualizer" cmd /k "venv\Scripts\activate && python main.py"

timeout /t 2 /nobreak >nul
echo.
echo App running at: http://localhost:8000
echo.
pause
