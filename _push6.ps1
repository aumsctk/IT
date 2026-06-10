Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

Remove-Item -Force -ErrorAction SilentlyContinue ".git\HEAD.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock"

git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"

# Force git to re-read file metadata
git update-index --really-refresh 2>$null

Write-Host "=== Files on disk ===" -ForegroundColor Cyan
Select-String -Path "src\components\dashboard\DashboardClient.tsx" -Pattern "2\.4|assetTrend"
Select-String -Path "src\app\(app)\dashboard\page.tsx" -Pattern "assetTrend"

Write-Host ""
Write-Host "=== git diff ===" -ForegroundColor Cyan
git diff "src/components/dashboard/DashboardClient.tsx"
git diff "src/app/(app)/dashboard/page.tsx"

Write-Host ""
git add -f src/components/dashboard/DashboardClient.tsx
git add -f "src/app/(app)/dashboard/page.tsx"
git status

$msg = git commit -m "feat: real asset trend calc - compare this month vs last month"
Write-Host $msg

git push origin main

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
