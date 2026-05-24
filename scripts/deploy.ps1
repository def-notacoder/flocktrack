# Deploy Flock Log to a remote server (pull latest from GitHub + Docker prod rebuild).
# Run from the project root:
#   .\scripts\deploy.ps1
#
# Configure in .env (or environment):
#   DEPLOY_USER=rewen
#   DEPLOY_HOST=192.168.2.10
#   DEPLOY_PATH=/servers/flocklog
#   DEPLOY_BRANCH=main
#   DEPLOY_SSH_KEY=          # optional path to private key
#
# Requires: OpenSSH client (ssh), repo cloned on the server at DEPLOY_PATH with git access to GitHub.

$ErrorActionPreference = "Stop"

function Import-DotEnv {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim().Trim('"').Trim("'")
      if (-not [string]::IsNullOrWhiteSpace($name) -and -not (Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue)) {
        Set-Item -Path "Env:$name" -Value $value
      }
    }
  }
}

Set-Location (Join-Path $PSScriptRoot "..")
Import-DotEnv (Join-Path (Get-Location) ".env")

$DeployUser = if ($env:DEPLOY_USER) { $env:DEPLOY_USER } else { "rewen" }
$DeployHost = if ($env:DEPLOY_HOST) { $env:DEPLOY_HOST } else { "192.168.2.10" }
$DeployPath = if ($env:DEPLOY_PATH) { $env:DEPLOY_PATH } else { "/servers/flocklog" }
$DeployBranch = if ($env:DEPLOY_BRANCH) { $env:DEPLOY_BRANCH } else { "main" }
$DeployRemote = if ($env:DEPLOY_GIT_REMOTE) { $env:DEPLOY_GIT_REMOTE } else { "origin" }

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  Write-Error "ssh not found. Install OpenSSH client or use Git for Windows."
}

$SshTarget = "$DeployUser@$DeployHost"
$SshCommon = @("-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new")
if ($env:DEPLOY_SSH_KEY) {
  $SshCommon = @("-i", $env:DEPLOY_SSH_KEY) + $SshCommon
}

$GitSync = @"
set -euo pipefail
cd '$DeployPath'
git fetch '$DeployRemote' '$DeployBranch'
git checkout '$DeployBranch' 2>/dev/null || git checkout -B '$DeployBranch' '$DeployRemote/$DeployBranch'
git reset --hard '$DeployRemote/$DeployBranch'
"@

$RemoteScript = @"
set -euo pipefail
cd '$DeployPath'
if [ -f scripts/deploy-remote.sh ]; then
  bash scripts/deploy-remote.sh
else
  docker compose up -d --build
fi
"@

Write-Host "Deploying $DeployRemote/$DeployBranch to ${SshTarget}:$DeployPath ..." -ForegroundColor Cyan
Write-Host "==> Syncing git on server" -ForegroundColor Cyan
& ssh @SshCommon $SshTarget $GitSync
if ($LASTEXITCODE -ne 0) { Write-Error "Git sync failed (exit $LASTEXITCODE)" }

Write-Host "==> Rebuilding containers" -ForegroundColor Cyan
& ssh @SshCommon $SshTarget $RemoteScript
if ($LASTEXITCODE -ne 0) {
  Write-Error "Deploy failed (exit $LASTEXITCODE)"
}

Write-Host "Done." -ForegroundColor Green
