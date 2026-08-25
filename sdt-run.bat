@echo off
cd /d C:\Users\kyawz\Documents\GitHub\Self-Development-Tracker-SDT-local-

REM Start the server in a new terminal window
start cmd /k "npm run dev"

REM Give the server a moment to start
timeout /t 3 >nul

REM Open SDT in the default browser
start http://localhost:4000
