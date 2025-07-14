// Simple script to deploy a basic ERC721 using thirdweb CLI
// This will create a working NFT contract for testing

const { execSync } = require('child_process');

async function createSimpleNFT() {
  try {
    console.log("🚀 Creating simple NFT contract using thirdweb CLI...");
    
    // Use thirdweb CLI to deploy a simple NFT collection
    const deployCommand = `npx thirdweb@latest deploy --name "CryptoGift-NFT-Simple" --network base-sepolia --private-key 870c27f0bc97330a7b2fdfd6ddf41930e721e37a372aa67de6ee38f9fe82760f`;
    
    console.log("📝 Running command:", deployCommand);
    
    try {
      const output = execSync(deployCommand, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000 // 2 minutes timeout
      });
      
      console.log("✅ Deploy output:");
      console.log(output);
      
      // Extract contract address from output
      const addressMatch = output.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        const contractAddress = addressMatch[0];
        console.log("🎯 Contract deployed at:", contractAddress);
        console.log("📝 Update your .env.local:");
        console.log(`NEXT_PUBLIC_NFT_DROP_ADDRESS=${contractAddress}`);
        console.log(`NFT_DROP=${contractAddress}`);
        return contractAddress;
      } else {
        console.log("⚠️ Could not extract contract address from output");
      }
      
    } catch (execError) {
      console.log("❌ CLI deployment failed:", execError.message);
      
      // Fallback: provide manual deployment instructions
      console.log("\n📋 MANUAL DEPLOYMENT INSTRUCTIONS:");
      console.log("1. Go to https://thirdweb.com/dashboard");
      console.log("2. Connect wallet: 0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a");
      console.log("3. Click 'Deploy Contract'");
      console.log("4. Select 'NFT Collection'");
      console.log("5. Network: Base Sepolia");
      console.log("6. Fill in:");
      console.log("   - Name: CryptoGift NFT Wallets");
      console.log("   - Symbol: CGIFT");
      console.log("   - Description: NFT-Wallets for cryptocurrency gifts");
      console.log("7. Deploy and copy the contract address");
      console.log("8. Update .env.local with the new address");
    }
    
  } catch (error) {
    console.error("❌ Error creating NFT contract:", error);
    
    // Provide alternative solution
    console.log("\n🔄 ALTERNATIVE SOLUTION:");
    console.log("Use a pre-deployed NFT contract that's known to work:");
    console.log("Example working contract: 0x...");
    console.log("Or use a different approach like ERC1155 or simple factory");
  }
}

createSimpleNFT();