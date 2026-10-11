@echo off
title Blockchain IP Registry - Launch Simulator
echo ============================================================
echo   BLOCKCHAIN INTELLECTUAL PROPERTY REGISTRY SIMULATOR
echo ============================================================
echo.
echo [1/3] Starting Local Hardhat Blockchain Node (port 8545)...
start "Hardhat EVM Node" cmd /k "cd /d %~dp0blockchain && npx hardhat node"

echo Waiting 5 seconds for local blockchain node to initialize...
timeout /t 5 /nobreak >nul

echo.
echo [2/3] Deploying IPRegistry.sol Smart Contract...
cd /d %~dp0blockchain
call npx hardhat run scripts/deploy.js --network localhost

echo.
echo [3/3] Starting Next.js Web Application (port 3000)...
start "Next.js Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Waiting 4 seconds for web server to start...
timeout /t 4 /nobreak >nul

echo.
echo Opening browser at http://localhost:3000...
start http://localhost:3000

echo.
echo ============================================================
echo   SIMULATION READY! 
echo   Hardhat Node: http://127.0.0.1:8545 (Chain ID: 31337)
echo   Frontend App: http://localhost:3000
echo ============================================================
pause
