$ErrorActionPreference = "Stop"

$workerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvDir = Join-Path $workerRoot "venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$requirementsFile = Join-Path $workerRoot "requirements.txt"
$mockWorkerFile = Join-Path $workerRoot "mock_worker.py"

Write-Host "FireSafe Mock Worker - Portable Python Environment" -ForegroundColor Cyan
Write-Host "Worker root: $workerRoot" -ForegroundColor Yellow

Push-Location $workerRoot
try {
    if (-not (Test-Path $venvPython)) {
        Write-Host "Creating venv..." -ForegroundColor Yellow
        python -m venv $venvDir
    }

    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & $venvPython -m pip --disable-pip-version-check install -r $requirementsFile | Out-Null

    Write-Host "Running tests..." -ForegroundColor Green
    & $venvPython $mockWorkerFile
}
finally {
    Pop-Location
}
