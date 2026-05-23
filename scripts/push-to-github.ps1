# One-time setup: log in to GitHub and push Flock Log.
# Run from PowerShell in the project root:
#   cd C:\Users\butte\Projects\flocktrack
#   .\scripts\push-to-github.ps1

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\bin;C:\Program Files\GitHub CLI;" + $env:Path

Set-Location $PSScriptRoot\..

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "Git not found. Install with: winget install Git.Git"
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI not found. Install with: winget install GitHub.cli"
}

$authOk = $true
gh auth status *> $null
if ($LASTEXITCODE -ne 0) { $authOk = $false }

if (-not $authOk) {
  Write-Host "Log in to GitHub (browser will open)..." -ForegroundColor Cyan
  gh auth login -h github.com -p https -w
}

$user = gh api user --jq '.login'
try {
  $email = gh api user/emails --jq '.[] | select(.primary==true) | .email' 2>$null
} catch {
  $email = $null
}
if (-not $email) {
  $email = "$user@users.noreply.github.com"
}

$name = gh api user --jq '.name'
if (-not $name -or $name -eq "null") { $name = $user }

Write-Host "Using Git identity: $name <$email>" -ForegroundColor Gray

if (-not (Test-Path .git)) { git init; git branch -M main }

if (-not (git rev-parse HEAD 2>$null)) {
  git add .
  git -c user.name="$name" -c user.email="$email" commit -m "Initial commit: Flock Log poultry tracking PWA." -m "Express/Prisma API with React client for incubation, eggs, flock, and health logging."
} else {
  Write-Host "Commit already exists; skipping commit." -ForegroundColor Yellow
}

$repoName = "flocktrack"
Write-Host "Creating GitHub repo $user/$repoName (private)..." -ForegroundColor Cyan
gh repo create $repoName --private --source=. --remote=origin --push

Write-Host ""
Write-Host "Done! Repository:" -ForegroundColor Green
gh repo view --web
