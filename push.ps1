# push.ps1 — commit ทุกการเปลี่ยนแปลงแล้ว push ขึ้น GitHub
# วิธีใช้:  push.bat "ข้อความ commit"   (ถ้าไม่ใส่ จะใช้ "update")
param([string]$m = "update")

Set-Location $PSScriptRoot
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;" + $env:PATH

git add -A
git commit -m $m
git push origin main 2>&1

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
git log --oneline -3
