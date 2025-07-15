// NFT Metadata Storage System
// Stores NFT metadata after minting for later retrieval

interface NFTMetadata {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string; // IPFS URL
  imageIpfsCid?: string;
  metadataIpfsCid?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  createdAt: string;
  mintTransactionHash?: string;
  owner?: string;
}

// Simple file-based storage for demo
// In production, use a database like MongoDB, PostgreSQL, etc.

import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'data', 'nft-metadata');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

function getMetadataFilePath(contractAddress: string, tokenId: string): string {
  return path.join(STORAGE_DIR, `${contractAddress.toLowerCase()}_${tokenId}.json`);
}

export async function storeNFTMetadata(metadata: NFTMetadata): Promise<void> {
  try {
    await ensureStorageDir();
    const filePath = getMetadataFilePath(metadata.contractAddress, metadata.tokenId);
    
    console.log(`💾 Storing NFT metadata for ${metadata.contractAddress}:${metadata.tokenId}`);
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
    console.log(`✅ Metadata stored at: ${filePath}`);
  } catch (error) {
    console.error('❌ Error storing NFT metadata:', error);
    throw error;
  }
}

export async function getNFTMetadata(contractAddress: string, tokenId: string): Promise<NFTMetadata | null> {
  try {
    await ensureStorageDir();
    const filePath = getMetadataFilePath(contractAddress, tokenId);
    
    console.log(`🔍 Looking for NFT metadata at: ${filePath}`);
    const data = await fs.readFile(filePath, 'utf-8');
    const metadata = JSON.parse(data) as NFTMetadata;
    
    console.log(`✅ Found stored metadata for ${contractAddress}:${tokenId}`);
    return metadata;
  } catch (error) {
    console.log(`⚠️ No stored metadata found for ${contractAddress}:${tokenId}`);
    return null;
  }
}

export async function updateNFTMetadata(
  contractAddress: string, 
  tokenId: string, 
  updates: Partial<NFTMetadata>
): Promise<void> {
  try {
    const existing = await getNFTMetadata(contractAddress, tokenId);
    if (!existing) {
      throw new Error(`No metadata found for ${contractAddress}:${tokenId}`);
    }
    
    const updated = { ...existing, ...updates };
    await storeNFTMetadata(updated);
    console.log(`✅ Updated metadata for ${contractAddress}:${tokenId}`);
  } catch (error) {
    console.error('❌ Error updating NFT metadata:', error);
    throw error;
  }
}

export async function listAllNFTMetadata(): Promise<NFTMetadata[]> {
  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);
    const metadataList: NFTMetadata[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(STORAGE_DIR, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const metadata = JSON.parse(data) as NFTMetadata;
          metadataList.push(metadata);
        } catch (error) {
          console.warn(`⚠️ Failed to read metadata file ${file}:`, error);
        }
      }
    }
    
    return metadataList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('❌ Error listing NFT metadata:', error);
    return [];
  }
}

// Helper functions for common operations
export function createNFTMetadata(params: {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  imageIpfsCid: string;
  metadataIpfsCid?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  mintTransactionHash?: string;
  owner?: string;
}): NFTMetadata {
  return {
    contractAddress: params.contractAddress.toLowerCase(),
    tokenId: params.tokenId,
    name: params.name,
    description: params.description,
    image: `ipfs://${params.imageIpfsCid}`,
    imageIpfsCid: params.imageIpfsCid,
    metadataIpfsCid: params.metadataIpfsCid,
    attributes: params.attributes || [],
    createdAt: new Date().toISOString(),
    mintTransactionHash: params.mintTransactionHash,
    owner: params.owner
  };
}

// Utility to convert IPFS URLs to HTTP gateways
export function resolveIPFSUrl(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    // Try multiple gateways for redundancy
    const gateways = [
      `https://nftstorage.link/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`
    ];
    
    // Return the first gateway for now
    // In production, you might want to implement gateway health checking
    return gateways[0];
  }
  
  return ipfsUrl;
}