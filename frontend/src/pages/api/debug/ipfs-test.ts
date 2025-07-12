import { NextApiRequest, NextApiResponse } from "next";
import { validateIPFSConfig } from "../../../lib/ipfs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check IPFS configuration
    const config = validateIPFSConfig();
    
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_TW_CLIENT_ID: !!process.env.NEXT_PUBLIC_TW_CLIENT_ID,
      TW_SECRET_KEY: !!process.env.TW_SECRET_KEY,
      NFT_STORAGE_API_KEY: !!process.env.NFT_STORAGE_API_KEY,
      clientIdPreview: process.env.NEXT_PUBLIC_TW_CLIENT_ID?.substring(0, 8) + '...',
      nftStoragePreview: process.env.NFT_STORAGE_API_KEY?.substring(0, 8) + '...',
    };

    // Test small file upload simulation (without actual upload)
    const testFileInfo = {
      name: 'test-image.jpg',
      size: 1024,
      type: 'image/jpeg'
    };

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ipfsConfig: config,
      environmentVariables: envCheck,
      testFileInfo,
      recommendations: [
        config.nftStorage ? '✅ NFT.Storage configured' : '❌ Get free NFT.Storage API key from https://nft.storage/',
        config.thirdweb ? '✅ ThirdWeb configured' : '❌ Check NEXT_PUBLIC_TW_CLIENT_ID',
        'Use this endpoint to verify IPFS configuration before minting'
      ]
    });

  } catch (error) {
    console.error('IPFS test error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}