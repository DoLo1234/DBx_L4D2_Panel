@echo off
chcp 65001 > nul

REM Clear screen
cls

REM Banner
echo ================================================================================
echo                              L4D2 Manager Server                              
echo ================================================================================
echo                        Left 4 Dead 2 Server Management Tool                        
echo ================================================================================
echo.
REM Check PM2 installation
echo +------------------------------------------------------------------------------------+
echo ^|                           Checking PM2 Installation                                 ^|
echo +------------------------------------------------------------------------------------+
where pm2 > nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] PM2 is not installed. Please run start.bat first.
  pause
  exit /b 1
) else (
  echo [SUCCESS] PM2 is installed.
)
echo.

REM Stop backend server
echo +------------------------------------------------------------------------------------+
echo ^|                            Stopping Backend Server                                ^|
echo +------------------------------------------------------------------------------------+
echo Stopping L4D2 Manager Backend Service...
echo Please wait, stopping server...
echo.
call pm2 delete l4d2-backend
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to stop backend server. Please check if the server is running.
  pause
  exit /b 1
)
echo [SUCCESS] Backend server stopped successfully!
echo.

REM Show server status
echo +------------------------------------------------------------------------------------+
echo ^|                             Server Status                                           ^|
echo +------------------------------------------------------------------------------------+
echo Checking PM2 process list...
echo.
call pm2 list
echo.

REM Final message
echo +------------------------------------------------------------------------------------+
echo ^|                         Service Stopped Successfully!                                ^|
echo +------------------------------------------------------------------------------------+
echo L4D2 Manager has been stopped.
echo.
echo Tips:
echo    - To start the server: run start.bat
echo    - To check status: pm2 list
echo    - To view logs: pm2 logs l4d2-backend
echo.
echo Press any key to exit...
pause > nul