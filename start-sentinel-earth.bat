@echo off
rem Sentinel Earth - local server (no-cache). Keep this window open while using the site.
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8000"
py srv.py 8000 2>nul || python srv.py 8000
pause
