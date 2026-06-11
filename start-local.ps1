$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledNode = 'C:\Users\defip\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$nodePath = if (Test-Path -LiteralPath $bundledNode) {
    $bundledNode
} elseif ($nodeCommand) {
    $nodeCommand.Source
} else {
    ''
}

if (-not (Test-Path -LiteralPath $nodePath)) {
    Write-Host 'Node.js est introuvable.' -ForegroundColor Red
    Write-Host 'Installez la version LTS depuis https://nodejs.org puis relancez ce script.'
    exit 1
}

Set-Location -LiteralPath $projectDir
Write-Host 'MAMAFI demarre sur http://localhost:3000' -ForegroundColor Green
Write-Host 'Administration : http://localhost:3000/admin.html'
Write-Host 'Appuyez sur Ctrl+C pour arreter le serveur.'
& $nodePath 'server.js'
