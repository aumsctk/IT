Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

Remove-Item -Force -ErrorAction SilentlyContinue ".git\HEAD.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\config.lock"

git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"
git add src/app/`(auth`)/login/page.tsx src/app/`(app`)/tickets/new/page.tsx
git commit -m "fix: wrap useSearchParams in Suspense for login and tickets/new"
git push origin main

Write-Host ""
Write-Host "=== Pushed! ===" -ForegroundColor Green
