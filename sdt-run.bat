@echo off

REM Move to the folder where this .bat file is located
cd /d "%~dp0"

REM Start the SDT server in a new Command Prompt window
start "SDT Server" cmd /k "npm run dev"

REM Give the server a few seconds to start
timeout /t 3 /nobreak >nul

REM Open SDT in the default browser
start "" "http://localhost:4000"

exit