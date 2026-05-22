param(
    [Parameter(Position = 0)]
    [ValidateSet("up", "down", "clean")]
    [string]$Command
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ProjectRoot ".runtime"
$LogsDir = Join-Path $RuntimeDir "logs"
$PidsDir = Join-Path $RuntimeDir "pids"
$ComposeFile = Join-Path $ProjectRoot "docker-compose.dev.yml"
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$AIWorkerDir = Join-Path $ProjectRoot "ai-worker"
$JdkDir = Join-Path $ProjectRoot "jdk-21.0.3+9"

function Show-Usage {
    Write-Host "Usage: .\setup.ps1 <up|down|clean>" -ForegroundColor Cyan
    Write-Host "  up     Start Docker infra, backend, frontend; write logs to .runtime/logs/"
    Write-Host "  down   Stop backend/frontend and Docker infra; keep logs"
    Write-Host "  clean  Stop runtime, remove Docker containers/images/volumes, delete .runtime"
}

function Ensure-RuntimeDirs {
    New-Item -ItemType Directory -Force $LogsDir, $PidsDir | Out-Null
}

function Test-PortAvailable([int]$Port) {
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

function Get-FreePort([int]$PreferredPort) {
    $port = $PreferredPort
    while ((-not (Test-PortAvailable $port)) -or ($script:ReservedPorts -contains $port)) {
        $port++
    }
    $script:ReservedPorts += $port
    return $port
}

function Read-PortsEnv {
    $portsFile = Join-Path $RuntimeDir "ports.env"
    if (-not (Test-Path $portsFile)) {
        return $null
    }

    $ports = [ordered]@{}
    foreach ($line in Get-Content $portsFile) {
        if ($line -match "^([^=]+)=(\d+)$") {
            $ports[$matches[1]] = [int]$matches[2]
        }
    }
    return $ports
}

function Set-RuntimePorts {
    $existingPorts = Read-PortsEnv
    $backendRunning = Get-ProcessFromPidFile "backend"
    $frontendRunning = Get-ProcessFromPidFile "frontend"

    if ($existingPorts -and ($backendRunning -or $frontendRunning)) {
        $script:Ports = $existingPorts
    }
    else {
        $script:ReservedPorts = @()
        $script:Ports = [ordered]@{
            BACKEND_PORT       = Get-FreePort 8080
            FRONTEND_PORT      = Get-FreePort 3000
            AI_WORKER_PORT     = Get-FreePort 8090
            MARIADB_PORT       = Get-FreePort 3306
            REDIS_PORT         = Get-FreePort 6379
            RABBITMQ_PORT      = Get-FreePort 5672
            RABBITMQ_UI_PORT   = Get-FreePort 15672
            MINIO_API_PORT     = Get-FreePort 9000
            MINIO_CONSOLE_PORT = Get-FreePort 9001
            ADMINER_PORT       = Get-FreePort 8081
            REDISINSIGHT_PORT  = Get-FreePort 5540
        }
    }

    foreach ($entry in $script:Ports.GetEnumerator()) {
        Set-Item -Path "Env:$($entry.Key)" -Value $entry.Value
    }
}

function Write-PortsEnv {
    $portsFile = Join-Path $RuntimeDir "ports.env"
    $script:Ports.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" } | Set-Content -Path $portsFile -Encoding utf8
    Write-Host "Ports written to .runtime/ports.env" -ForegroundColor Green
}

function Remove-RuntimeArtifacts {
    if (Test-Path $RuntimeDir) {
        Remove-Item -Recurse -Force $RuntimeDir
    }
}

function Get-ProcessFromPidFile([string]$Name) {
    $pidFile = Join-Path $PidsDir "$Name.pid"
    if (-not (Test-Path $pidFile)) {
        return $null
    }

    $rawPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if (-not $rawPid) {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        return $null
    }

    $process = Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
    if (-not $process) {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }

    return $process
}

function Stop-ProcessTree([int]$ProcessId) {
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$ProcessId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-ProcessTree $child.ProcessId
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Get-ProcessByPort([int]$Port) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) {
        return $null
    }

    return Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
}

function Stop-RuntimeProcess([string]$Name, [string]$PortKey) {
    $process = Get-ProcessFromPidFile $Name
    $ports = Read-PortsEnv
    $port = $null

    if ($ports -and $ports.Contains($PortKey)) {
        $port = $ports[$PortKey]
    }

    if ((-not $process) -and $port) {
        $process = Get-ProcessByPort $port
    }

    if ($process) {
        Write-Host "Stopping $Name (PID $($process.Id))..." -ForegroundColor Yellow
        Stop-ProcessTree $process.Id
    }
    else {
        Write-Host "Stopping $Name... not running." -ForegroundColor DarkYellow
    }

    $pidFile = Join-Path $PidsDir "$Name.pid"
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

function Get-BackendLocalEnvCommand {
    $envFile = Join-Path $BackendDir ".env.local"
    if (-not (Test-Path $envFile)) {
        return ""
    }

    $commands = @()
    foreach ($line in Get-Content $envFile) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
            continue
        }

        $parts = $trimmed.Split("=", 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Replace("'", "''")
        if ($name -match "^[A-Za-z_][A-Za-z0-9_]*$") {
            $commands += '$env:' + $name + " = '" + $value + "'; "
        }
    }

    return ($commands -join "")
}

function Start-Backend {
    $running = Get-ProcessFromPidFile "backend"
    if ($running) {
        Write-Host "Backend already running (PID $($running.Id)); keeping existing process." -ForegroundColor Green
        return
    }

    $backendLog = Join-Path $LogsDir "backend.log"
    $backendErr = Join-Path $LogsDir "backend.err.log"
    $backendPid = Join-Path $PidsDir "backend.pid"

    $javaSetup = ""
    if (Test-Path $JdkDir) {
        $javaSetup = '$env:JAVA_HOME = ''' + $JdkDir + '''; $env:PATH = $env:JAVA_HOME + ''\bin;'' + $env:PATH; '
    }

    $envSetup = '$env:BACKEND_PORT = ''' + $script:Ports.BACKEND_PORT + '''; ' +
        '$env:DB_PORT = ''' + $script:Ports.MARIADB_PORT + '''; ' +
        '$env:REDIS_PORT = ''' + $script:Ports.REDIS_PORT + '''; ' +
        '$env:RABBITMQ_PORT = ''' + $script:Ports.RABBITMQ_PORT + '''; ' +
        '$env:MINIO_ENDPOINT = ''http://localhost:' + $script:Ports.MINIO_API_PORT + '''; '

    $command = $javaSetup + $envSetup + (Get-BackendLocalEnvCommand) + '.\mvnw.cmd spring-boot:run'
    $process = Start-Process powershell `
        -WorkingDirectory $BackendDir `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError $backendErr `
        -PassThru `
        -WindowStyle Hidden

    Set-Content -Path $backendPid -Value $process.Id
    Write-Host "Backend starting (PID $($process.Id)); logs: .runtime/logs/backend.log" -ForegroundColor Green
}

function Start-Frontend {
    $running = Get-ProcessFromPidFile "frontend"
    if ($running) {
        Write-Host "Frontend already running (PID $($running.Id)); keeping existing process." -ForegroundColor Green
        return
    }

    $frontendLog = Join-Path $LogsDir "frontend.log"
    $frontendErr = Join-Path $LogsDir "frontend.err.log"
    $frontendPid = Join-Path $PidsDir "frontend.pid"
    $frontendCommand = '$env:NEXT_PUBLIC_API_URL = ''http://localhost:' + $script:Ports.BACKEND_PORT + '''; ' +
        '$env:NEXT_PUBLIC_AI_WORKER_URL = ''http://localhost:' + $script:Ports.AI_WORKER_PORT + '''; ' +
        'npm run dev -- --port ' + $script:Ports.FRONTEND_PORT

    $process = Start-Process powershell `
        -WorkingDirectory $FrontendDir `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand) `
        -RedirectStandardOutput $frontendLog `
        -RedirectStandardError $frontendErr `
        -PassThru `
        -WindowStyle Hidden

    Set-Content -Path $frontendPid -Value $process.Id
    Write-Host "Frontend starting (PID $($process.Id)); logs: .runtime/logs/frontend.log" -ForegroundColor Green
}

function Start-AIWorker {
    $running = Get-ProcessFromPidFile "ai-worker"
    if ($running) {
        Write-Host "AI Worker already running (PID $($running.Id)); keeping existing process." -ForegroundColor Green
        return
    }

    $aiLog = Join-Path $LogsDir "ai-worker.log"
    $aiErr = Join-Path $LogsDir "ai-worker.err.log"
    $aiPid = Join-Path $PidsDir "ai-worker.pid"
    $modelPath = Join-Path $AIWorkerDir "models\wildfire-smoke-fire.pt"
    if (-not (Test-Path $modelPath)) {
        $modelPath = Join-Path $AIWorkerDir "models\best.pt"
    }

    $command = 'if (-not (Test-Path ''venv'')) { python -m venv venv }; ' +
        '.\venv\Scripts\python.exe -m pip install -r requirements.txt | Out-Null; ' +
        '$env:BACKEND_URL = ''http://localhost:' + $script:Ports.BACKEND_PORT + '''; ' +
        '$env:MINIO_URL = ''localhost:' + $script:Ports.MINIO_API_PORT + '''; ' +
        '.\venv\Scripts\python.exe service.py --port ' + $script:Ports.AI_WORKER_PORT +
        ' --model ''' + $modelPath + ''' --backend-url ''http://localhost:' + $script:Ports.BACKEND_PORT + ''' --minio-url ''localhost:' + $script:Ports.MINIO_API_PORT + ''''

    $process = Start-Process powershell `
        -WorkingDirectory $AIWorkerDir `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
        -RedirectStandardOutput $aiLog `
        -RedirectStandardError $aiErr `
        -PassThru `
        -WindowStyle Hidden

    Set-Content -Path $aiPid -Value $process.Id
    Write-Host "AI Worker starting (PID $($process.Id)); logs: .runtime/logs/ai-worker.log" -ForegroundColor Green
}

function Start-Infra {
    $dockerLog = Join-Path $LogsDir "docker.log"
    Write-Host "Starting Docker infrastructure..." -ForegroundColor Cyan
    docker compose -f $ComposeFile up -d | Tee-Object -FilePath $dockerLog
    docker compose -f $ComposeFile logs --no-color | Out-File -FilePath $dockerLog -Append -Encoding utf8
}

function Stop-Infra {
    if (Test-Path $ComposeFile) {
        Write-Host "Stopping Docker infrastructure..." -ForegroundColor Cyan
        docker compose -f $ComposeFile down
    }
}

function Clean-Infra {
    if (Test-Path $ComposeFile) {
        Write-Host "Removing Docker containers, images, volumes, and orphans for this compose project..." -ForegroundColor Yellow
        docker compose -f $ComposeFile down -v --rmi all --remove-orphans
    }
}

if (-not $Command) {
    Show-Usage
    exit 1
}

switch ($Command) {
    "up" {
        Ensure-RuntimeDirs
        Set-RuntimePorts
        Write-PortsEnv
        Start-Infra
        Start-Backend
        Start-Frontend
        Start-AIWorker
        Write-Host "FireSafe runtime started." -ForegroundColor Green
        Write-Host "Logs: .runtime/logs/" -ForegroundColor Cyan
    }
    "down" {
        Ensure-RuntimeDirs
        Stop-RuntimeProcess "ai-worker" "AI_WORKER_PORT"
        Stop-RuntimeProcess "frontend" "FRONTEND_PORT"
        Stop-RuntimeProcess "backend" "BACKEND_PORT"
        Stop-Infra
        Remove-RuntimeArtifacts
        Write-Host "FireSafe runtime stopped. Runtime artifacts removed." -ForegroundColor Green
    }
    "clean" {
        Ensure-RuntimeDirs
        Stop-RuntimeProcess "ai-worker" "AI_WORKER_PORT"
        Stop-RuntimeProcess "frontend" "FRONTEND_PORT"
        Stop-RuntimeProcess "backend" "BACKEND_PORT"
        Clean-Infra
        Remove-RuntimeArtifacts
        Write-Host "FireSafe runtime cleaned. Runtime artifacts removed." -ForegroundColor Green
    }
}
