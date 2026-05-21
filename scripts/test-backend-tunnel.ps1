param(
  [string]$TunnelUrl = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeUrlPath = Join-Path $repoRoot ".runtime\backend-tunnel-url.txt"
$envPath = Join-Path $repoRoot ".env"

function Read-ConfiguredTunnelUrl {
  if ($TunnelUrl.Trim()) {
    return $TunnelUrl.Trim().TrimEnd("/")
  }

  if (Test-Path $runtimeUrlPath) {
    $line = Get-Content $runtimeUrlPath |
      Where-Object { $_ -match "^VITE_API_BASE_URL=" } |
      Select-Object -First 1
    if ($line) {
      return $line.Split("=", 2)[1].Trim().TrimEnd("/")
    }
  }

  if (Test-Path $envPath) {
    $line = Get-Content $envPath |
      Where-Object { $_ -match "^VITE_API_BASE_URL=" } |
      Select-Object -First 1
    if ($line) {
      return $line.Split("=", 2)[1].Trim().TrimEnd("/")
    }
  }

  throw "No se encontro VITE_API_BASE_URL. Ejecuta npm run tunnel:backend primero."
}

$baseUrl = Read-ConfiguredTunnelUrl

Write-Host "Probando Gravweb backend:"
Write-Host "  $baseUrl"

function Invoke-BackendWebRequest {
  param(
    [string]$Uri,
    [int]$TimeoutSec
  )

  try {
    return Invoke-WebRequest `
      -Uri $Uri `
      -UseBasicParsing `
      -TimeoutSec $TimeoutSec `
      -Headers @{ Accept = "application/json" }
  } catch {
    $normalError = $_.Exception.Message
    $uriObject = [Uri]$Uri

    if ($uriObject.Host -notlike "*.trycloudflare.com") {
      throw $normalError
    }

    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if (-not $curl) {
      throw $normalError
    }

    $dns = Resolve-DnsName $uriObject.Host -Server 1.1.1.1 -Type A -ErrorAction SilentlyContinue |
      Select-Object -First 1

    if (-not $dns) {
      throw $normalError
    }

    $resolveArg = "$($uriObject.Host):443:$($dns.IPAddress)"
    $curlResult = & $curl.Source `
      --resolve $resolveArg `
      --silent `
      --output NUL `
      --write-out "CODE:%{http_code};BYTES:%{size_download}" `
      $Uri

    if ($LASTEXITCODE -ne 0 -or $curlResult -notmatch "CODE:(\d+);BYTES:(\d+)") {
      throw $normalError
    }

    return [pscustomobject]@{
      StatusCode = [int]$Matches[1]
      RawContentLength = [int64]$Matches[2]
    }
  }
}

$started = Get-Date
$health = Invoke-BackendWebRequest -Uri "$baseUrl/health" -TimeoutSec 20
$elapsed = [int]((Get-Date) - $started).TotalMilliseconds

Write-Host "OK /health HTTP $($health.StatusCode) - $elapsed ms - $($health.RawContentLength) bytes"

$projects = Invoke-BackendWebRequest -Uri "$baseUrl/project/user/local-dev-user" -TimeoutSec 20
Write-Host "OK /project/user/local-dev-user HTTP $($projects.StatusCode) - $($projects.RawContentLength) bytes"
