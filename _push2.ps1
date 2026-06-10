Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

# Remove locks
Remove-Item -Force -ErrorAction SilentlyContinue ".git\HEAD.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\config.lock"

git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"
git add next.config.js
git commit -m "fix: clean next.config.js (remove null bytes)"
git push origin main --force

Write-Host ""
Write-Host "=== Pushed! ===" -ForegroundColor Green
