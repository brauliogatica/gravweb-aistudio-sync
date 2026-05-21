param(
  [string]$TargetUrl = "http://127.0.0.1:3100",
  [int]$WaitSeconds = 60,
  [switch]$NoRestart,
  [switch]$StrictHealth
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeDir = Join-Path $repoRoot ".runtime"
$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"
$outLog = Join-Path $runtimeDir "cloudflared-backend.out.log"
$errLog = Join-Path $runtimeDir "cloudflared-backend.err.log"
$pidPath = Join-Path $runtimeDir "cloudflared-backend.pid"
$urlPath = Join-Path $runtimeDir "backend-tunnel-url.txt"

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

function Test-BackendEndpoint {
  param(
    [string]$BaseUrl,
    [int]$TimeoutSec = 10
  )

  $cleanBaseUrl = $BaseUrl.TrimEnd("/")

  try {
    $response = Invoke-BackendWebRequest `
      -Uri "$cleanBaseUrl/health" `
      -TimeoutSec $TimeoutSec

    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
      return [pscustomobject]@{
        Ok = $true
        StatusCode = $response.StatusCode
        Bytes = $response.RawContentLength
      }
    }
  } catch {
    return [pscustomobject]@{
      Ok = $false
      Error = $_.Exception.Message
    }
  }

  return [pscustomobject]@{
    Ok = $false
    Error = "Backend did not return a successful status."
  }
}

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

if (-not $NoRestart) {
  Stop-PreviousTunnel
}

Remove-Item $outLog, $errLog, $urlPath -Force -ErrorAction SilentlyContinue

$localHealth = Test-BackendEndpoint -BaseUrl $TargetUrl -TimeoutSec 5
if ($localHealth.Ok) {
  Write-Host "Gravweb backend local: OK /health HTTP $($localHealth.StatusCode)"
} else {
  if ($StrictHealth) {
    throw "Gravweb backend no responde en $TargetUrl/health. Ejecuta npm run backend:dev antes de abrir el tunel."
  }
  Write-Warning "Gravweb backend no responde todavia en $TargetUrl/health. El tunel se abrira igual."
}

$process = Start-Process `
  -FilePath $cloudflared.Source `
  -ArgumentList @("tunnel", "--url", $TargetUrl, "--no-autoupdate") `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $pidPath -Value $process.Id -Encoding ascii
Write-Host "cloudflared backend iniciado. PID: $($process.Id)"

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

Set-EnvValue -Path $envPath -Key "VITE_API_BASE_URL" -Value $tunnelUrl

@(
  "VITE_API_BASE_URL=$tunnelUrl",
  "",
  "AI Studio:",
  "1. Environment variables -> VITE_API_BASE_URL",
  "2. Pegar este valor: $tunnelUrl",
  "3. Apply / reiniciar preview",
  "",
  "Local:",
  "El .env local fue actualizado en: $envPath"
) | Set-Content -Path $urlPath -Encoding utf8

Write-Host ""
Write-Host "Tunel backend listo:"
Write-Host "  $tunnelUrl"
Write-Host ""
Write-Host "Actualizado:"
Write-Host "  $envPath"
Write-Host "  $urlPath"

$remoteHealth = Test-BackendEndpoint -BaseUrl $tunnelUrl -TimeoutSec 15
if ($remoteHealth.Ok) {
  Write-Host "Gravweb backend via tunel: OK /health HTTP $($remoteHealth.StatusCode)"
} else {
  Write-Warning "El tunel existe, pero /health no responde aun. Inicia backend y vuelve a probar."
}
