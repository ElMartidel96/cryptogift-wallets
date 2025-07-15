// Client-side metadata storage using localStorage
// For demo purposes - in production use a real database

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
}

const STORAGE_KEY = 'cryptogift_nft_metadata';

export function storeNFTMetadataClient(metadata: NFTMetadata): void {
  try {
    const existing = getAllNFTMetadataClient();
    const key = `${metadata.contractAddress.toLowerCase()}_${metadata.tokenId}`;
    
    existing[key] = metadata;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    
    console.log(`💾 Client: Stored metadata for ${metadata.contractAddress}:${metadata.tokenId}`);
  } catch (error) {
    console.error('❌ Client: Error storing metadata:', error);
  }
}

export function getNFTMetadataClient(contractAddress: string, tokenId: string): NFTMetadata | null {
  try {
    const existing = getAllNFTMetadataClient();
    const key = `${contractAddress.toLowerCase()}_${tokenId}`;
    
    const metadata = existing[key];
    if (metadata) {
      console.log(`✅ Client: Found metadata for ${contractAddress}:${tokenId}`);
      return metadata;
    } else {
      console.log(`⚠️ Client: No metadata found for ${contractAddress}:${tokenId}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Client: Error getting metadata:', error);
    return null;
  }
}

export function getAllNFTMetadataClient(): Record<string, NFTMetadata> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Client: Error getting all metadata:', error);
    return {};
  }
}

export function resolveIPFSUrlClient(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    return `https://nftstorage.link/ipfs/${cid}`;
  }
  return ipfsUrl;
}