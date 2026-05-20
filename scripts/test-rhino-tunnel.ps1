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

function Test-RhinoEndpoint {
  param(
    [string]$BaseUrl
  )

  $checks = @(
    @{ Path = "/health"; Accept = "application/json" },
    @{ Path = "/"; Accept = "text/html, text/plain, */*" }
  )

  foreach ($check in $checks) {
    try {
      $started = Get-Date
      $response = Invoke-RhinoWebRequest `
        -Uri "$BaseUrl$($check.Path)" `
        -Accept $check.Accept `
        -TimeoutSec 20
      $elapsed = [int]((Get-Date) - $started).TotalMilliseconds

      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        return [pscustomobject]@{
          Ok = $true
          Path = $check.Path
          StatusCode = $response.StatusCode
          ElapsedMs = $elapsed
          Bytes = $response.RawContentLength
        }
      }
    } catch {
      $script:lastRhinoEndpointError = $_.Exception.Message
    }
  }

  return [pscustomobject]@{
    Ok = $false
    Error = $script:lastRhinoEndpointError
  }
}

function Invoke-RhinoWebRequest {
  param(
    [string]$Uri,
    [string]$Accept,
    [int]$TimeoutSec
  )

  try {
    return Invoke-WebRequest `
      -Uri $Uri `
      -UseBasicParsing `
      -TimeoutSec $TimeoutSec `
      -Headers @{ Accept = $Accept }
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
      --location `
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

$baseUrl = Read-ConfiguredTunnelUrl

Write-Host "Probando Rhino Compute:"
Write-Host "  $baseUrl"

$health = Test-RhinoEndpoint -BaseUrl $baseUrl

if (-not $health.Ok) {
  throw "Rhino Compute no respondio en /health ni en /. $($health.Error)"
}

Write-Host "OK $($health.Path) HTTP $($health.StatusCode) - $($health.ElapsedMs) ms - $($health.Bytes) bytes"
