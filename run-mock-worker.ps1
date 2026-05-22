$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workerRoot = Join-Path $projectRoot "mock-worker"

Write-Host "FireSafe Mock Worker - Portable Python Environment" -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Yellow

Set-Location $workerRoot
if (-not (Test-Path "venv")) {
    Write-Host "Creating venv..." -ForegroundColor Yellow
    python -m venv venv
}

.\venv\Scripts\Activate.ps1
Write-Host "Installing dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt | Out-Null

Write-Host "Running tests..." -ForegroundColor Green
python mock_worker.py
