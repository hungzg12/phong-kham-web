@echo off
chcp 65001 >nul
node "%~dp0scripts\stop-clinic.mjs"
if errorlevel 1 pause
