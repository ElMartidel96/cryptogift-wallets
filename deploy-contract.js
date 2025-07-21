const { createThirdwebClient, getContract, prepareContractCall, sendTransaction } = require("thirdweb");
const { baseSepolia } = require("thirdweb/chains");
const { privateKeyToAccount } = require("thirdweb/wallets");

async function deployNFTCollection() {
  try {
    console.log("🚀 Deploying new NFT Collection contract using ThirdWeb v5...");
    
    // Validate required environment variables
    const clientId = process.env.NEXT_PUBLIC_TW_CLIENT_ID;
    const secretKey = process.env.TW_SECRET_KEY;
    const privateKey = process.env.PRIVATE_KEY_DEPLOY;
    
    if (!clientId) {
      throw new Error('❌ NEXT_PUBLIC_TW_CLIENT_ID environment variable is required');
    }
    if (!secretKey) {
      throw new Error('❌ TW_SECRET_KEY environment variable is required');
    }
    if (!privateKey) {
      throw new Error('❌ PRIVATE_KEY_DEPLOY environment variable is required');
    }

    // Create ThirdWeb client
    const client = createThirdwebClient({
      clientId,
      secretKey
    });

    // Create account from private key
    const account = privateKeyToAccount({
      client,
      privateKey,
    });

    console.log("✅ ThirdWeb v5 client initialized");
    console.log("💼 Deployer address:", account.address);

    // Deploy NFT Collection contract using ThirdWeb's published contract
    const contractMetadata = {
      name: "CryptoGift NFT Wallets",
      symbol: "CGIFT",
      description: "NFT-Wallets with ERC-6551 Token Bound Accounts for gifting cryptocurrency",
      image: "https://gateway.pinata.cloud/ipfs/QmYxT4LnK8qVnVv4suRjkjqc4XbqUBeQvvvjhFjvQ7mdRb",
      external_link: "https://cryptogift-wallets.vercel.app",
      primary_sale_recipient: "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a",
      platform_fee_recipient: "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a",
      platform_fee_basis_points: 0,
      seller_fee_basis_points: 0, // No royalties
      fee_recipient: "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a",
      trusted_forwarders: []
    };

    console.log("📄 Contract metadata:", contractMetadata);

    // Deploy the published NFT Collection contract
    const deployResult = await deployPublishedContract({
      client,
      chain: baseSepolia,
      account,
      contractId: "NFTCollection", // ThirdWeb's published NFT Collection
      constructorParams: [
        account.address, // _defaultAdmin
        contractMetadata.name, // _name
        contractMetadata.symbol, // _symbol
        contractMetadata.primary_sale_recipient, // _primarySaleRecipient
        contractMetadata.seller_fee_basis_points, // _royaltyBps
        contractMetadata.fee_recipient // _royaltyRecipient
      ],
      publisher: "thirdweb.eth" // ThirdWeb's publisher
    });
    
    const contractAddress = deployResult.contractAddress;
    
    console.log("✅ NFT Collection deployed successfully!");
    console.log("📍 Contract address:", contractAddress);
    console.log("🔗 View on Base Sepolia Explorer:", `https://sepolia.basescan.org/address/${contractAddress}`);
    console.log("🎯 ThirdWeb Dashboard:", `https://thirdweb.com/base-sepolia-testnet/${contractAddress}`);
    
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("📝 Next steps:");
    console.log("1. Update .env.local with new contract address:");
    console.log(`   NEXT_PUBLIC_NFT_DROP_ADDRESS=${contractAddress}`);
    console.log(`   NFT_DROP=${contractAddress}`);
    console.log("2. Test minting functionality");
    
    return contractAddress;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Run deployment
deployNFTCollection()
  .then(address => {
    console.log("\n✅ Success! Contract deployed at:", address);
    process.exit(0);
  })
  .catch(error => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });