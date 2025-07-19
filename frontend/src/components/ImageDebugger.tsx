"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getNFTMetadataClient, resolveIPFSUrlClient } from '../lib/clientMetadataStore';
import { FlowDiagnostic } from './FlowDiagnostic';

interface ImageDebuggerProps {
  nftContract: string;
  tokenId: string;
  className?: string;
}

export const ImageDebugger: React.FC<ImageDebuggerProps> = ({
  nftContract,
  tokenId,
  className = ""
}) => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    debugImageLoading();
  }, [nftContract, tokenId]);

  const debugImageLoading = async () => {
    setIsLoading(true);
    const debug: any = {
      nftContract,
      tokenId,
      timestamp: new Date().toISOString(),
      steps: []
    };

    try {
      // Step 0: Check client storage first
      debug.steps.push('0️⃣ Checking client storage...');
      const clientMetadata = getNFTMetadataClient(nftContract, tokenId);
      
      if (clientMetadata) {
        debug.steps.push('✅ Found client metadata');
        debug.clientMetadata = clientMetadata;
        
        const clientImageUrl = resolveIPFSUrlClient(clientMetadata.image);
        debug.steps.push('1️⃣ Testing client image URL...');
        
        try {
          const clientResponse = await fetch(clientImageUrl, { method: 'HEAD' });
          debug.clientImageTest = {
            url: clientImageUrl,
            status: clientResponse.status,
            ok: clientResponse.ok
          };
          
          if (clientResponse.ok) {
            setImageUrl(clientImageUrl);
            debug.steps.push('✅ Client image URL working');
            debug.finalSource = 'client';
            setDebugInfo(debug);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          debug.steps.push('❌ Client image URL failed');
        }
      } else {
        debug.steps.push('⚠️ No client metadata found');
      }
      
      // Step 1: Test our NFT API
      debug.steps.push('1️⃣ Testing NFT API...');
      const apiResponse = await fetch(`/api/nft/${nftContract}/${tokenId}`);
      debug.apiStatus = apiResponse.status;
      debug.apiOk = apiResponse.ok;
      
      if (apiResponse.ok) {
        const nftData = await apiResponse.json();
        debug.apiData = nftData;
        debug.steps.push('✅ NFT API successful');
        
        if (nftData.image) {
          let testImageUrl = nftData.image;
          debug.originalImageUrl = testImageUrl;
          
          // Step 2: Test IPFS URL conversion
          if (testImageUrl.startsWith('ipfs://')) {
            debug.steps.push('2️⃣ Converting IPFS URL...');
            const ipfsHash = testImageUrl.replace('ipfs://', '');
            debug.ipfsHash = ipfsHash;
            
            // Try multiple IPFS gateways
            const gateways = [
              `https://nftstorage.link/ipfs/${ipfsHash}`,
              `https://ipfs.io/ipfs/${ipfsHash}`,
              `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
              `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
            ];
            
            debug.gateways = [];
            
            for (const gateway of gateways) {
              try {
                debug.steps.push(`🔍 Testing gateway: ${gateway.split('/')[2]}`);
                const response = await fetch(gateway, { method: 'HEAD' });
                debug.gateways.push({
                  url: gateway,
                  status: response.status,
                  ok: response.ok,
                  headers: Object.fromEntries(response.headers.entries())
                });
                
                if (response.ok) {
                  testImageUrl = gateway;
                  debug.steps.push(`✅ Gateway working: ${gateway.split('/')[2]}`);
                  break;
                }
              } catch (error) {
                debug.gateways.push({
                  url: gateway,
                  error: error.message
                });
                debug.steps.push(`❌ Gateway failed: ${gateway.split('/')[2]}`);
              }
            }
          }
          
          // Step 3: Check if this is a placeholder and auto-regenerate
          const isPlaceholder = testImageUrl.includes('placeholder') || 
                                testImageUrl.includes('cg-wallet-placeholder') ||
                                nftData.image.includes('placeholder');
          
          if (isPlaceholder) {
            debug.steps.push('⚠️ Placeholder detected, attempting auto-regeneration...');
            try {
              // Auto-trigger metadata regeneration
              const regenerateResponse = await fetch('/api/nft/regenerate-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contractAddress: nftContract,
                  tokenId
                })
              });

              if (regenerateResponse.ok) {
                debug.steps.push('✅ Auto-regeneration successful, retrying...');
                
                // Retry with regenerated metadata
                const retryResponse = await fetch(`/api/nft/${nftContract}/${tokenId}`);
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  if (retryData.image && !retryData.image.includes('placeholder')) {
                    testImageUrl = retryData.image;
                    debug.steps.push('✅ Regenerated image found');
                  }
                }
              } else {
                debug.steps.push('⚠️ Auto-regeneration failed, using placeholder');
              }
            } catch (regenerateError) {
              debug.steps.push(`⚠️ Auto-regeneration error: ${regenerateError.message}`);
            }
          }

          // Step 4: Test final image URL
          debug.steps.push('4️⃣ Testing final image URL...');
          try {
            const imageResponse = await fetch(testImageUrl, { method: 'HEAD' });
            debug.finalImageTest = {
              url: testImageUrl,
              status: imageResponse.status,
              ok: imageResponse.ok,
              contentType: imageResponse.headers.get('content-type'),
              contentLength: imageResponse.headers.get('content-length')
            };
            
            if (imageResponse.ok) {
              setImageUrl(testImageUrl);
              debug.steps.push('✅ Final image URL working');
            } else {
              debug.steps.push(`❌ Final image URL failed: ${imageResponse.status}`);
            }
          } catch (error) {
            debug.finalImageTest = { error: error.message };
            debug.steps.push(`❌ Final image URL error: ${error.message}`);
          }
        } else {
          debug.steps.push('❌ No image found in NFT data');
        }
      } else {
        debug.steps.push(`❌ NFT API failed: ${apiResponse.status}`);
        try {
          const errorData = await apiResponse.text();
          debug.apiError = errorData;
        } catch (e) {
          debug.apiError = 'Could not read error response';
        }
      }
    } catch (error) {
      debug.error = error.message;
      debug.steps.push(`❌ Debug failed: ${error.message}`);
    }

    setDebugInfo(debug);
    setIsLoading(false);
    
    // Log to console for debugging
    console.log('🐛 NFT Image Debug Info:', debug);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Image Display */}
      <div className="relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`NFT ${tokenId}`}
            width={100}
            height={100}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              console.error('🖼️ Image failed to load:', imageUrl);
              setImageUrl('/images/nft-placeholder.png');
            }}
            onLoad={() => {
              console.log('✅ Image loaded successfully:', imageUrl);
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
            {isLoading ? (
              <div className="animate-spin text-2xl">🔄</div>
            ) : (
              <div className="text-gray-500 text-center p-2">
                <div className="text-2xl mb-2">❌</div>
                <div className="text-xs">Image Failed</div>
              </div>
            )}
          </div>
        )}
        
        {/* Debug Toggle Button */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="absolute top-1 right-1 w-6 h-6 bg-black bg-opacity-50 text-white rounded-full text-xs flex items-center justify-center"
          title="Toggle Debug Info"
        >
          🐛
        </button>
      </div>

      {/* Debug Info Panel */}
      {showDebug && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black text-green-400 text-xs p-3 rounded-lg font-mono z-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">🐛 Debug Info</span>
            <button
              onClick={() => setShowDebug(false)}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <div><span className="text-yellow-400">Contract:</span> {debugInfo.nftContract}</div>
            <div><span className="text-yellow-400">Token ID:</span> {debugInfo.tokenId}</div>
            <div><span className="text-yellow-400">API Status:</span> {debugInfo.apiStatus} {debugInfo.apiOk ? '✅' : '❌'}</div>
            
            {debugInfo.originalImageUrl && (
              <div><span className="text-yellow-400">Original URL:</span> {debugInfo.originalImageUrl}</div>
            )}
            
            {debugInfo.ipfsHash && (
              <div><span className="text-yellow-400">IPFS Hash:</span> {debugInfo.ipfsHash}</div>
            )}
            
            {debugInfo.finalImageTest && (
              <div>
                <span className="text-yellow-400">Final Test:</span> 
                {debugInfo.finalImageTest.ok ? '✅' : '❌'} 
                {debugInfo.finalImageTest.status}
                {debugInfo.finalImageTest.contentType && ` (${debugInfo.finalImageTest.contentType})`}
              </div>
            )}
            
            <div className="border-t border-gray-600 pt-2">
              <div className="text-yellow-400 mb-1">Steps:</div>
              {debugInfo.steps?.map((step: string, index: number) => (
                <div key={index} className="text-xs">{step}</div>
              ))}
            </div>
            
            {debugInfo.gateways && debugInfo.gateways.length > 0 && (
              <div className="border-t border-gray-600 pt-2">
                <div className="text-yellow-400 mb-1">IPFS Gateways:</div>
                {debugInfo.gateways.map((gateway: any, index: number) => (
                  <div key={index} className="text-xs">
                    {gateway.url.split('/')[2]}: {gateway.ok ? '✅' : '❌'} {gateway.status || gateway.error}
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={debugImageLoading}
              className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              🔄 Re-test
            </button>
          </div>
        </div>
      )}
      
      {/* Flow Diagnostic Panel */}
      {showDebug && (
        <div className="absolute top-full left-0 right-0 mt-80 z-40">
          <FlowDiagnostic 
            contractAddress={nftContract} 
            tokenId={tokenId} 
          />
        </div>
      )}
    </div>
  );
};