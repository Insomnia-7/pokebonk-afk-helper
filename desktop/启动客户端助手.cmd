@echo off
setlocal
set "TEMP=%~dp0temp"
set "TMP=%~dp0temp"
if not exist "%TEMP%" mkdir "%TEMP%"
powershell.exe -NoLogo -NoProfile -File "%~dp0Launch-Helper.ps1"
if errorlevel 1 pause
