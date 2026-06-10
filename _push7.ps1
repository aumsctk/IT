Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

Remove-Item -Force -ErrorAction SilentlyContinue ".git\HEAD.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock"

git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"
git add src/components/layout/AppShell.tsx
git status
git commit -m "fix: sidebar hidden on mobile - remove inline display:flex that overrode Tailwind hidden class, add pb-16 for bottom nav"
git push origin main

Write-Host ""
Write-Host "=== Pushed! ===" -ForegroundColor Green
