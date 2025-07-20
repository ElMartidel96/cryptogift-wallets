"use client";

import { useState, useEffect } from 'react';
import { NFTMetadata, storeNFTMetadataClient, getNFTMetadataClient, resolveIPFSUrlClient } from '../lib/clientMetadataStore';

export function useNFTMetadata(contractAddress: string, tokenId: string, walletAddress?: string) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetadata();
  }, [contractAddress, tokenId, walletAddress]);

  const loadMetadata = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // CACHE DISABLED FOR TESTING: Skip client storage completely
      console.log('🚫 CLIENT CACHE DISABLED: Forcing API call for testing');
      
      // ALWAYS use API directly - no client cache
      console.log('🔍 DIRECT API: Loading from server...');
      const response = await fetch(`/api/nft/${contractAddress}/${tokenId}?cache=bypass&t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const apiData = await response.json();
        console.log('✅ API response:', apiData);
        
        // DISABLED CLIENT STORAGE FOR TESTING
        console.log('🚫 CLIENT STORAGE DISABLED: Not storing locally for testing');
        
        // Always use API data directly without storing
        const newMetadata: NFTMetadata = {
          contractAddress,
          tokenId,
          name: apiData.name || `CryptoGift NFT #${tokenId}`,
          description: apiData.description || '',
          image: apiData.image,
          attributes: apiData.attributes || [],
          createdAt: new Date().toISOString()
        };
        
        console.log('📝 DIRECT API: Set metadata from API:', newMetadata);
        setMetadata(newMetadata);
      } else {
        throw new Error(`API failed: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Error loading metadata:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback to basic metadata
      setMetadata({
        contractAddress,
        tokenId,
        name: `CryptoGift NFT #${tokenId}`,
        description: 'Un regalo cripto único',
        image: '/images/cg-wallet-placeholder.png',
        attributes: [],
        createdAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateMetadata = (newMetadata: Partial<NFTMetadata>) => {
    if (metadata) {
      const updated = { ...metadata, ...newMetadata };
      setMetadata(updated);
      // Store with wallet address if available, otherwise use dummy address
      const addressToUse = walletAddress || '0x0000000000000000000000000000000000000000';
      storeNFTMetadataClient(updated, addressToUse);
    }
  };

  const getImageUrl = () => {
    if (!metadata?.image) return '/images/cg-wallet-placeholder.png';
    
    if (metadata.image.startsWith('ipfs://')) {
      return resolveIPFSUrlClient(metadata.image);
    }
    
    return metadata.image;
  };

  return {
    metadata,
    isLoading,
    error,
    updateMetadata,
    getImageUrl,
    reload: loadMetadata
  };
}