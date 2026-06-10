Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

Write-Host "=== Recent commits ===" -ForegroundColor Cyan
git log --oneline -5

Write-Host ""
Write-Host "=== AppShell.tsx in HEAD ===" -ForegroundColor Cyan
git show HEAD:src/components/layout/AppShell.tsx | Select-String "display|flexDirection|hidden md|pb-16"

Write-Host ""
Write-Host "=== git status ===" -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "=== Attempting commit -a and push ===" -ForegroundColor Yellow
git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"
git add -A
git diff --cached --stat
git commit -m "fix: mobile sidebar - remove inline display:flex override, add main pb-16" 2>&1
git push origin main 2>&1

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
git log --oneline -3
