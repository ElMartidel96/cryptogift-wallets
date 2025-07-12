'use client';

import React, { useState } from 'react';
import TBAWalletInterface from './WalletInterface';
import SendModal from './SendModal';
import ReceiveModal from './ReceiveModal';
import SwapModal from './SwapModal';

// Security: Enhanced TBA Wallet Container with comprehensive state management
interface TBAWalletContainerProps {
  nftContract: string;
  tokenId: string;
  onClose?: () => void;
  className?: string;
}

export const TBAWalletContainer: React.FC<TBAWalletContainerProps> = ({
  nftContract,
  tokenId,
  onClose,
  className = ''
}) => {
  const [activeModal, setActiveModal] = useState<'send' | 'receive' | 'swap' | null>(null);
  const [walletData, setWalletData] = useState({
    address: '',
    balance: {
      eth: '0',
      usdc: '0'
    }
  });

  // Security: Safe transaction handlers with comprehensive error handling
  const handleSend = async (to: string, amount: string, token: 'ETH' | 'USDC') => {
    try {
      console.log('🔄 Initiating TBA send transaction:', { to, amount, token });
      
      // TODO: Implement actual TBA transaction via TokenBound SDK
      // This will integrate with the ERC-6551 standard for token bound accounts
      
      // Security: Validate transaction parameters
      if (!to || !amount || !token) {
        throw new Error('Invalid transaction parameters');
      }

      // Simulate transaction for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ TBA send transaction completed');
      
      // Refresh wallet data after successful transaction
      // refreshWalletData();
      
    } catch (error) {
      console.error('❌ TBA send transaction failed:', error);
      throw error;
    }
  };

  const handleSwap = async (fromToken: string, toToken: string, amount: string) => {
    try {
      console.log('🔄 Initiating TBA swap transaction:', { fromToken, toToken, amount });
      
      // TODO: Implement actual TBA swap via 0x Protocol integration
      // This will use the existing swap API with TBA wallet integration
      
      // Security: Validate swap parameters
      if (!fromToken || !toToken || !amount) {
        throw new Error('Invalid swap parameters');
      }

      // Simulate swap for now
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ TBA swap transaction completed');
      
      // Refresh wallet data after successful swap
      // refreshWalletData();
      
    } catch (error) {
      console.error('❌ TBA swap transaction failed:', error);
      throw error;
    }
  };

  // Security: Update wallet data callback
  const handleWalletDataUpdate = (data: typeof walletData) => {
    setWalletData(data);
  };

  return (
    <div className={`tba-wallet-container ${className}`}>
      {/* Main Wallet Interface */}
      <TBAWalletInterface
        nftContract={nftContract}
        tokenId={tokenId}
        onClose={onClose}
      />

      {/* Send Modal */}
      <SendModal
        isOpen={activeModal === 'send'}
        onClose={() => setActiveModal(null)}
        walletAddress={walletData.address}
        availableBalance={walletData.balance}
        onSend={handleSend}
      />

      {/* Receive Modal */}
      <ReceiveModal
        isOpen={activeModal === 'receive'}
        onClose={() => setActiveModal(null)}
        walletAddress={walletData.address}
        tokenId={tokenId}
      />

      {/* Swap Modal */}
      <SwapModal
        isOpen={activeModal === 'swap'}
        onClose={() => setActiveModal(null)}
        walletAddress={walletData.address}
        availableBalance={walletData.balance}
        onSwap={handleSwap}
      />
    </div>
  );
};

// Export individual components for granular usage
export { default as TBAWalletInterface } from './WalletInterface';
export { default as SendModal } from './SendModal';
export { default as ReceiveModal } from './ReceiveModal';
export { default as SwapModal } from './SwapModal';

// Main export
export default TBAWalletContainer;