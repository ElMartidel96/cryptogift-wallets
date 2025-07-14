"use client";

import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';

export interface TBAWallet {
  id: string;
  name: string;
  nftContract: string;
  tokenId: string;
  tbaAddress: string;
  image: string;
  isActive: boolean;
}

export function useActiveWallet() {
  const account = useActiveAccount();
  const [tbaWallet, setTbaWallet] = useState<TBAWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load active TBA wallet from localStorage
  useEffect(() => {
    if (account?.address) {
      loadActiveTBAWallet();
    } else {
      setTbaWallet(null);
      setIsLoading(false);
    }
  }, [account]);

  const loadActiveTBAWallet = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from localStorage first
      const savedWalletId = localStorage.getItem('activeTBAWalletId');
      const savedWalletData = localStorage.getItem('activeTBAWalletData');
      
      if (savedWalletId && savedWalletData) {
        const walletData = JSON.parse(savedWalletData);
        setTbaWallet(walletData);
      }
      
      // TODO: Also sync with API to get latest wallet data
      
    } catch (error) {
      console.error('Error loading active TBA wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveTBAWallet = (wallet: TBAWallet | null) => {
    setTbaWallet(wallet);
    
    if (wallet) {
      localStorage.setItem('activeTBAWalletId', wallet.id);
      localStorage.setItem('activeTBAWalletData', JSON.stringify(wallet));
    } else {
      localStorage.removeItem('activeTBAWalletId');
      localStorage.removeItem('activeTBAWalletData');
    }
  };

  const hasActiveTBAWallet = () => {
    return tbaWallet !== null;
  };

  const getWalletDisplayName = () => {
    if (tbaWallet) {
      return tbaWallet.name;
    }
    if (account?.address) {
      return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
    }
    return 'No Wallet';
  };

  const getWalletType = (): 'EOA' | 'TBA' | 'NONE' => {
    if (tbaWallet) return 'TBA';
    if (account?.address) return 'EOA';
    return 'NONE';
  };

  return {
    // Current connected wallet (EOA)
    account,
    
    // Active TBA wallet (if any)
    tbaWallet,
    setActiveTBAWallet,
    hasActiveTBAWallet,
    
    // Helpers
    getWalletDisplayName,
    getWalletType,
    isLoading,
    
    // For switching between wallets
    currentWalletAddress: tbaWallet?.tbaAddress || account?.address || null,
    currentWalletType: getWalletType(),
  };
}