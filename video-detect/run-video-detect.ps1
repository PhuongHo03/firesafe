param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$DetectArgs
)

$ErrorActionPreference = "Stop"

$workerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvDir = Join-Path $workerRoot "venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$requirementsFile = Join-Path $workerRoot "requirements.txt"
$detectFile = Join-Path $workerRoot "detect_video.py"

Write-Host "FireSafe Video Detect - Portable Python Environment" -ForegroundColor Cyan
Write-Host "Worker root: $workerRoot" -ForegroundColor Yellow

Push-Location $workerRoot
try {
    if (-not (Test-Path $venvPython)) {
        Write-Host "Creating venv..." -ForegroundColor Yellow
        python -m venv $venvDir
    }

    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & $venvPython -m pip --disable-pip-version-check install -r $requirementsFile | Out-Null

    Write-Host "Running detection..." -ForegroundColor Green
    & $venvPython $detectFile @DetectArgs
}
finally {
    Pop-Location
}
