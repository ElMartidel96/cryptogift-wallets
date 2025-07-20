import { NextApiRequest, NextApiResponse } from "next";
import { getNFTMetadata } from "../../../lib/nftMetadataStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contract, tokenId } = req.query;

    if (contract && tokenId) {
      // Get specific NFT metadata
      console.log(`🔍 Debug: Looking for metadata ${contract}:${tokenId}`);
      const metadata = await getNFTMetadata(contract as string, tokenId as string);
      
      if (metadata) {
        console.log(`✅ Debug: Found metadata for ${contract}:${tokenId}`);
        return res.status(200).json({
          success: true,
          metadata,
          query: { contract, tokenId }
        });
      } else {
        console.log(`❌ Debug: No metadata found for ${contract}:${tokenId}`);
        return res.status(404).json({
          success: false,
          message: `No metadata found for ${contract}:${tokenId}`,
          query: { contract, tokenId }
        });
      }
    } else {
      // List all stored metadata
      console.log(`📋 Debug: Listing all stored metadata`);
      const allMetadata = await listAllNFTMetadata();
      
      return res.status(200).json({
        success: true,
        count: allMetadata.length,
        metadata: allMetadata,
        message: `Found ${allMetadata.length} stored NFT metadata entries`
      });
    }
  } catch (error) {
    console.error('❌ Debug metadata error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}