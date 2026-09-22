# Fetch primary-runtime assets into the sha256-keyed download cache.
# Tries the locked URL first, then a mirror fallback, verifying every digest.

$ErrorActionPreference = 'Stop'
$cache = Join-Path $PSScriptRoot '..\.desktop-build\downloads'
New-Item $cache -ItemType Directory -Force | Out-Null

$lock = Get-Content (Join-Path $PSScriptRoot 'primary-runtime-lock.json') -Raw | ConvertFrom-Json
$target = $lock.targets.'win-x64'

$items = @()
$nodeFile = "node-v$($lock.nodeVersion)-$($target.nodeArchive)"
$items += [pscustomobject]@{
  Url = "https://nodejs.org/dist/v$($lock.nodeVersion)/$nodeFile"
  Mirror = "https://npmmirror.com/mirrors/node/v$($lock.nodeVersion)/$nodeFile"
  Sha256 = $target.nodeSha256
}
$pyFile = "cpython-$($lock.pythonVersion)+$($lock.pythonRelease)-$($target.pythonTarget)-install_only_stripped.tar.gz"
$items += [pscustomobject]@{
  Url = "https://github.com/astral-sh/python-build-standalone/releases/download/$($lock.pythonRelease)/$([uri]::EscapeDataString($pyFile))"
  Mirror = "https://ghproxy.net/https://github.com/astral-sh/python-build-standalone/releases/download/$($lock.pythonRelease)/$([uri]::EscapeDataString($pyFile))"
  Sha256 = $target.pythonSha256
}
foreach ($w in @($target.wheels) + @($lock.wheels)) {
  $items += [pscustomobject]@{
    Url = $w.url
    Mirror = $w.url -replace '^https://files\.pythonhosted\.org', 'https://pypi.tuna.tsinghua.edu.cn'
    Sha256 = $w.sha256
  }
}

$failed = @()
foreach ($item in $items) {
  $dest = Join-Path $cache $item.Sha256
  if ((Test-Path $dest) -and ((Get-FileHash $dest -Algorithm SHA256).Hash.ToLower() -eq $item.Sha256)) {
    Write-Host "CACHED  $($item.Sha256.Substring(0,12))"
    continue
  }
  $ok = $false
  foreach ($url in @($item.Url, $item.Mirror)) {
    Write-Host "GET     $url"
    & curl.exe -sSL --retry 2 --connect-timeout 20 -o $dest $url
    if ($LASTEXITCODE -eq 0 -and (Test-Path $dest) -and ((Get-FileHash $dest -Algorithm SHA256).Hash.ToLower() -eq $item.Sha256)) {
      Write-Host "OK      $($item.Sha256.Substring(0,12))  $([math]::Round((Get-Item $dest).Length/1MB,1)) MB"
      $ok = $true
      break
    }
    Remove-Item $dest -Force -ErrorAction SilentlyContinue
  }
  if (-not $ok) { $failed += $item.Sha256; Write-Host "FAIL    $($item.Sha256.Substring(0,12))" }
}
if ($failed.Count -gt 0) { Write-Host "MISSING: $($failed.Count)"; exit 1 }
Write-Host 'ALL CACHED'
