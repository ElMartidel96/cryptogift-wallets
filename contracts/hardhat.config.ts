import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
  compilers: [
    {
      version: "0.8.23",
      // compilerPath: require.resolve("solc/soljson.js"),
      settings: {},
    },
  ],
},
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
};

export default config;
