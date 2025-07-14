"use client";

import React, { useState, useEffect } from 'react';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { client } from '../client';
import { TBAWalletContainer } from '../../components/TBAWallet';

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

  // Load user's wallets
  useEffect(() => {
    if (account?.address) {
      loadUserWallets();
    }
  }, [account]);

  const loadUserWallets = async () => {
    if (!account?.address) return;
    
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to get user's NFT wallets
      // For now, we'll create a mock wallet from localStorage or API
      const mockWallets: UserWallet[] = [
        {
          id: '1',
          name: 'CryptoGift Wallet #1752523269965',
          address: account.address,
          tbaAddress: '0xF5af...68Bf',
          nftContract: '0x54314166B36E3Cc66cFb36265D99697f4F733231',
          tokenId: '1752523269965',
          image: '/images/nft-placeholder.png',
          balance: {
            eth: '0.0000',
            usdc: '0.00',
            total: '$0.00'
          },
          isActive: true
        }
      ];
      
      setWallets(mockWallets);
      setActiveWallet(mockWallets[0]?.id || null);
    } catch (error) {
      console.error('Error loading user wallets:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💎</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Mis CryptoGift Wallets</h1>
          <p className="text-gray-600 mb-6">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            💎 Mis CryptoGift Wallets
          </h1>
          <p className="text-gray-600">
            Gestiona todas tus NFT-Wallets desde un solo lugar
          </p>
        </div>

        {/* Wallet Selector */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Wallet Activa</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Conectada</span>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando tus wallets...</p>
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No tienes wallets aún</h3>
                <p className="text-gray-600 mb-6">
                  Crea o recibe tu primer CryptoGift para empezar
                </p>
                <a
                  href="/"
                  className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Crear Mi Primer Regalo
                </a>
              </div>
            ) : (
              <div className="grid gap-4">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      wallet.isActive
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* NFT Image */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-orange-200">
                          <img
                            src={wallet.image}
                            alt={wallet.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/images/nft-placeholder.png';
                            }}
                          />
                        </div>
                        
                        {/* Wallet Info */}
                        <div>
                          <h3 className="font-semibold text-gray-800">{wallet.name}</h3>
                          <p className="text-sm text-gray-600">
                            {wallet.tbaAddress} • {wallet.balance.total}
                          </p>
                        </div>

                        {/* Active Badge */}
                        {wallet.isActive && (
                          <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                            Activa
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleWalletSelect(wallet)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Abrir
                        </button>
                        {!wallet.isActive && (
                          <button
                            onClick={() => handleSetAsActive(wallet.id)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
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
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="text-3xl mb-4">🌐</div>
            <h3 className="font-bold text-gray-800 mb-3">Extensión del Navegador</h3>
            <p className="text-sm text-gray-600 mb-4">
              Agrega tu wallet como extensión para acceso rápido
            </p>
            <button className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm">
              Instalar Extensión
            </button>
          </div>

          {/* Wallet Security */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="font-bold text-gray-800 mb-3">Seguridad Avanzada</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configura recuperación social y autenticación 2FA
            </p>
            <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors text-sm">
              Configurar Seguridad
            </button>
          </div>

          {/* Account Management */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="text-3xl mb-4">⚙️</div>
            <h3 className="font-bold text-gray-800 mb-3">Gestión de Cuenta</h3>
            <p className="text-sm text-gray-600 mb-4">
              Accede a servicios internos y configuración avanzada
            </p>
            <button className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm">
              Configurar Cuenta
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/"
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                🎁 Crear Nuevo Regalo
              </a>
              <a
                href="/knowledge"
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                📚 Academia CryptoGift
              </a>
              <a
                href="/nexuswallet"
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                🚀 NexusWallet Exchange
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TBA Wallet Modal */}
      {showWalletInterface && selectedWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative">
            <TBAWalletContainer
              nftContract={selectedWallet.nftContract}
              tokenId={selectedWallet.tokenId}
              onClose={() => setShowWalletInterface(false)}
              className="mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}