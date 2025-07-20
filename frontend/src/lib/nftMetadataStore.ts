// NFT Metadata Storage System - ENHANCED with Redis Persistence
// Migrated from ephemeral /tmp/ to persistent Redis storage
// Fixes image caching issues by wallet

import { Redis } from '@upstash/redis';
import { NFTMetadata } from './clientMetadataStore';

// Initialize Redis client with same logic as referrals
let redis: any;

try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    console.log('🟢 NFT Metadata using Vercel KV with Upstash backend');
  } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('🟢 NFT Metadata using direct Upstash Redis');
  } else {
    // Fallback to legacy or mock
    try {
      const { kv } = require('@vercel/kv');
      redis = kv;
      console.log('🟡 NFT Metadata using legacy Vercel KV');
    } catch (kvError) {
      // Mock client for development
      redis = {
        hset: async () => ({}),
        hgetall: async () => null,
        sadd: async () => 1,
        smembers: async () => [],
        set: async () => 'OK',
        get: async () => null,
        del: async () => 1
      };
      console.log('⚠️ NFT Metadata using mock Redis client for development');
    }
  }
} catch (error) {
  console.error('❌ Failed to initialize NFT Metadata Redis client:', error);
}

// Redis storage functions with cache-busting
function getMetadataKey(contractAddress: string, tokenId: string): string {
  return `nft_metadata:${contractAddress.toLowerCase()}:${tokenId}`;
}

function getWalletNFTsKey(walletAddress: string): string {
  return `wallet_nfts:${walletAddress.toLowerCase()}`;
}

export async function storeNFTMetadata(metadata: NFTMetadata): Promise<void> {
  try {
    // Add unique metadata ID to prevent cache conflicts
    const enhancedMetadata: NFTMetadata = {
      ...metadata,
      uniqueCreationId: `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      contractAddress: metadata.contractAddress.toLowerCase(),
    };
    
    const key = getMetadataKey(metadata.contractAddress, metadata.tokenId);
    
    console.log(`💾 Storing NFT metadata for ${metadata.contractAddress}:${metadata.tokenId}`);
    console.log(`🔑 Redis key: ${key}`);
    console.log(`🆔 Unique ID: ${enhancedMetadata.uniqueCreationId}`);
    console.log(`🖼️ Image being stored: ${enhancedMetadata.image}`);
    console.log(`🖼️ Image CID: ${enhancedMetadata.imageIpfsCid}`);
    
    // Store in Redis
    console.log(`💾 Calling redis.hset with key: ${key}`);
    const setResult = await redis.hset(key, enhancedMetadata);
    console.log(`✅ Redis hset result:`, setResult);
    
    // Also add to wallet's NFT list if owner is specified
    if (metadata.owner) {
      const walletKey = getWalletNFTsKey(metadata.owner);
      await redis.sadd(walletKey, `${metadata.contractAddress}:${metadata.tokenId}`);
      console.log(`📋 Added to wallet NFT list: ${walletKey}`);
    }
    
    console.log(`✅ Metadata stored successfully in Redis`);
    
  } catch (error) {
    console.error('❌ Error storing NFT metadata:', error);
    console.error('📍 Storage error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      key: getMetadataKey(metadata.contractAddress, metadata.tokenId)
    });
    throw error;
  }
}

export async function getNFTMetadata(contractAddress: string, tokenId: string): Promise<NFTMetadata | null> {
  try {
    const key = getMetadataKey(contractAddress, tokenId);
    
    console.log(`🔍 Looking for NFT metadata: ${key}`);
    
    const metadata = await redis.hgetall(key);
    
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(`✅ Found stored metadata for ${contractAddress}:${tokenId}`);
      console.log(`🆔 Unique ID: ${metadata.uniqueCreationId || 'legacy'}`);
      return metadata as NFTMetadata;
    } else {
      console.log(`❌ No metadata found in Redis for ${contractAddress}:${tokenId}`);
      return null;
    }
  } catch (error) {
    console.log(`⚠️ Error retrieving metadata for ${contractAddress}:${tokenId}`);
    console.log(`📍 Error details:`, error instanceof Error ? error.message : 'Unknown error');
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
    
    // Preserve unique ID but update other fields
    const updated = { 
      ...existing, 
      ...updates,
      // Keep original unique ID to maintain identity
      uniqueCreationId: existing.uniqueCreationId,
      // Update modification timestamp
      lastModified: new Date().toISOString()
    };
    
    const key = getMetadataKey(contractAddress, tokenId);
    await redis.hset(key, updated);
    console.log(`✅ Updated metadata for ${contractAddress}:${tokenId}`);
  } catch (error) {
    console.error('❌ Error updating NFT metadata:', error);
    throw error;
  }
}

export async function listAllNFTMetadata(): Promise<NFTMetadata[]> {
  try {
    // This is complex with Redis - we'll implement a simple version
    // In a production system, you'd maintain a set of all NFT keys
    console.log('📋 Listing all NFT metadata (Redis implementation)');
    
    // For now, return empty array and implement this later if needed
    // The main use case is getting metadata by specific tokenId
    return [];
  } catch (error) {
    console.error('❌ Error listing NFT metadata:', error);
    return [];
  }
}

// NEW: Get NFTs by wallet address
export async function getNFTsByWallet(walletAddress: string): Promise<string[]> {
  try {
    const walletKey = getWalletNFTsKey(walletAddress);
    const nftIds = await redis.smembers(walletKey);
    
    console.log(`📋 Found ${nftIds.length} NFTs for wallet ${walletAddress.slice(0, 10)}...`);
    return nftIds || [];
  } catch (error) {
    console.error('❌ Error getting NFTs by wallet:', error);
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
  creatorWallet?: string; // NEW: Track who created it
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
    owner: params.owner,
    creatorWallet: params.creatorWallet,
    // Auto-generate unique ID to prevent cache conflicts
    uniqueCreationId: `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

// Enhanced IPFS URL resolution with fallback testing
export async function resolveIPFSUrlWithFallback(ipfsUrl: string): Promise<string> {
  if (!ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  
  const cid = ipfsUrl.replace('ipfs://', '');
  const gateways = [
    `https://nftstorage.link/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`
  ];
  
  // Try each gateway with timeout
  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(gateway, { 
        method: 'HEAD', // Just check if resource exists
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ IPFS gateway working: ${gateway}`);
        return gateway;
      }
    } catch (error) {
      console.log(`⚠️ IPFS gateway failed: ${gateway}`, error.message);
      continue;
    }
  }
  
  // If all gateways fail, return the first one as fallback
  console.log('⚠️ All IPFS gateways failed, using default');
  return gateways[0];
}