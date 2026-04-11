@echo off
setlocal

REM Check and request admin privileges using VBScript
fltmc >nul 2>&1 || (
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /b
)

REM Set working directory to script location
cd /d "%~dp0"

REM Clear screen
cls

REM Banner
echo ================================================================================
echo                              L4D2 Manager Server
echo ================================================================================
echo                        Left 4 Dead 2 Server Management Tool
echo ================================================================================
echo.

REM Start backend server directly (no PM2)
echo +------------------------------------------------------------------------------------+
echo ^|                           Starting Backend Server                                  ^|
echo +------------------------------------------------------------------------------------+
echo Starting L4D2 Manager Backend Service...
echo Please wait, initializing server...
echo.

REM Start backend in a new window and keep it running
start "L4D2 Backend" cmd /k "cd /d ""%~dp0"" && node backend/index.js"

echo [SUCCESS] Backend server started successfully!
echo.

REM Final message
echo +------------------------------------------------------------------------------------+
echo ^|                         Service Started Successfully!                               ^|
echo +------------------------------------------------------------------------------------+
echo L4D2 Manager Backend is now running in a separate window!
echo.
set "PORT=11214"
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if /i "%%a"=="VITE_PORT" set "PORT=%%b"
  )
)
echo Access URL: http://localhost:%PORT%
echo.
echo Tips:
echo    - To stop the server: Close the backend window or press Ctrl+C
echo.
echo All systems ready! Enjoy managing your L4D2 server!
echo.
endlocal
