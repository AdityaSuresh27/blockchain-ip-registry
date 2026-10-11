const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying IPRegistry...");

  // We get the contract to deploy
  const IPRegistry = await hre.ethers.getContractFactory("IPRegistry");
  const ipRegistry = await IPRegistry.deploy();

  await ipRegistry.waitForDeployment();
  const address = await ipRegistry.getAddress();

  console.log("IPRegistry deployed to:", address);

  // Save the contract's artifacts and address to the frontend directory
  saveFrontendFiles(ipRegistry, address);
}

function saveFrontendFiles(ipRegistry, address) {
  const contractsDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ IPRegistry: address }, undefined, 2)
  );

  const IPRegistryArtifact = artifacts.readArtifactSync("IPRegistry");

  fs.writeFileSync(
    path.join(contractsDir, "IPRegistry.json"),
    JSON.stringify(IPRegistryArtifact, null, 2)
  );
  
  console.log("Artifacts and address saved to frontend!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
