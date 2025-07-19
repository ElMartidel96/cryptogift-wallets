"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getNFTMetadataClient, getNFTMetadataClientCrossWallet, resolveIPFSUrlClient, resolveIPFSUrlClientVerified } from '../lib/clientMetadataStore';
import { FlowDiagnostic } from './FlowDiagnostic';

interface ImageDebuggerProps {
  nftContract: string;
  tokenId: string;
  walletAddress?: string; // NEW: Required for wallet-scoped caching
  className?: string;
}

export const ImageDebugger: React.FC<ImageDebuggerProps> = ({
  nftContract,
  tokenId,
  walletAddress,
  className = ""
}) => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    debugImageLoading();
  }, [nftContract, tokenId, walletAddress]);

  const debugImageLoading = async () => {
    setIsLoading(true);
    const debug: any = {
      nftContract,
      tokenId,
      walletAddress: walletAddress?.slice(0, 10) + '...' || 'none',
      timestamp: new Date().toISOString(),
      steps: []
    };

    try {
      // CRITICAL: PRIORITIZE API over client cache to prevent stale data
      debug.steps.push('🎯 STRATEGY: API-first to prevent cache contamination');
      
      // Step 1: Test our NFT API FIRST (not client cache)
      debug.steps.push('1️⃣ Testing NFT API (PRIORITY)...');
      const apiResponse = await fetch(`/api/nft/${nftContract}/${tokenId}`);
      debug.apiStatus = apiResponse.status;
      debug.apiOk = apiResponse.ok;
      
      let apiImageWorking = false;
      if (apiResponse.ok) {
        try {
          const nftData = await apiResponse.json();
          debug.apiData = nftData;
          debug.steps.push('✅ API returned metadata');
          
          if (nftData.image) {
            const apiImageUrl = nftData.image.startsWith('ipfs://') 
              ? resolveIPFSUrlClient(nftData.image)
              : nftData.image;
            
            debug.steps.push('🖼️ Testing API image URL...');
            
            try {
              const imageResponse = await fetch(apiImageUrl, { method: 'HEAD' });
              debug.apiImageTest = {
                url: apiImageUrl,
                status: imageResponse.status,
                ok: imageResponse.ok
              };
              
              if (imageResponse.ok) {
                setImageUrl(apiImageUrl);
                debug.steps.push('✅ API image URL working - USING THIS');
                debug.finalSource = 'api';
                apiImageWorking = true;
                setDebugInfo(debug);
                setIsLoading(false);
                return;
              }
            } catch (error) {
              debug.steps.push('❌ API image URL failed');
            }
          }
        } catch (error) {
          debug.steps.push('❌ API response parsing failed');
        }
      } else {
        debug.steps.push('⚠️ API failed, will try client cache as fallback');
      }
      
      // Step 2: Fallback to wallet-scoped client storage ONLY if API fails
      if (!apiImageWorking && walletAddress) {
        debug.steps.push('2️⃣ Fallback: Checking wallet-scoped client storage...');
        const clientMetadata = getNFTMetadataClient(nftContract, tokenId, walletAddress);
        
        if (clientMetadata) {
          debug.steps.push('✅ Found wallet-scoped client metadata');
          debug.clientMetadata = clientMetadata;
          debug.walletScope = walletAddress.slice(0, 10) + '...';
          debug.uniqueId = clientMetadata.uniqueCreationId || 'legacy';
          
          const clientImageUrl = resolveIPFSUrlClient(clientMetadata.image);
          debug.steps.push('🖼️ Testing wallet-scoped image URL...');
          
          try {
            const clientResponse = await fetch(clientImageUrl, { method: 'HEAD' });
            debug.clientImageTest = {
              url: clientImageUrl,
              status: clientResponse.status,
              ok: clientResponse.ok
            };
            
            if (clientResponse.ok) {
              setImageUrl(clientImageUrl);
              debug.steps.push('✅ Wallet-scoped image URL working');
              debug.finalSource = 'wallet-scoped-client';
              setDebugInfo(debug);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            debug.steps.push('❌ Wallet-scoped image URL failed');
          }
        } else {
          debug.steps.push('⚠️ No wallet-scoped metadata found');
        }
      } else if (!walletAddress) {
        debug.steps.push('⚠️ No wallet address provided for scoped caching');
        
        // Step 2.5: Try cross-wallet search as additional fallback
        debug.steps.push('2.5️⃣ Trying cross-wallet metadata search...');
        const crossWalletMetadata = getNFTMetadataClientCrossWallet(nftContract, tokenId);
        
        if (crossWalletMetadata) {
          debug.steps.push(`✅ Found cross-wallet metadata from ${crossWalletMetadata.sourceWallet?.slice(0, 10)}...`);
          debug.crossWalletMetadata = crossWalletMetadata;
          
          const crossWalletImageUrl = resolveIPFSUrlClient(crossWalletMetadata.image);
          debug.steps.push('🖼️ Testing cross-wallet image URL...');
          
          try {
            const crossWalletResponse = await fetch(crossWalletImageUrl, { method: 'HEAD' });
            debug.crossWalletImageTest = {
              url: crossWalletImageUrl,
              status: crossWalletResponse.status,
              ok: crossWalletResponse.ok
            };
            
            if (crossWalletResponse.ok) {
              setImageUrl(crossWalletImageUrl);
              debug.steps.push('✅ Cross-wallet image URL working');
              debug.finalSource = 'cross-wallet';
              setDebugInfo(debug);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            debug.steps.push('❌ Cross-wallet image URL failed');
          }
        } else {
          debug.steps.push('ℹ️ No cross-wallet metadata found');
        }
      }
      
      // Step 3: Try to regenerate metadata if available
      debug.steps.push('3️⃣ Attempting metadata regeneration...');
      try {
        const regenerateResponse = await fetch(`/api/nft/regenerate-metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractAddress: nftContract, tokenId })
        });
        
        if (regenerateResponse.ok) {
          const regeneratedData = await regenerateResponse.json();
          debug.steps.push('✅ Metadata regeneration successful');
          debug.regeneratedData = regeneratedData;
          
          if (regeneratedData.imageUrl) {
            setImageUrl(regeneratedData.imageUrl);
            debug.finalSource = 'regenerated';
            setDebugInfo(debug);
            setIsLoading(false);
            return;
          }
        } else {
          debug.steps.push('⚠️ Metadata regeneration failed');
        }
      } catch (error) {
        debug.steps.push('❌ Regeneration error: ' + error.message);
      }
      
      // Step 4: Fallback to placeholder
      debug.steps.push('4️⃣ Using placeholder image');
      setImageUrl('/images/nft-placeholder.png');
      debug.finalSource = 'placeholder';
      debug.needsRegeneration = true;
      
    } catch (error) {
      debug.steps.push('❌ Critical error: ' + error.message);
      setImageUrl('/images/nft-placeholder.png');
      debug.finalSource = 'error-placeholder';
    } finally {
      setDebugInfo(debug);
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    await debugImageLoading();
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading ? (
        <div className="w-full h-64 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
          <span className="text-gray-500">🔄 Loading image...</span>
        </div>
      ) : (
        <div className="relative">
          <Image
            src={imageUrl}
            alt="NFT"
            width={400}
            height={400}
            className="rounded-lg object-cover"
            onError={() => {
              console.error('Image failed to load:', imageUrl);
              setImageUrl('/images/nft-placeholder.png');
            }}
          />
          
          {debugInfo.needsRegeneration && (
            <button
              onClick={handleRegenerate}
              className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              🔄 Recuperar Imagen Real
            </button>
          )}
        </div>
      )}
      
      {/* Debug Information */}
      <div className="mt-4">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          🐛 {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>
        
        {showDebug && (
          <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
            <div className="mb-2">
              <strong>Source:</strong> {debugInfo.finalSource || 'unknown'}
              {debugInfo.walletScope && (
                <span className="ml-2 text-blue-600">
                  (Wallet: {debugInfo.walletScope})
                </span>
              )}
              {debugInfo.uniqueId && (
                <span className="ml-2 text-green-600">
                  (ID: {debugInfo.uniqueId.slice(-8)})
                </span>
              )}
            </div>
            <div className="space-y-1">
              {debugInfo.steps?.map((step: string, index: number) => (
                <div key={index} className="text-gray-600">
                  {step}
                </div>
              ))}
            </div>
            {debugInfo.apiData && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">API Data</summary>
                <pre className="mt-1 text-xs overflow-auto">
                  {JSON.stringify(debugInfo.apiData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};