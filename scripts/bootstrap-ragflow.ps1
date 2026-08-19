$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$serviceRoot = Join-Path $projectRoot 'infra\ragflow\upstream'
$serviceParent = Split-Path -Parent $serviceRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI is not installed or not available on PATH.'
}
if (-not (Test-Path -LiteralPath $serviceParent)) {
  New-Item -ItemType Directory -Path $serviceParent | Out-Null
}
if (-not (Test-Path -LiteralPath $serviceRoot)) {
  git clone --depth 1 --branch v0.26.4 https://github.com/infiniflow/ragflow.git $serviceRoot
}
Push-Location (Join-Path $serviceRoot 'docker')
try {
  docker compose -f docker-compose.yml up -d
} finally {
  Pop-Location
}
Write-Output 'RAGFlow service bootstrap requested. Wait for docker logs to show the HTTP server is ready, then create a dataset and copy its ID into .env.local.'
