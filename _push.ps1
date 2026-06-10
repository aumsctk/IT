Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"
git add next.config.js
git commit -m "fix: remove next-pwa, add build flags for Vercel deploy"
git push origin main --force

Write-Host ""
Write-Host "=== Pushed! ===" -ForegroundColor Green
Start-Sleep 2
