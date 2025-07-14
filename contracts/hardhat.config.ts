import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.23",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    "base-sepolia": {
      url: "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e",
      accounts: ["870c27f0bc97330a7b2fdfd6ddf41930e721e37a372aa67de6ee38f9fe82760f"],
      chainId: 84532,
    },
  },
  paths: {
    sources: ".",
    artifacts: "./artifacts",
    cache: "./cache",
  },
};

export default config;
