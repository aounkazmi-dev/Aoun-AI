param([switch]$Demo)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$projectPython = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $projectPython)) {
    throw 'Create the Python environment first. See README.md.'
}
if (-not (Test-Path -LiteralPath 'frontend\dist\index.html')) {
    throw 'Build the frontend first: cd frontend; npm ci; npm run build'
}
if ($Demo) { $env:DEMO_MODE = 'true' }
Write-Host 'AounOS: http://127.0.0.1:8000 (Ctrl+C to stop)'
& $projectPython -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --no-proxy-headers
