param(
  [string]$TargetUrl = "http://localhost:6001",
  [int]$WaitSeconds = 60,
  [switch]$NoRestart,
  [switch]$StrictHealth
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeDir = Join-Path $repoRoot ".runtime"
$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"
$outLog = Join-Path $runtimeDir "cloudflared-rhino.out.log"
$errLog = Join-Path $runtimeDir "cloudflared-rhino.err.log"
$pidPath = Join-Path $runtimeDir "cloudflared-rhino.pid"
$urlPath = Join-Path $runtimeDir "rhino-tunnel-url.txt"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
  throw "cloudflared no esta instalado o no esta en PATH."
}

function Stop-PreviousTunnel {
  if (Test-Path $pidPath) {
    $oldPid = (Get-Content $pidPath -Raw).Trim()
    if ($oldPid -match "^\d+$") {
      $oldProcess = Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue
      if ($oldProcess) {
        Stop-Process -Id $oldProcess.Id -Force
      }
    }
    Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
  }

  $escapedTarget = [regex]::Escape($TargetUrl)
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -like "cloudflared*" -and
      $_.CommandLine -match "tunnel" -and
      $_.CommandLine -match $escapedTarget
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Set-EnvValue {
  param(
    [string]$Path,
    [string]$Key,
    [string]$Value
  )

  $lines = @()
  if (Test-Path $Path) {
    $lines = @(Get-Content $Path)
  } elseif (Test-Path $envExamplePath) {
    $lines = @(Get-Content $envExamplePath)
  }

  $pattern = "^\s*$([regex]::Escape($Key))="
  $updated = $false
  $next = foreach ($line in $lines) {
    if ($line -match $pattern) {
      "$Key=$Value"
      $updated = $true
    } else {
      $line
    }
  }

  if (-not $updated) {
    $next += "$Key=$Value"
  }

  Set-Content -Path $Path -Value $next -Encoding utf8
}

function Read-TunnelUrl {
  $text = ""
  if (Test-Path $outLog) {
    $text += Get-Content $outLog -Raw -ErrorAction SilentlyContinue
  }
  if (Test-Path $errLog) {
    $text += "`n" + (Get-Content $errLog -Raw -ErrorAction SilentlyContinue)
  }

  $match = [regex]::Match($text, "https://[a-z0-9-]+\.trycloudflare\.com")
  if ($match.Success) {
    return $match.Value
  }
  return $null
}

if (-not $NoRestart) {
  Stop-PreviousTunnel
}

Remove-Item $outLog, $errLog, $urlPath -Force -ErrorAction SilentlyContinue

try {
  $localHealth = Invoke-WebRequest -Uri "$TargetUrl/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "Rhino Compute local: OK HTTP $($localHealth.StatusCode)"
} catch {
  if ($StrictHealth) {
    throw "Rhino Compute no responde en $TargetUrl/health. Levanta Rhino Compute antes de abrir el tunel."
  }
  Write-Warning "Rhino Compute no responde todavia en $TargetUrl/health. El tunel se abrira igual."
}

$process = Start-Process `
  -FilePath $cloudflared.Source `
  -ArgumentList @("tunnel", "--url", $TargetUrl, "--no-autoupdate") `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $pidPath -Value $process.Id -Encoding ascii
Write-Host "cloudflared iniciado. PID: $($process.Id)"

$deadline = (Get-Date).AddSeconds($WaitSeconds)
$tunnelUrl = $null
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 1
  $tunnelUrl = Read-TunnelUrl
  if ($tunnelUrl) {
    break
  }
}

if (-not $tunnelUrl) {
  Write-Host "No se detecto URL publica aun. Revisa logs:"
  Write-Host "  $outLog"
  Write-Host "  $errLog"
  exit 1
}

Set-EnvValue -Path $envPath -Key "VITE_RHINO_COMPUTE_URL" -Value $tunnelUrl
Set-EnvValue -Path $envPath -Key "VITE_MAX_AREA_HECTARES" -Value "100"
Set-EnvValue -Path $envPath -Key "VITE_RHINO_COMPUTE_TIMEOUT_MS" -Value "180000"

@(
  "VITE_RHINO_COMPUTE_URL=$tunnelUrl",
  "",
  "AI Studio:",
  "1. Environment variables -> VITE_RHINO_COMPUTE_URL",
  "2. Pegar este valor: $tunnelUrl",
  "3. VITE_RHINO_COMPUTE_TIMEOUT_MS=180000",
  "4. Apply / reiniciar preview",
  "",
  "Local:",
  "El .env local fue actualizado en: $envPath"
) | Set-Content -Path $urlPath -Encoding utf8

Write-Host ""
Write-Host "Tunel listo:"
Write-Host "  $tunnelUrl"
Write-Host ""
Write-Host "Actualizado:"
Write-Host "  $envPath"
Write-Host "  $urlPath"

try {
  $remoteHealth = Invoke-WebRequest -Uri "$tunnelUrl/health" -UseBasicParsing -TimeoutSec 15
  Write-Host "Rhino Compute via tunel: OK HTTP $($remoteHealth.StatusCode)"
} catch {
  Write-Warning "El tunel existe, pero /health no responde aun. Inicia Rhino Compute y vuelve a probar."
}
