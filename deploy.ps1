# ============================================================
# deploy.ps1 — Run this in PowerShell inside the project folder
# ============================================================

Set-Location $PSScriptRoot

# 1. Clean stale git locks
Write-Host "Cleaning git locks..." -ForegroundColor Cyan
Remove-Item -ErrorAction SilentlyContinue ".git\index.lock"
Remove-Item -ErrorAction SilentlyContinue ".git\config.lock"

# 2. Rename branch to main
Write-Host "Setting branch to main..." -ForegroundColor Cyan
git branch -M main

# 3. Stage everything
Write-Host "Staging all files..." -ForegroundColor Cyan
git add -A

# 4. First commit
Write-Host "Creating initial commit..." -ForegroundColor Cyan
git commit -m "initial commit: ITAM app with Supabase backend"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Git ready! Now do these steps:" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "STEP 1 — Create GitHub repo:" -ForegroundColor Yellow
Write-Host "  Go to https://github.com/new"
Write-Host "  Name: itam-app"
Write-Host "  Private or Public (your choice)"
Write-Host "  DO NOT add README / .gitignore"
Write-Host "  Click Create repository"
Write-Host ""
Write-Host "STEP 2 — Copy the repo URL (looks like):" -ForegroundColor Yellow
Write-Host "  https://github.com/YOUR-USERNAME/itam-app.git"
Write-Host ""
Write-Host "STEP 3 — Run in this terminal:" -ForegroundColor Yellow
Write-Host '  git remote add origin https://github.com/YOUR-USERNAME/itam-app.git'
Write-Host "  git push -u origin main"
Write-Host ""
Write-Host "STEP 4 — Go to https://vercel.com/new" -ForegroundColor Yellow
Write-Host "  Import the GitHub repo"
Write-Host "  Add env vars:"
Write-Host "    NEXT_PUBLIC_SUPABASE_URL"
Write-Host "    NEXT_PUBLIC_SUPABASE_ANON_KEY"
Write-Host "    SUPABASE_SERVICE_ROLE_KEY"
Write-Host "  Deploy!"
