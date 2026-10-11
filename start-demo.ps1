# Blockchain IP Registry - PowerShell Launch Script
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  BLOCKCHAIN INTELLECTUAL PROPERTY REGISTRY SIMULATOR" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/3] Starting Local Hardhat Blockchain Node (port 8545)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$scriptDir\blockchain`" && npx hardhat node"

Write-Host "Waiting 5 seconds for local blockchain node to initialize..."
Start-Sleep -Seconds 5

Write-Host "`n[2/3] Deploying IPRegistry.sol Smart Contract..." -ForegroundColor Yellow
Set-Location -Path "$scriptDir\blockchain"
cmd /c "npx hardhat run scripts/deploy.js --network localhost"

Write-Host "`n[3/3] Starting Next.js Web Application (port 3000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$scriptDir\frontend`" && npm run dev"

Write-Host "Waiting 4 seconds for web server to start..."
Start-Sleep -Seconds 4

Write-Host "`nOpening browser at http://localhost:3000..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  SIMULATION READY!" -ForegroundColor Green
Write-Host "  Hardhat Node: http://127.0.0.1:8545 (Chain ID: 31337)"
Write-Host "  Frontend App: http://localhost:3000"
Write-Host "============================================================" -ForegroundColor Cyan
