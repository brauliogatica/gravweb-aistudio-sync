param(
  [string]$TunnelUrl = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeUrlPath = Join-Path $repoRoot ".runtime\rhino-tunnel-url.txt"
$envPath = Join-Path $repoRoot ".env"

function Read-ConfiguredTunnelUrl {
  if ($TunnelUrl.Trim()) {
    return $TunnelUrl.Trim().TrimEnd("/")
  }

  if (Test-Path $runtimeUrlPath) {
    $line = Get-Content $runtimeUrlPath |
      Where-Object { $_ -match "^VITE_RHINO_COMPUTE_URL=" } |
      Select-Object -First 1
    if ($line) {
      return $line.Split("=", 2)[1].Trim().TrimEnd("/")
    }
  }

  if (Test-Path $envPath) {
    $line = Get-Content $envPath |
      Where-Object { $_ -match "^VITE_RHINO_COMPUTE_URL=" } |
      Select-Object -First 1
    if ($line) {
      return $line.Split("=", 2)[1].Trim().TrimEnd("/")
    }
  }

  throw "No se encontro VITE_RHINO_COMPUTE_URL. Ejecuta npm run tunnel:rhino primero."
}

$baseUrl = Read-ConfiguredTunnelUrl

Write-Host "Probando Rhino Compute:"
Write-Host "  $baseUrl"

$started = Get-Date
$health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 20
$elapsed = [int]((Get-Date) - $started).TotalMilliseconds

Write-Host "OK /health HTTP $($health.StatusCode) - $elapsed ms - $($health.RawContentLength) bytes"
