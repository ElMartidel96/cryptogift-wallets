import { NFTStorage } from 'nft.storage';
import { upload } from "thirdweb/storage";
import { createThirdwebClient } from "thirdweb";

// IPFS Upload Strategy for Godez22 Art Project
// Phase 1: NFT.Storage (Development)
// Phase 2: Pinata (Production)
// Phase 3: Hybrid system with fallbacks

export interface IPFSUploadResult {
  success: boolean;
  cid: string;
  url: string;
  provider: string;
  size: number;
  error?: string;
}

// Initialize clients
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
});

// NFT.Storage client (free, permanent storage)
const nftStorageClient = process.env.NFT_STORAGE_API_KEY 
  ? new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY })
  : null;

// Upload providers priority order
const UPLOAD_PROVIDERS = {
  NFT_STORAGE: 'nft.storage',
  THIRDWEB: 'thirdweb',
  PINATA: 'pinata' // Future implementation
} as const;

/**
 * Upload file to NFT.Storage (primary for development)
 */
async function uploadToNFTStorage(file: File): Promise<IPFSUploadResult> {
  if (!nftStorageClient) {
    throw new Error('NFT.Storage API key not configured');
  }

  try {
    console.log('🔄 Uploading to NFT.Storage...');
    
    const cid = await nftStorageClient.storeBlob(file);
    const url = `https://nftstorage.link/ipfs/${cid}`;
    
    console.log('✅ NFT.Storage upload successful:', { cid, url });
    
    return {
      success: true,
      cid,
      url,
      provider: UPLOAD_PROVIDERS.NFT_STORAGE,
      size: file.size
    };
  } catch (error) {
    console.error('❌ NFT.Storage upload failed:', error);
    return {
      success: false,
      cid: '',
      url: '',
      provider: UPLOAD_PROVIDERS.NFT_STORAGE,
      size: file.size,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload file to ThirdWeb (fallback)
 */
async function uploadToThirdWeb(file: File): Promise<IPFSUploadResult> {
  try {
    console.log('🔄 Uploading to ThirdWeb IPFS...');
    
    const cid = await upload({
      client,
      files: [file],
    });
    
    const url = `https://ipfs.io/ipfs/${cid}`;
    
    console.log('✅ ThirdWeb upload successful:', { cid, url });
    
    return {
      success: true,
      cid,
      url,
      provider: UPLOAD_PROVIDERS.THIRDWEB,
      size: file.size
    };
  } catch (error) {
    console.error('❌ ThirdWeb upload failed:', error);
    return {
      success: false,
      cid: '',
      url: '',
      provider: UPLOAD_PROVIDERS.THIRDWEB,
      size: file.size,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload file with hybrid strategy and fallbacks
 * Development: NFT.Storage → ThirdWeb
 * Production: Pinata → NFT.Storage → ThirdWeb
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  console.log('🌐 Starting IPFS upload with hybrid strategy...');
  
  // Phase 1: Try NFT.Storage first (development)
  if (nftStorageClient) {
    const nftStorageResult = await uploadToNFTStorage(file);
    if (nftStorageResult.success) {
      console.log('🎉 Upload successful via NFT.Storage');
      return nftStorageResult;
    }
    console.warn('⚠️ NFT.Storage failed, trying fallback...');
  }
  
  // Phase 2: Fallback to ThirdWeb
  const thirdwebResult = await uploadToThirdWeb(file);
  if (thirdwebResult.success) {
    console.log('🎉 Upload successful via ThirdWeb fallback');
    return thirdwebResult;
  }
  
  // All providers failed
  console.error('💥 All IPFS providers failed');
  throw new Error('All IPFS upload providers failed. Check your configuration and try again.');
}

/**
 * Create metadata object and upload to IPFS
 */
export async function uploadMetadata(metadata: any): Promise<IPFSUploadResult> {
  const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json'
  });
  
  const metadataFile = new File([metadataBlob], 'metadata.json', {
    type: 'application/json'
  });
  
  return uploadToIPFS(metadataFile);
}

/**
 * Validate IPFS configuration
 */
export function validateIPFSConfig(): {
  nftStorage: boolean;
  thirdweb: boolean;
  recommendation: string;
} {
  const hasNFTStorage = !!process.env.NFT_STORAGE_API_KEY;
  const hasThirdWeb = !!process.env.NEXT_PUBLIC_TW_CLIENT_ID;
  
  let recommendation = '';
  
  if (!hasNFTStorage && !hasThirdWeb) {
    recommendation = 'No IPFS providers configured. Add NFT_STORAGE_API_KEY or NEXT_PUBLIC_TW_CLIENT_ID';
  } else if (hasNFTStorage && hasThirdWeb) {
    recommendation = 'Optimal configuration: NFT.Storage primary with ThirdWeb fallback';
  } else if (hasNFTStorage) {
    recommendation = 'Good: NFT.Storage configured (free, permanent)';
  } else {
    recommendation = 'Limited: Only ThirdWeb configured (has storage limits)';
  }
  
  return {
    nftStorage: hasNFTStorage,
    thirdweb: hasThirdWeb,
    recommendation
  };
}