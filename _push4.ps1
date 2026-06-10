Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

Remove-Item -Force -ErrorAction SilentlyContinue ".git\HEAD.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock"

git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"
git add src/components/dashboard/DashboardClient.tsx
git commit -m "fix: remove Demo badge from dashboard"
git push origin main

Write-Host ""
Write-Host "=== Pushed! ===" -ForegroundColor Green
