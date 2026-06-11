# push.ps1 — commit ทุกการเปลี่ยนแปลงแล้ว push ขึ้น GitHub (v2)
# วิธีใช้:  push.bat "ข้อความ commit"   (ถ้าไม่ใส่ จะใช้ "update")
param([string]$m = "update")

Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

git add -A
git commit -m $m
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Push OK ===" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=== Push FAILED (see message above) ===" -ForegroundColor Red
}
git --no-pager log --oneline -3
