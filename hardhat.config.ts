import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {version:"0.8.10"},
      {version:"0.8.13"},
      {version:"0.6.12"},
    ]
  },
//  networks: {
//    hardhat: {
//      chainId: 1
//    },
//  },
};

export default config;
