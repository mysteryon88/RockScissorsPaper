
const hre = require("hardhat");

async function main() {

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const RockScissorsPaper = await hre.ethers.getContractFactory("RockScissorsPaper");
  const contract = await RockScissorsPaper.deploy();

  console.log("Contract address:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


