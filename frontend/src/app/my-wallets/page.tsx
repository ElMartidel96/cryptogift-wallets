"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { client } from '../client';
import { RightSlideWallet } from '../../components/TBAWallet/RightSlideWallet';
import { ExtensionInstaller } from '../../components/BrowserExtension/ExtensionInstaller';
import { AdvancedSecurity } from '../../components/Security/AdvancedSecurity';
import { AccountManagement } from '../../components/Account/AccountManagement';

interface UserWallet {
  id: string;
  name: string;
  address: string;
  tbaAddress: string;
  nftContract: string;
  tokenId: string;
  image: string;
  balance: {
    eth: string;
    usdc: string;
    total: string;
  };
  isActive: boolean;
}

export default function MyWalletsPage() {
  const account = useActiveAccount();
  const [mounted, setMounted] = useState(false);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [showWalletInterface, setShowWalletInterface] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadUserWallets = useCallback(async () => {
    if (!account?.address) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Loading NFT-Wallets for user:', account.address);
      
      // FIXED: Use real API to get user's NFT wallets
      const response = await fetch(`/api/user/nft-wallets?userAddress=${account.address}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ NFT-Wallets loaded:', data);
      
      if (data.success && data.wallets) {
        setWallets(data.wallets);
        
        // Set first wallet as active if none is set
        const activeWalletExists = data.wallets.some((w: UserWallet) => w.isActive);
        if (!activeWalletExists && data.wallets.length > 0) {
          setActiveWallet(data.wallets[0].id);
        } else {
          const activeWallet = data.wallets.find((w: UserWallet) => w.isActive);
          setActiveWallet(activeWallet?.id || null);
        }
      } else {
        console.log('⚠️ No NFT-Wallets found for user');
        setWallets([]);
        setActiveWallet(null);
      }
    } catch (error) {
      console.error('Error loading user wallets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  // Load user's wallets
  useEffect(() => {
    if (account?.address) {
      loadUserWallets();
    }
  }, [account, loadUserWallets]);

  const handleWalletSelect = (wallet: UserWallet) => {
    setSelectedWallet(wallet);
    setShowWalletInterface(true);
  };

  const handleSetAsActive = (walletId: string) => {
    setActiveWallet(walletId);
    setWallets(prev => prev.map(w => ({ 
      ...w, 
      isActive: w.id === walletId 
    })));
    // TODO: Save active wallet preference to localStorage or API
    localStorage.setItem('activeWalletId', walletId);
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 
                     dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary transition-all duration-500">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-orange-100 dark:bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
            <span className="text-2xl">💎</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2 transition-colors duration-300">Mis CryptoGift Wallets</h1>
          <p className="text-text-secondary mb-6 transition-colors duration-300">
            Conecta tu wallet para ver y gestionar tus NFT-Wallets de CryptoGift
          </p>
          <ConnectButton
            client={client}
            appMetadata={{
              name: "CryptoGift Wallets",
              url: "https://cryptogift-wallets.vercel.app",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 
                   dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary transition-all duration-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2 transition-colors duration-300">
            💎 Mis CryptoGift Wallets
          </h1>
          <p className="text-text-secondary transition-colors duration-300">
            Gestiona todas tus NFT-Wallets desde un solo lugar
          </p>
        </div>

        {/* Wallet Selector */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-bg-card rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary transition-colors duration-300">Wallet Activa</h2>
              <div className="flex items-center space-x-2 text-sm text-text-secondary transition-colors duration-300">
                <span className="w-2 h-2 bg-green-500 dark:bg-accent-gold rounded-full transition-colors duration-300"></span>
                <span>Conectada</span>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 dark:border-accent-gold mx-auto mb-4 transition-colors duration-300"></div>
                <p className="text-text-secondary transition-colors duration-300">Cargando tus wallets...</p>
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-text-muted text-4xl mb-4 transition-colors duration-300">📭</div>
                <h3 className="text-lg font-medium text-text-primary mb-2 transition-colors duration-300">No tienes wallets aún</h3>
                <p className="text-text-secondary mb-6 transition-colors duration-300">
                  Crea o recibe tu primer CryptoGift para empezar
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-orange-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-orange-600 dark:hover:bg-accent-gold/80 transition-all duration-300"
                >
                  Crear Mi Primer Regalo
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      wallet.isActive
                        ? 'border-orange-500 dark:border-accent-gold bg-orange-50 dark:bg-accent-gold/20'
                        : 'border-border-primary hover:border-border-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* NFT Image */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-orange-200 dark:border-accent-gold/30 transition-colors duration-300">
                          <Image
                            src={wallet.image}
                            alt={wallet.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/images/nft-placeholder.png';
                            }}
                          />
                        </div>
                        
                        {/* Wallet Info */}
                        <div>
                          <h3 className="font-semibold text-text-primary transition-colors duration-300">{wallet.name}</h3>
                          <p className="text-sm text-text-secondary transition-colors duration-300">
                            {wallet.tbaAddress} • {wallet.balance.total}
                          </p>
                        </div>

                        {/* Active Badge */}
                        {wallet.isActive && (
                          <div className="bg-orange-500 dark:bg-accent-gold text-white dark:text-bg-primary text-xs px-2 py-1 rounded-full transition-colors duration-300">
                            Activa
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleWalletSelect(wallet)}
                          className="px-4 py-2 bg-blue-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-blue-600 dark:hover:bg-accent-gold/80 transition-all duration-300 text-sm"
                        >
                          Abrir
                        </button>
                        {!wallet.isActive && (
                          <button
                            onClick={() => handleSetAsActive(wallet.id)}
                            className="px-4 py-2 border border-border-primary rounded-lg hover:bg-bg-secondary transition-all duration-300 text-sm text-text-secondary hover:text-text-primary"
                          >
                            Usar Como Principal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {/* Browser Extension */}
          {activeWallet && wallets.length > 0 && (() => {
            const wallet = wallets.find(w => w.id === activeWallet);
            return wallet ? (
              <ExtensionInstaller
                walletData={{
                  nftContract: wallet.nftContract,
                  tokenId: wallet.tokenId,
                  tbaAddress: wallet.tbaAddress,
                  name: wallet.name,
                  image: wallet.image
                }}
                className="shadow-lg"
              />
            ) : null;
          })()}

          {/* Advanced Security */}
          {activeWallet && wallets.length > 0 && (() => {
            const wallet = wallets.find(w => w.id === activeWallet);
            return wallet ? (
              <AdvancedSecurity
                walletAddress={wallet.tbaAddress}
                className="rounded-2xl shadow-lg"
              />
            ) : null;
          })()}

          {/* Account Management */}
          {account && (
            <AccountManagement
              walletAddress={account.address}
              className="rounded-2xl shadow-lg"
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <div className="bg-bg-card rounded-2xl shadow-xl p-6 transition-colors duration-300">
            <h3 className="text-xl font-bold text-text-primary mb-4 transition-colors duration-300">Acciones Rápidas</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="px-6 py-3 bg-orange-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-orange-600 dark:hover:bg-accent-gold/80 transition-all duration-300"
              >
                🎁 Crear Nuevo Regalo
              </Link>
              <a
                href="/knowledge"
                className="px-6 py-3 bg-blue-500 dark:bg-accent-silver text-white dark:text-bg-primary rounded-lg hover:bg-blue-600 dark:hover:bg-accent-silver/80 transition-all duration-300"
              >
                📚 Academia CryptoGift
              </a>
              <a
                href="/nexuswallet"
                className="px-6 py-3 bg-purple-500 dark:bg-accent-gold text-white dark:text-bg-primary rounded-lg hover:bg-purple-600 dark:hover:bg-accent-gold/80 transition-all duration-300"
              >
                🚀 NexusWallet Exchange
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TBA Wallet Slide Panel */}
      {showWalletInterface && selectedWallet && (
        <RightSlideWallet
          isOpen={showWalletInterface}
          onClose={() => setShowWalletInterface(false)}
          nftContract={selectedWallet.nftContract}
          tokenId={selectedWallet.tokenId}
        />
      )}
    </div>
  );
}