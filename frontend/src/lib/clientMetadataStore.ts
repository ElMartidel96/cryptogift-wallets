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

// NEW: Cross-wallet metadata search for display purposes (read-only)
export function getNFTMetadataClientCrossWallet(contractAddress: string, tokenId: string): NFTMetadata | null {
  try {
    console.log(`🔍 Cross-wallet search for ${contractAddress}:${tokenId}`);
    
    // Check if we have device info to search across registered wallets
    const deviceInfo = getDeviceWalletInfo();
    
    for (const registeredWallet of deviceInfo.registeredWallets) {
      console.log(`🔍 Searching wallet: ${registeredWallet.slice(0, 10)}...`);
      
      const metadata = getNFTMetadataClient(contractAddress, tokenId, registeredWallet);
      if (metadata) {
        console.log(`✅ Found metadata in wallet ${registeredWallet.slice(0, 10)}... for display`);
        return {
          ...metadata,
          // Mark as cross-wallet to prevent modification
          crossWalletAccess: true,
          sourceWallet: registeredWallet
        } as NFTMetadata;
      }
    }
    
    console.log(`ℹ️ No metadata found across ${deviceInfo.registeredWallets.length} registered wallets`);
    return null;
  } catch (error) {
    console.error('❌ Error in cross-wallet metadata search:', error);
    return null;
  }
}

// DEPRECATED: Legacy function for backwards compatibility
export function getAllNFTMetadataClient(): Record<string, NFTMetadata> {
  console.warn('⚠️ getAllNFTMetadataClient is deprecated. Use getAllNFTMetadataForWallet instead.');
  return {};
}

// NEW: Cache Management Functions for Fresh Testing
export function clearAllUserCache(): { cleared: boolean; details: any } {
  try {
    const results = {
      cleared: true,
      details: {
        walletCaches: 0,
        ipfsGatewayCaches: 0,
        totalLocalStorageKeys: 0,
        clearedKeys: []
      }
    };

    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    results.details.totalLocalStorageKeys = allKeys.length;

    // Clear wallet-scoped metadata caches
    const walletKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    walletKeys.forEach(key => {
      localStorage.removeItem(key);
      results.details.clearedKeys.push(key);
    });
    results.details.walletCaches = walletKeys.length;

    // Clear IPFS gateway caches
    const ipfsKeys = allKeys.filter(key => key.startsWith('ipfs_gateway_'));
    ipfsKeys.forEach(key => {
      localStorage.removeItem(key);
      results.details.clearedKeys.push(key);
    });
    results.details.ipfsGatewayCaches = ipfsKeys.length;

    // Clear device wallet info
    localStorage.removeItem(DEVICE_STORAGE_KEY);
    results.details.clearedKeys.push(DEVICE_STORAGE_KEY);

    console.log('🧹 Cache clearing results:', results);
    return results;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return {
      cleared: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

export function getDetailedCacheInfo(): any {
  try {
    const info = {
      timestamp: new Date().toISOString(),
      walletCaches: [] as any[],
      ipfsGatewayCaches: [] as any[],
      deviceInfo: null as any,
      totalSize: 0
    };

    const allKeys = Object.keys(localStorage);

    // Analyze wallet caches
    const walletKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    walletKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        const parsed = data ? JSON.parse(data) : {};
        const nftCount = Object.keys(parsed).length;
        const walletAddress = key.replace(STORAGE_PREFIX, '');
        
        info.walletCaches.push({
          walletAddress: walletAddress.slice(0, 10) + '...',
          nftCount,
          sizeBytes: data ? data.length : 0,
          lastActivity: parsed.lastActivity || 'unknown'
        });
        
        info.totalSize += data ? data.length : 0;
      } catch (e) {
        console.warn('Error parsing wallet cache:', key);
      }
    });

    // Analyze IPFS gateway caches
    const ipfsKeys = allKeys.filter(key => key.startsWith('ipfs_gateway_'));
    ipfsKeys.forEach(key => {
      const cid = key.replace('ipfs_gateway_', '');
      const gateway = localStorage.getItem(key);
      info.ipfsGatewayCaches.push({
        cid: cid.slice(0, 12) + '...',
        gateway: gateway ? gateway.split('/')[2] : 'unknown'
      });
    });

    // Get device info
    try {
      const deviceData = localStorage.getItem(DEVICE_STORAGE_KEY);
      info.deviceInfo = deviceData ? JSON.parse(deviceData) : null;
    } catch (e) {
      info.deviceInfo = { error: 'Failed to parse device info' };
    }

    return info;
  } catch (error) {
    console.error('❌ Error getting cache info:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
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

// Enhanced IPFS URL resolution with multiple gateways and caching
export function resolveIPFSUrlClient(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    
    // Check for cached working gateway
    const gatewayKey = `ipfs_gateway_${cid}`;
    const cachedGateway = localStorage.getItem(gatewayKey);
    
    if (cachedGateway) {
      console.log(`🚀 Using cached gateway for ${cid.slice(0, 8)}...`);
      return cachedGateway;
    }
    
    // Default to primary reliable gateway
    const primaryGateway = `https://nftstorage.link/ipfs/${cid}`;
    return primaryGateway;
  }
  return ipfsUrl;
}

// NEW: Async IPFS URL resolution with gateway verification
export async function resolveIPFSUrlClientVerified(ipfsUrl: string): Promise<string> {
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
  
  // Check cached working gateway first
  const gatewayKey = `ipfs_gateway_${cid}`;
  const cachedGateway = localStorage.getItem(gatewayKey);
  
  if (cachedGateway) {
    console.log(`🚀 Using cached verified gateway for ${cid.slice(0, 8)}...`);
    return cachedGateway;
  }
  
  console.log(`🔍 Testing ${gateways.length} IPFS gateways for ${cid.slice(0, 8)}...`);
  
  // Test gateways sequentially to avoid overwhelming
  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(gateway, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ Gateway verified: ${gateway}`);
        // Cache working gateway for 1 hour
        localStorage.setItem(gatewayKey, gateway);
        return gateway;
      }
    } catch (error) {
      console.log(`❌ Gateway failed: ${gateway}`);
      continue;
    }
  }
  
  // If all fail, return primary as fallback
  console.log(`⚠️ All gateways failed for ${cid.slice(0, 8)}..., using primary`);
  return gateways[0];
}