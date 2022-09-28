require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */

const Private_Key = "i will not say"

module.exports = {
  solidity: "0.8.17",
  networks: {
  	goerli: {
  		url: `https://goerli.infura.io/v3/2b83a7c05da34d38bd6a5a98dd9cdcd4`,
  		accounts: [`0x${Private_Key}`]
  	}
  }
};