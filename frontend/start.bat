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
  echo [ERROR] PM2 is not installed.
  echo.
  echo +------------------------------------------------------------------------------------+
echo ^|                            Installing PM2...                                      ^|
echo +------------------------------------------------------------------------------------+
  echo Installing PM2 globally... This may take a few seconds...
  echo.
  call npm install -g pm2
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install PM2. Please check your network connection.
    pause
    exit /b 1
  )
  echo [SUCCESS] PM2 installed successfully!
) else (
  echo [SUCCESS] PM2 is already installed.
)
echo.

REM Check if a process with the same name already exists and its status
echo +------------------------------------------------------------------------------------+
echo ^|                           Checking Backend Service Status                          ^| 
echo +------------------------------------------------------------------------------------+
call pm2 describe "l4d2-backend" > nul
if %ERRORLEVEL% EQU 0 (
  REM Check the status of the process
  for /f "tokens=2 delims=: " %%a in ('pm2 describe "l4d2-backend" ^| findstr "status"') do set "STATUS=%%a"
  if /i "%STATUS%" EQU "online" (
    echo [INFO] Backend service is already running, no need to start again.
    goto :BackendRunning
  ) else (
    echo [INFO] Backend service exists but is not running, starting it now...
  )
)

REM Start backend server
echo +------------------------------------------------------------------------------------+
echo ^|                           Starting Backend Server                                  ^|
echo +------------------------------------------------------------------------------------+
echo Starting L4D2 Manager Backend Service...
echo Please wait, initializing server...
echo.
call pm2 start backend/index.js --name "l4d2-backend"
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to start backend server.
  pause
  exit /b 1
)
echo [SUCCESS] Backend server started successfully!
echo.
:BackendRunning

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
echo ^|                         Service Started Successfully!                               ^|
echo +------------------------------------------------------------------------------------+
echo L4D2 Manager is now running!
setlocal enabledelayedexpansion
set "PORT=11214"
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if /i "%%a"=="VITE_PORT" set "PORT=%%b"
  )
)
echo Access URL: http://localhost:!PORT!
endlocal
echo Server is managed by PM2, it will auto-restart if needed.
echo.
echo Tips:
echo    - To stop the server: run stop.bat
echo    - To check status: pm2 list
echo    - To view logs: pm2 logs l4d2-backend
echo.
echo All systems ready! Enjoy managing your L4D2 server!
echo.
echo Press any key to exit...
pause > nul