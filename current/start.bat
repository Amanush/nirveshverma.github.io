@echo off
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 goto py
where py >nul 2>nul
if %errorlevel%==0 goto pylauncher
echo Python was not found. Install it from https://www.python.org/downloads/ and tick "Add python.exe to PATH", then run this file again.
pause
exit /b 1
:py
start "" http://localhost:8000
python -m http.server 8000
goto end
:pylauncher
start "" http://localhost:8000
py -m http.server 8000
:end
