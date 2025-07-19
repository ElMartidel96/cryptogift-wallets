// Client-side metadata storage with WALLET-SCOPED caching
// CRITICAL: Each wallet gets isolated cache to prevent cross-contamination
// Device limit: Maximum 2 wallets per device for security

export interface NFTMetadata {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  imageIpfsCid?: string;
  metadataIpfsCid?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  createdAt: string;
  mintTransactionHash?: string;
  owner?: string;
  // NEW: Unique identifiers to prevent cache conflicts
  uniqueCreationId?: string;
  creatorWallet?: string;
}

const STORAGE_PREFIX = 'cryptogift_wallet_';

// NEW: Wallet-scoped storage functions
function getWalletStorageKey(walletAddress: string): string {
  if (!walletAddress) {
    throw new Error('Wallet address required for scoped storage');
  }
  return `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
}

function checkDeviceWalletLimit(): { allowed: boolean; walletCount: number; registeredWallets: string[] } {
  try {
    const allKeys = Object.keys(localStorage);
    const walletKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    const registeredWallets = walletKeys.map(key => key.replace(STORAGE_PREFIX, ''));
    
    return {
      allowed: walletKeys.length < 2,
      walletCount: walletKeys.length,
      registeredWallets
    };
  } catch (error) {
    console.error('Error checking device wallet limit:', error);
    return { allowed: true, walletCount: 0, registeredWallets: [] };
  }
}

export function storeNFTMetadataClient(metadata: NFTMetadata, walletAddress: string): void {
  try {
    if (!walletAddress) {
      console.error('❌ Cannot store metadata without wallet address');
      return;
    }

    // Check device limits before storing
    const deviceCheck = checkDeviceWalletLimit();
    const walletKey = getWalletStorageKey(walletAddress);
    const isExistingWallet = localStorage.getItem(walletKey) !== null;
    
    if (!deviceCheck.allowed && !isExistingWallet) {
      console.warn(`⚠️ Device wallet limit reached (${deviceCheck.walletCount}/2). Cannot store metadata for new wallet.`);
      return;
    }

    const existing = getAllNFTMetadataForWallet(walletAddress);
    const key = `${metadata.contractAddress.toLowerCase()}_${metadata.tokenId}`;
    
    // Add unique creation identifier to prevent cache conflicts
    const enhancedMetadata = {
      ...metadata,
      uniqueCreationId: `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creatorWallet: walletAddress,
      storedAt: new Date().toISOString()
    };
    
    existing[key] = enhancedMetadata;
    localStorage.setItem(walletKey, JSON.stringify(existing));
    
    console.log(`💾 Client: Stored wallet-scoped metadata for ${walletAddress.slice(0, 10)}...`);
    console.log(`🔑 Unique ID: ${enhancedMetadata.uniqueCreationId}`);
  } catch (error) {
    console.error('❌ Client: Error storing wallet-scoped metadata:', error);
  }
}

export function getNFTMetadataClient(contractAddress: string, tokenId: string, walletAddress?: string): NFTMetadata | null {
  try {
    // If wallet is provided, try wallet-scoped first
    if (walletAddress) {
      const walletScoped = getAllNFTMetadataForWallet(walletAddress);
      const key = `${contractAddress.toLowerCase()}_${tokenId}`;
      
      const metadata = walletScoped[key];
      if (metadata) {
        console.log(`✅ Client: Found wallet-scoped metadata for ${contractAddress}:${tokenId}`);
        console.log(`🔑 Unique ID: ${metadata.uniqueCreationId || 'legacy'}`);
        return metadata;
      }
    }
    
    // Fallback to legacy global search (will be phased out)
    console.log(`⚠️ Client: No wallet-scoped metadata found for ${contractAddress}:${tokenId}`);
    return null;
  } catch (error) {
    console.error('❌ Client: Error getting metadata:', error);
    return null;
  }
}

// NEW: Wallet-scoped metadata retrieval
export function getAllNFTMetadataForWallet(walletAddress: string): Record<string, NFTMetadata> {
  try {
    if (!walletAddress) {
      console.warn('⚠️ No wallet address provided for scoped metadata retrieval');
      return {};
    }
    
    const walletKey = getWalletStorageKey(walletAddress);
    const stored = localStorage.getItem(walletKey);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Client: Error getting wallet-scoped metadata:', error);
    return {};
  }
}

// DEPRECATED: Legacy function for backwards compatibility
export function getAllNFTMetadataClient(): Record<string, NFTMetadata> {
  console.warn('⚠️ getAllNFTMetadataClient is deprecated. Use getAllNFTMetadataForWallet instead.');
  return {};
}

// NEW: Device management functions
export function getDeviceWalletInfo(): { allowed: boolean; walletCount: number; registeredWallets: string[] } {
  return checkDeviceWalletLimit();
}

export function clearWalletCache(walletAddress: string): boolean {
  try {
    const walletKey = getWalletStorageKey(walletAddress);
    localStorage.removeItem(walletKey);
    console.log(`🗑️ Cleared cache for wallet ${walletAddress.slice(0, 10)}...`);
    return true;
  } catch (error) {
    console.error('❌ Error clearing wallet cache:', error);
    return false;
  }
}

export function resolveIPFSUrlClient(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    return `https://nftstorage.link/ipfs/${cid}`;
  }
  return ipfsUrl;
}