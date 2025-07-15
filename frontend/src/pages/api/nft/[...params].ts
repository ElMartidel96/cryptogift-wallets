import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getNFTMetadata, resolveIPFSUrl } from "../../../lib/nftMetadataStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { params } = req.query;
    
    if (!Array.isArray(params) || params.length !== 2) {
      return res.status(400).json({ 
        error: 'Invalid parameters. Expected: [contractAddress, tokenId]' 
      });
    }

    const [contractAddress, tokenId] = params;

    // Initialize ThirdWeb Client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress,
    });
    
    // REAL IMPLEMENTATION: Get actual NFT data
    
    // Try to read token URI from contract (if it's a real NFT contract)
    let tokenURI = "";
    let owner = "0x0000000000000000000000000000000000000000";
    
    try {
      // Try reading tokenURI - this might fail for Factory contracts
      tokenURI = await readContract({
        contract: nftContract,
        method: "function tokenURI(uint256 tokenId) view returns (string)",
        params: [BigInt(tokenId)],
      });
      console.log("✅ Token URI found:", tokenURI);
      
      // Handle IPFS URLs
      if (tokenURI.startsWith("ipfs://")) {
        tokenURI = tokenURI.replace("ipfs://", "https://nftstorage.link/ipfs/");
      }
    } catch (tokenURIError) {
      console.log("⚠️ No tokenURI found, using Factory approach");
      console.log("Contract:", contractAddress, "TokenId:", tokenId);
      // For Factory 6551 contracts, we need to construct metadata differently
      // The token was created via createAccount, so metadata should be in our system
    }
    
    // Try to read owner
    try {
      owner = await readContract({
        contract: nftContract,
        method: "function ownerOf(uint256 tokenId) view returns (address)",
        params: [BigInt(tokenId)],
      });
      console.log("✅ Owner found:", owner);
    } catch (ownerError) {
      console.log("⚠️ No owner found, using deployer");
      owner = process.env.WALLET_ADDRESS || "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a";
    }

    // First, try to get stored metadata from our system
    let nft;
    
    console.log("🔍 Checking for stored metadata...");
    console.log("🔍 Search parameters:", { contractAddress, tokenId });
    
    const storedMetadata = await getNFTMetadata(contractAddress, tokenId);
    
    if (storedMetadata) {
      console.log("✅ Found stored metadata!");
      console.log("📄 Stored metadata content:", storedMetadata);
      
      // Use stored metadata with IPFS resolution
      const resolvedImageUrl = resolveIPFSUrl(storedMetadata.image);
      console.log("🔗 Resolved image URL:", resolvedImageUrl);
      
      nft = {
        id: tokenId,
        name: storedMetadata.name,
        description: storedMetadata.description,
        image: resolvedImageUrl,
        attributes: storedMetadata.attributes || []
      };
    } else {
      console.log("⚠️ No stored metadata found, using defaults");
      console.log("📂 Searched in contract:", contractAddress, "tokenId:", tokenId);
      
      // Fallback to defaults
      nft = {
        id: tokenId,
        name: `CryptoGift NFT-Wallet #${tokenId}`,
        description: "Un regalo cripto único con wallet integrada ERC-6551. Contiene criptomonedas reales que puedes usar inmediatamente.",
        image: "/images/cg-wallet-placeholder.png", // Better fallback image
        attributes: [
          {
            trait_type: "Initial Balance",
            value: "0 USDC"
          },
          {
            trait_type: "Filter",
            value: "Original"
          },
          {
            trait_type: "Wallet Type",
            value: "ERC-6551 Token Bound Account"
          },
          {
            trait_type: "Network",
            value: "Base Sepolia"
          }
        ]
      };
    }

    // If we have a tokenURI, try to fetch metadata
    if (tokenURI && (tokenURI.startsWith("https://") || tokenURI.startsWith("http://"))) {
      try {
        console.log("🔍 Fetching metadata from:", tokenURI);
        // Create controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const metadataResponse = await fetch(tokenURI, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          console.log("✅ Raw metadata from IPFS:", metadata);
          
          // Handle image URLs
          let imageUrl = metadata.image || nft.image;
          if (imageUrl && imageUrl.startsWith("ipfs://")) {
            imageUrl = imageUrl.replace("ipfs://", "https://nftstorage.link/ipfs/");
          }
          
          nft = {
            id: tokenId,
            name: metadata.name || nft.name,
            description: metadata.description || nft.description,
            image: imageUrl,
            attributes: metadata.attributes || nft.attributes
          };
          console.log("✅ Processed NFT data:", { name: nft.name, image: nft.image });
        }
      } catch (metadataError) {
        console.log("⚠️ Failed to load metadata from IPFS:", metadataError instanceof Error ? metadataError.message : 'Unknown error');
        console.log("Using defaults for token", tokenId);
      }
    }
    
    // Calculate REAL TBA address using ERC-6551 standard
    const { ethers } = await import("ethers");
    const REGISTRY_ADDRESS = "0x000000006551c19487814612e58FE06813775758";
    const IMPLEMENTATION_ADDRESS = "0x2d25602551487c3f3354dd80d76d54383a243358";
    const CHAIN_ID = 84532; // Base Sepolia
    
    const salt = ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'uint256'],
      [CHAIN_ID, contractAddress, tokenId]
    );
    
    const packed = ethers.solidityPacked(
      ['bytes1', 'address', 'bytes32', 'address', 'bytes32'],
      [
        '0xff',
        REGISTRY_ADDRESS,
        salt,
        IMPLEMENTATION_ADDRESS,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ]
    );
    
    const hash = ethers.keccak256(packed);
    const tbaAddress = ethers.getAddress('0x' + hash.slice(-40));
    
    console.log(`✅ Real TBA address calculated: ${tbaAddress}`);
    
    // Check TBA balance (simplified for now)
    const balance = "0";
    const isDeployed = false;

    // Return the NFT data directly (not nested under 'nft')
    res.status(200).json({
      success: true,
      ...nft,
      owner,
      tbaAddress,
      tbaBalance: balance,
      tbaDeployed: isDeployed,
      contractAddress,
      tokenId: parseInt(tokenId),
      network: "Base Sepolia",
      chainId: 84532,
    });

  } catch (error) {
    console.error('NFT API error:', error);
    res.status(500).json({
      error: 'Failed to get NFT data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}