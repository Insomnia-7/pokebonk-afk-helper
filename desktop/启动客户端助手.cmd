@echo off
setlocal
set "TEMP=%~dp0temp"
set "TMP=%~dp0temp"
if not exist "%TEMP%" mkdir "%TEMP%"
set "PB_POWERSHELL=powershell.exe"
if exist "%ProgramFiles%\PowerShell\7\pwsh.exe" set "PB_POWERSHELL=%ProgramFiles%\PowerShell\7\pwsh.exe"
"%PB_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Launch-Helper.ps1"
if errorlevel 1 pause
