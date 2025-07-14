// Script para deployar CryptoGiftNFT usando ThirdWeb SDK
const { ThirdwebSDK } = require("@thirdweb-dev/sdk");
const { BaseSepoliaTestnet } = require("@thirdweb-dev/chains");
require('dotenv').config({ path: 'frontend/.env.local' });

async function deployCryptoGiftNFT() {
  console.log("🚀 DEPLOYING CryptoGiftNFT to Base Sepolia");
  console.log("=========================================");

  try {
    // Inicializar SDK
    const sdk = ThirdwebSDK.fromPrivateKey(
      process.env.PRIVATE_KEY_DEPLOY,
      BaseSepoliaTestnet,
      {
        clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID,
        secretKey: process.env.TW_SECRET_KEY,
      }
    );

    console.log("📝 Deployer address:", sdk.getSigner().getAddress());
    console.log("📝 Network:", BaseSepoliaTestnet.name);

    // Deploy contract
    console.log("🔍 Deploying CryptoGiftNFT contract...");
    
    const contractAddress = await sdk.deployer.deployContract({
      name: "CryptoGiftNFT",
      contractMetadata: {
        name: "CryptoGift Wallets",
        description: "NFTs that function as wallets using ERC-6551 Token Bound Accounts",
        image: "https://ipfs.io/ipfs/QmYour-Logo-Hash", // Placeholder
        external_link: "https://cryptogift-wallets.vercel.app"
      },
      constructorParams: [
        "CryptoGift Wallets",  // name
        "CGIFT",               // symbol  
        "https://ipfs.io/ipfs/QmYour-Contract-Metadata", // contractURI
        "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a"   // owner (tu wallet)
      ],
      version: "0.0.1"
    });

    console.log("✅ CryptoGiftNFT deployed successfully!");
    console.log("📝 Contract address:", contractAddress);
    console.log("📝 Network:", BaseSepoliaTestnet.name);
    console.log("📝 Chain ID:", BaseSepoliaTestnet.chainId);
    
    // Verificar ownership
    const contract = await sdk.getContract(contractAddress);
    const owner = await contract.call("owner");
    
    console.log("📝 Contract owner:", owner);
    console.log("📝 Expected owner:", "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a");
    console.log("✅ Ownership correct:", owner.toLowerCase() === "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a".toLowerCase());

    // Test mint function
    console.log("\n🔍 Testing mint function...");
    try {
      const mintTx = await contract.call("mintTo", [
        "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a",
        "https://ipfs.io/ipfs/QmTest-Metadata"
      ]);
      
      console.log("✅ Test mint successful!");
      console.log("📝 Mint transaction:", mintTx.transactionHash);
    } catch (mintError) {
      console.log("⚠️ Test mint failed (but deploy was successful):", mintError.message);
    }

    return {
      success: true,
      contractAddress,
      network: BaseSepoliaTestnet.name,
      chainId: BaseSepoliaTestnet.chainId,
      owner
    };

  } catch (error) {
    console.error("❌ Deploy failed:", error.message);
    console.error("📝 Stack:", error.stack);
    throw error;
  }
}

// Ejecutar
if (require.main === module) {
  deployCryptoGiftNFT()
    .then((result) => {
      console.log("\n🎯 DEPLOYMENT RESULT:", result);
      console.log("\n📋 NEXT STEPS:");
      console.log("1. Update .env.local with new contract address");
      console.log("2. Test complete NFT + TBA flow");
      console.log("3. Update mint.ts API to use new contract");
    })
    .catch((error) => {
      console.error("💥 Deployment failed:", error.message);
    });
}

module.exports = { deployCryptoGiftNFT };