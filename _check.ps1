Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

Write-Host "=== Recent commits ===" -ForegroundColor Cyan
git log --oneline -8

Write-Host ""
Write-Host "=== AppShell.tsx in HEAD (display lines) ===" -ForegroundColor Cyan
git show HEAD:src/components/layout/AppShell.tsx | Select-String "display|hidden md"

Write-Host ""
Write-Host "=== DashboardClient.tsx in HEAD ===" -ForegroundColor Cyan
git show HEAD:src/components/dashboard/DashboardClient.tsx | Select-String "2\.4|assetTrend"

Write-Host ""
Write-Host "=== dashboard/page.tsx in HEAD ===" -ForegroundColor Cyan
git show "HEAD:src/app/(app)/dashboard/page.tsx" | Select-String "assetTrend"
