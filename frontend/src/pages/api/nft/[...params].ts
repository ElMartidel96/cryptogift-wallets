import { NextApiRequest, NextApiResponse } from "next";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { baseSepolia } from "@thirdweb-dev/chains";

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

    // Initialize ThirdWeb SDK
    const sdk = ThirdwebSDK.fromPrivateKey(
      process.env.PRIVATE_KEY_DEPLOY!,
      baseSepolia,
      {
        secretKey: process.env.TW_SECRET_KEY!,
      }
    );

    // Get NFT contract
    const nftContract = await sdk.getContract(contractAddress, "nft-drop");
    
    // Get NFT metadata
    const nft = await nftContract.get(tokenId);
    
    // Get owner
    const owner = await nftContract.ownerOf(tokenId);
    
    // Calculate TBA address
    const registryContract = await sdk.getContract(
      process.env.NEXT_PUBLIC_ERC6551_REGISTRY!
    );

    const salt = 0;
    const implementation = process.env.TBA_IMPL!;
    const chainId = 84532; // Base Sepolia

    const tbaAddress = await registryContract.call("account", [
      implementation,
      salt,
      chainId,
      contractAddress,
      tokenId
    ]);

    // Check if TBA is deployed
    const provider = sdk.getProvider();
    const tbaCode = await provider.getCode(tbaAddress);
    const isTbaDeployed = tbaCode !== '0x';

    // Get TBA balance if deployed
    let tbaBalance = "0";
    if (isTbaDeployed) {
      try {
        const balance = await provider.getBalance(tbaAddress);
        tbaBalance = balance.toString();
      } catch (error) {
        console.error('Error getting TBA balance:', error);
      }
    }

    res.status(200).json({
      success: true,
      nft: {
        id: tokenId,
        name: nft.metadata.name,
        description: nft.metadata.description,
        image: nft.metadata.image,
        attributes: nft.metadata.attributes,
        owner,
        contractAddress,
      },
      tbaAddress,
      isTbaDeployed,
      tbaBalance,
      metadata: nft.metadata,
    });

  } catch (error) {
    console.error('NFT API error:', error);
    
    if (error.message?.includes('ERC721: invalid token ID')) {
      return res.status(404).json({
        error: 'NFT not found',
        message: 'The requested token ID does not exist',
      });
    }

    res.status(500).json({
      error: 'Failed to fetch NFT data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}