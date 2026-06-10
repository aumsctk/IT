@echo off
cd /d "%~dp0"
echo Downloading MinGit (portable, no admin needed)...
PowerShell -ExecutionPolicy Bypass -Command "& { $url='https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/MinGit-2.45.2-64-bit.zip'; $out=$env:TEMP+'\mingit.zip'; Invoke-WebRequest $url -OutFile $out -UseBasicParsing; Expand-Archive $out -DestinationPath '%~dp0.mingit' -Force; Write-Host 'MinGit ready!' }"
echo.
echo Done. Now run _git_init.bat
pause
