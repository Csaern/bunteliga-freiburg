@echo off
echo ==========================================
echo      Bunte Liga - Plesk Build Script
echo ==========================================

echo.
echo [1/4] Installing Frontend dependencies...
cd Website
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Building Frontend (React)...
call npm run build
if %errorlevel% neq 0 (
    echo Error building React app.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [3/4] Cleaning old public folder in Backend...
if exist "Backend\public" (
    rmdir /s /q "Backend\public"
)
mkdir "Backend\public"

echo.
echo [4/4] Copying build files to Backend...
xcopy "Website\build\*" "Backend\public\" /E /I /Y
if %errorlevel% neq 0 (
    echo Error copying files.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo      SUCCESS! Ready for Plesk.
echo ==========================================
echo.
echo You can now upload the 'Backend' folder to Plesk.
echo.
pause
