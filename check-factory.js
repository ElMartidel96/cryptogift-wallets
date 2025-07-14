const { createThirdwebClient, getContract, readContract } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");

async function checkFactory() {
  try {
    console.log("🔍 Checking Factory 6551 contract...");
    
    // Create ThirdWeb client
    const client = createThirdwebClient({
      clientId: "9183b572b02ec88dd4d8f20c3ed847d3", // TW_CLIENT_ID
    });

    // Custom chain configuration
    const customChain = {
      ...baseSepolia,
      rpc: "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e"
    };

    // Get Factory contract
    const factoryAddress = "0x02101dfB77FDE026414827Fdc604ddAF224F0921";
    const factoryContract = getContract({
      client,
      chain: customChain,
      address: factoryAddress,
    });

    console.log("✅ Factory contract address:", factoryAddress);
    console.log("🔗 Explorer:", `https://sepolia.basescan.org/address/${factoryAddress}`);

    // Try to read basic contract info
    try {
      // Check if contract exists by trying to read bytecode
      const code = await client.eth.getCode({
        address: factoryAddress,
        blockTag: "latest"
      });
      
      if (code === "0x" || code === "0x0") {
        console.log("❌ Factory contract not deployed or has no code");
        return false;
      } else {
        console.log("✅ Factory contract has code (bytecode length:", code.length, ")");
      }
    } catch (error) {
      console.log("❌ Error checking contract code:", error.message);
      return false;
    }

    console.log("🎯 Factory contract appears to be valid!");
    return true;
    
  } catch (error) {
    console.error("❌ Error checking factory:", error);
    return false;
  }
}

// Run check
checkFactory()
  .then(isValid => {
    if (isValid) {
      console.log("\n✅ Factory 6551 is ready to use!");
    } else {
      console.log("\n❌ Factory 6551 has issues");
    }
    process.exit(0);
  })
  .catch(error => {
    console.error("\n❌ Check failed:", error.message);
    process.exit(1);
  });