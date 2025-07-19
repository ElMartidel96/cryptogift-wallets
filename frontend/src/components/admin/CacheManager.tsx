"use client";

import React, { useState } from 'react';
import { clearAllUserCache, getDetailedCacheInfo } from '../../lib/clientMetadataStore';

interface CacheManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CacheManager: React.FC<CacheManagerProps> = ({ isOpen, onClose }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [clearResults, setClearResults] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const loadCacheInfo = () => {
    const info = getDetailedCacheInfo();
    setCacheInfo(info);
  };

  const handleClearClientCache = () => {
    setIsClearing(true);
    try {
      const results = clearAllUserCache();
      setClearResults(results);
      loadCacheInfo(); // Refresh info after clearing
    } catch (error) {
      setClearResults({ 
        cleared: false, 
        details: { error: error instanceof Error ? error.message : 'Unknown error' } 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearServerCache = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'clear_server', 
          confirm: 'CLEAR_ALL_CACHE_CONFIRMED' 
        })
      });

      const results = await response.json();
      setClearResults(results);
    } catch (error) {
      setClearResults({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAllCache = async () => {
    setIsClearing(true);
    try {
      // Clear client cache first
      const clientResults = clearAllUserCache();
      
      // Then clear server cache
      const serverResponse = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'clear_all', 
          confirm: 'CLEAR_ALL_CACHE_CONFIRMED' 
        })
      });

      const serverResults = await serverResponse.json();
      
      setClearResults({
        combined: true,
        client: clientResults,
        server: serverResults
      });
      
      loadCacheInfo(); // Refresh info after clearing
    } catch (error) {
      setClearResults({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsClearing(false);
      setShowConfirmation(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadCacheInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h1 className="text-2xl font-bold text-red-600">🧹 Cache Manager</h1>
            <p className="text-sm text-gray-500 mt-1">
              Administración de cache para testing desde cero
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Cache Information */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-blue-800">📊 Cache Information</h3>
              <button
                onClick={loadCacheInfo}
                className="text-sm text-blue-600 hover:underline"
              >
                🔄 Refresh
              </button>
            </div>
            
            {cacheInfo ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Wallet Caches:</strong> {cacheInfo.walletCaches?.length || 0}</p>
                    <p><strong>IPFS Gateway Caches:</strong> {cacheInfo.ipfsGatewayCaches?.length || 0}</p>
                    <p><strong>Total Size:</strong> {(cacheInfo.totalSize / 1024).toFixed(2)} KB</p>
                  </div>
                  <div>
                    <p><strong>Device Registered Wallets:</strong> {cacheInfo.deviceInfo?.registeredWallets?.length || 0}</p>
                    <p><strong>Last Scan:</strong> {new Date(cacheInfo.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>

                {cacheInfo.walletCaches?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium text-blue-700">
                      Ver detalles de wallets ({cacheInfo.walletCaches.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {cacheInfo.walletCaches.map((wallet: any, index: number) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border">
                          <span className="font-mono">{wallet.walletAddress}</span> - 
                          {wallet.nftCount} NFTs ({(wallet.sizeBytes / 1024).toFixed(1)} KB)
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Click Refresh to load cache information</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <h3 className="font-semibold">🚀 Cache Clearing Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client Cache */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">💻 Client Cache</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Limpia localStorage: wallet caches, IPFS gateways, device info
                </p>
                <button
                  onClick={handleClearClientCache}
                  disabled={isClearing}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isClearing ? '⏳' : '🧹'} Clear Client
                </button>
              </div>

              {/* Server Cache */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">🗄️ Server Cache</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Limpia Redis: NFT metadata, referrals, guardians
                </p>
                <button
                  onClick={handleClearServerCache}
                  disabled={isClearing}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  {isClearing ? '⏳' : '🗄️'} Clear Server
                </button>
              </div>

              {/* All Cache */}
              <div className="border rounded-lg p-4 border-red-200 bg-red-50">
                <h4 className="font-medium mb-2 text-red-700">⚠️ ALL Cache</h4>
                <p className="text-sm text-red-600 mb-3">
                  ELIMINA TODO: Client + Server cache completo
                </p>
                {showConfirmation ? (
                  <div className="space-y-2">
                    <p className="text-xs text-red-700 font-medium">¿Estás seguro?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearAllCache}
                        disabled={isClearing}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {isClearing ? '⏳' : '💀'} SÍ, BORRAR TODO
                      </button>
                      <button
                        onClick={() => setShowConfirmation(false)}
                        className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmation(true)}
                    disabled={isClearing}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {isClearing ? '⏳' : '💀'} Clear ALL
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Display */}
          {clearResults && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold mb-3">📋 Clear Results</h3>
              <div className="space-y-2 text-sm">
                {clearResults.combined ? (
                  <div>
                    <p className="font-medium text-green-600">✅ Combined Operation Complete</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Client Results</summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                        {JSON.stringify(clearResults.client, null, 2)}
                      </pre>
                    </details>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Server Results</summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                        {JSON.stringify(clearResults.server, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <pre className="text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(clearResults, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚡ Testing Instructions</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>1. <strong>Clear ALL Cache</strong> para empezar desde cero</p>
              <p>2. <strong>Refresh browser</strong> (F5) para confirmar limpieza</p>
              <p>3. <strong>Create new NFT</strong> para probar imagen sin cache</p>
              <p>4. <strong>Different wallets</strong> para verificar aislamiento</p>
              <p>5. <strong>Check logs</strong> en /debug para monitorear proceso</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};