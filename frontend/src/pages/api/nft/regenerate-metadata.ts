import { NextApiRequest, NextApiResponse } from 'next';
import { createThirdwebClient, getContract, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { storeNFTMetadata, createNFTMetadata } from '../../../lib/nftMetadataStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractAddress, tokenId } = req.body;

  if (!contractAddress || !tokenId) {
    return res.status(400).json({ 
      error: 'Contract address and token ID are required' 
    });
  }

  try {
    console.log('🔄 Regenerating metadata for:', { contractAddress, tokenId });

    // Initialize ThirdWeb client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress as `0x${string}`,
    });

    // Try to read tokenURI from contract
    let tokenURI = "";
    try {
      tokenURI = await readContract({
        contract: nftContract,
        method: "function tokenURI(uint256 tokenId) view returns (string)",
        params: [BigInt(tokenId)],
      });
      console.log("✅ Found tokenURI on contract:", tokenURI);
    } catch (error) {
      console.log("❌ Could not read tokenURI from contract:", error.message);
      return res.status(404).json({ 
        error: 'Token not found on contract or contract does not support tokenURI' 
      });
    }

    // If we have a tokenURI, try to fetch metadata from IPFS
    if (tokenURI && tokenURI.startsWith("ipfs://")) {
      const cid = tokenURI.replace("ipfs://", "");
      const gateways = [
        `https://nftstorage.link/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`
      ];

      let metadata = null;
      let workingGateway = null;

      // Try each gateway
      for (const gateway of gateways) {
        try {
          console.log(`🔍 Trying gateway: ${gateway}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(gateway, { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            metadata = await response.json();
            workingGateway = gateway;
            console.log("✅ Retrieved metadata from IPFS:", metadata);
            break;
          }
        } catch (gatewayError) {
          console.log(`⚠️ Gateway failed: ${gateway}`, gatewayError.message);
          continue;
        }
      }

      if (metadata) {
        // Create our internal metadata format
        const nftMetadata = createNFTMetadata({
          contractAddress,
          tokenId,
          name: metadata.name || `CryptoGift NFT-Wallet #${tokenId}`,
          description: metadata.description || 'Un regalo cripto único creado con amor',
          imageIpfsCid: metadata.image, // Use the image from IPFS metadata
          metadataIpfsCid: cid,
          owner: "unknown" // Will be updated when fetched
        });

        // Store the regenerated metadata
        await storeNFTMetadata(nftMetadata);
        console.log("✅ Metadata regenerated and stored successfully");

        return res.status(200).json({
          success: true,
          message: 'Metadata regenerated successfully',
          metadata: nftMetadata,
          source: 'ipfs_regenerated',
          gateway: workingGateway
        });
      } else {
        console.log("❌ Could not retrieve metadata from any IPFS gateway");
        return res.status(500).json({
          error: 'Could not retrieve metadata from IPFS',
          tokenURI,
          gateways: gateways
        });
      }
    } else {
      console.log("❌ Invalid or missing tokenURI");
      return res.status(400).json({
        error: 'Invalid tokenURI format',
        tokenURI
      });
    }

  } catch (error) {
    console.error('❌ Error regenerating metadata:', error);
    return res.status(500).json({
      error: 'Failed to regenerate metadata',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}