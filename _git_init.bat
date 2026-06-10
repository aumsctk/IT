@echo off
cd /d "%~dp0"
start powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0_git_init.ps1"
