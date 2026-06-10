Set-Location $PSScriptRoot

# Add common git paths + portable MinGit
$env:PATH = "$PSScriptRoot\.mingit\cmd;$PSScriptRoot\.mingit\bin;C:\Program Files\Git\cmd;C:\Program Files\Git\bin;" + $env:LOCALAPPDATA + "\Programs\Git\cmd;" + $env:PATH

$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "ERROR: Git not found. Please run _install_git.bat first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Git found: $($gitPath.Source)" -ForegroundColor Green

# Set identity
git config user.email "sctk.aum@gmail.com"
git config user.name "Aum"

# Clean locks
Remove-Item -ErrorAction SilentlyContinue ".git\index.lock"
Remove-Item -ErrorAction SilentlyContinue ".git\config.lock"

# Branch, stage, commit
git branch -M main
git add -A
git commit -m "initial commit: ITAM app with Supabase backend"

Write-Host ""
Write-Host "=== Git commit done! ===" -ForegroundColor Green
Write-Host ""

# GitHub push — username hardcoded
$user = "aumsctk"
Write-Host "Running: git remote add origin + push as $user..." -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin "https://github.com/$user/IT.git"
git push -u origin main --force

Write-Host ""
Write-Host "=== Pushed to GitHub! ===" -ForegroundColor Green
Write-Host "Now go to https://vercel.com/new to deploy." -ForegroundColor Yellow
Read-Host "Press Enter to close"
