import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {version:"0.8.13", optimizer: { enabled: true, runs: 1000, }, },
      {version:"0.8.10", optimizer: { enabled: true, runs: 1000, }, },
      {version:"0.6.12", optimizer: { enabled: true, runs: 1000, }, },
    ]
  },
//  networks: {
//    hardhat: {
//      chainId: 1
//    },
//  },
};

export default config;
