import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying CryptoGiftNFT contract to Base Sepolia...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("💼 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Contract parameters
  const name = "CryptoGift NFT Wallets";
  const symbol = "CGIFT";
  const contractURI = "https://gateway.pinata.cloud/ipfs/QmYxT4LnK8qVnVv4suRjkjqc4XbqUBeQvvvjhFjvQ7mdRb";
  const owner = deployer.address;

  console.log("📄 Contract parameters:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Contract URI:", contractURI);
  console.log("  Owner:", owner);

  // Deploy the contract
  console.log("\n🔨 Deploying contract...");
  const CryptoGiftNFT = await ethers.getContractFactory("CryptoGiftNFT");
  const contract = await CryptoGiftNFT.deploy(name, symbol, contractURI, owner);
  
  console.log("⏳ Waiting for deployment transaction to be mined...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ CryptoGiftNFT deployed to:", contractAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const contractName = await contract.name();
  const contractSymbol = await contract.symbol();
  const contractOwner = await contract.owner();
  const currentTokenId = await contract.getCurrentTokenId();
  
  console.log("  Contract Name:", contractName);
  console.log("  Contract Symbol:", contractSymbol);
  console.log("  Contract Owner:", contractOwner);
  console.log("  Current Token ID:", currentTokenId.toString());

  // Test minting function (optional)
  console.log("\n🧪 Testing mint function...");
  const testMetadataURI = "https://gateway.pinata.cloud/ipfs/QmTestMetadata123";
  const testRecipient = deployer.address;
  
  try {
    const mintTx = await contract.mintTo(testRecipient, testMetadataURI);
    await mintTx.wait();
    console.log("✅ Test mint successful! Transaction:", mintTx.hash);
    
    const newTokenId = await contract.getCurrentTokenId();
    console.log("  New Token ID:", newTokenId.toString());
    console.log("  Total Supply:", await contract.totalSupply());
  } catch (error) {
    console.log("⚠️ Test mint failed:", error.message);
  }

  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Base Sepolia Explorer:", `https://sepolia.basescan.org/address/${contractAddress}`);
  console.log("🎯 ThirdWeb Dashboard:", `https://thirdweb.com/base-sepolia-testnet/${contractAddress}`);
  
  console.log("\n📝 Environment Variables Update:");
  console.log(`NEXT_PUBLIC_NFT_DROP_ADDRESS=${contractAddress}`);
  console.log(`NFT_DROP=${contractAddress}`);
  
  console.log("\n✨ Contract Features:");
  console.log("  ✅ Simple mintTo(address, uri) function");
  console.log("  ✅ No minting restrictions");
  console.log("  ✅ ERC721 compliant");
  console.log("  ✅ Owner-controlled minting");
  console.log("  ✅ Compatible with ERC-6551");

  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n🚀 SUCCESS! New NFT contract ready at:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  });