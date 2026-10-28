@echo off
chcp 65001 >nul
node "%~dp0scripts\start-clinic.mjs"
if errorlevel 1 pause
