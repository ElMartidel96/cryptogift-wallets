"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useActiveWallet } from '../hooks/useActiveWallet';
import { RightSlideWallet } from './TBAWallet/RightSlideWallet';
import { ImageDebugger } from './ImageDebugger';

interface WalletSwitcherProps {
  className?: string;
  showBalance?: boolean;
}

export const WalletSwitcher: React.FC<WalletSwitcherProps> = ({
  className = "",
  showBalance = false
}) => {
  const { 
    account, 
    tbaWallet, 
    getWalletDisplayName, 
    getWalletType, 
    currentWalletAddress,
    hasActiveTBAWallet 
  } = useActiveWallet();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTBAWallet, setShowTBAWallet] = useState(false);

  if (!account) {
    return null;
  }

  const walletType = getWalletType();
  const displayName = getWalletDisplayName();

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Main Wallet Display */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3 bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors w-full"
        >
          {/* Wallet Icon */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
            {walletType === 'TBA' && tbaWallet ? (
              <ImageDebugger 
                nftContract={tbaWallet.nftContract}
                tokenId={tbaWallet.tokenId}
                className="w-6 h-6 rounded-full overflow-hidden"
              />
            ) : (
              <span className="text-blue-600 font-bold text-sm">EOA</span>
            )}
          </div>

          {/* Wallet Info */}
          <div className="flex-1 text-left">
            <div className="font-medium text-gray-800 text-sm">
              {displayName}
            </div>
            <div className="text-xs text-gray-500">
              {walletType === 'TBA' ? 'CryptoGift Wallet' : 'Regular Wallet'}
              {showBalance && (
                <span className="ml-2">• $0.00</span>
              )}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown Content */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="p-2">
                {/* Current EOA Wallet */}
                <button
                  onClick={() => {
                    // Switch to EOA wallet (disconnect TBA)
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                    walletType === 'EOA' ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">EOA</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800 text-sm">
                      {account.address.slice(0, 6)}...{account.address.slice(-4)}
                    </div>
                    <div className="text-xs text-gray-500">Regular Wallet</div>
                  </div>
                  {walletType === 'EOA' && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>

                {/* TBA Wallet (if available) */}
                {hasActiveTBAWallet() && tbaWallet && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      walletType === 'TBA' ? 'bg-orange-50 border border-orange-200' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                      <ImageDebugger 
                        nftContract={tbaWallet.nftContract}
                        tokenId={tbaWallet.tokenId}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-800 text-sm">
                        {tbaWallet.name}
                      </div>
                      <div className="text-xs text-gray-500">CryptoGift Wallet</div>
                    </div>
                    {walletType === 'TBA' && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    )}
                  </button>
                )}

                {/* Divider */}
                <div className="border-t border-gray-100 my-2"></div>

                {/* Actions */}
                {hasActiveTBAWallet() && tbaWallet && (
                  <button
                    onClick={() => {
                      setShowTBAWallet(true);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 text-sm">💎</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 text-sm">
                        Abrir CG Wallet
                      </div>
                      <div className="text-xs text-gray-500">Interfaz completa</div>
                    </div>
                  </button>
                )}

                <a
                  href="/my-wallets"
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setShowDropdown(false)}
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm">⚙️</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 text-sm">
                      Gestionar Wallets
                    </div>
                    <div className="text-xs text-gray-500">Ver todas mis wallets</div>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* TBA Wallet Slide Panel */}
      {showTBAWallet && tbaWallet && (
        <RightSlideWallet
          isOpen={showTBAWallet}
          onClose={() => setShowTBAWallet(false)}
          nftContract={tbaWallet.nftContract}
          tokenId={tbaWallet.tokenId}
        />
      )}
    </>
  );
};