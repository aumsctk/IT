Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

Remove-Item -Force -ErrorAction SilentlyContinue ".git\HEAD.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock"

git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"

Write-Host "=== git status ===" -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "=== diff tickets page ===" -ForegroundColor Cyan
git diff "src/app/(app)/tickets/page.tsx"

Write-Host ""
Write-Host "=== diff globals.css ===" -ForegroundColor Cyan
git diff src/app/globals.css
