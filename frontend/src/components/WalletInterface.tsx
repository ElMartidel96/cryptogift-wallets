"use client";

import React, { useState, useEffect } from 'react';
import { TransactionButton } from 'thirdweb/react';
import { SwapModal } from './SwapModal';
import { GuardiansModal } from './GuardiansModal';
import { COMMON_TOKENS } from '../lib/constants';

interface WalletInterfaceProps {
  nftData: any;
  tbaAddress: string;
  contractAddress: string;
  tokenId: string;
}

export const WalletInterface: React.FC<WalletInterfaceProps> = ({
  nftData,
  tbaAddress,
  contractAddress,
  tokenId
}) => {
  const [balance, setBalance] = useState('0');
  const [currentToken, setCurrentToken] = useState(COMMON_TOKENS.USDC);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showGuardiansModal, setShowGuardiansModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
    const interval = setInterval(loadWalletData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [tbaAddress]);

  const loadWalletData = async () => {
    try {
      const response = await fetch(`/api/wallet/${tbaAddress}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
        setCurrentToken(data.primaryToken || COMMON_TOKENS.USDC);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (contract: any) => {
    try {
      // Transfer all balance to the owner's EOA
      const tx = await contract.call('executeCall', [
        currentToken,
        '0',
        '0xa9059cbb' + // transfer(address,uint256)
        contract.interface.encodeFunctionData('transfer', [
          contract.signer.address, // to
          balance // amount
        ]).slice(2)
      ]);
      
      console.log('Withdraw transaction:', tx);
      await loadWalletData(); // Refresh data
      return tx;
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    }
  };

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (num === 0) return '0.00';
    if (num < 0.01) return '< 0.01';
    return num.toFixed(2);
  };

  const getTokenSymbol = (tokenAddress: string) => {
    if (tokenAddress === COMMON_TOKENS.USDC) return 'USDC';
    if (tokenAddress === COMMON_TOKENS.WETH) return 'WETH';
    if (tokenAddress === COMMON_TOKENS.DAI) return 'DAI';
    return 'TOKEN';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando wallet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Display */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 text-white">
        <div className="text-center">
          <div className="text-sm opacity-80 mb-2">Balance Total</div>
          <div className="text-4xl font-bold mb-2">
            ${formatBalance(balance)}
          </div>
          <div className="text-lg opacity-90">
            {getTokenSymbol(currentToken)}
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <div className="text-xs opacity-70">Wallet Address:</div>
          <div className="text-sm font-mono bg-white/20 rounded-lg px-3 py-1 mt-1">
            {tbaAddress.slice(0, 6)}...{tbaAddress.slice(-4)}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setShowSwapModal(true)}
          disabled={parseFloat(balance) === 0}
          className="flex flex-col items-center p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="font-medium text-blue-700">Cambiar Cripto</span>
          <span className="text-xs text-blue-600 mt-1">Swap a otros tokens</span>
        </button>

        <Web3Button
          contractAddress={tbaAddress}
          action={handleWithdraw}
          className="flex flex-col items-center p-4 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors"
          isDisabled={parseFloat(balance) === 0}
        >
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <span className="font-medium text-green-700">Retirar</span>
          <span className="text-xs text-green-600 mt-1">A tu wallet personal</span>
        </Web3Button>
      </div>

      {/* Security Section */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Seguridad
        </h3>
        
        <button
          onClick={() => setShowGuardiansModal(true)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium">Guardianes de Recuperación</div>
              <div className="text-sm text-gray-500">Configura contactos de confianza</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4">Transacciones Recientes</h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No hay transacciones aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx: any, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    tx.type === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {tx.type === 'receive' ? '↓' : '↑'}
                  </div>
                  <div>
                    <div className="font-medium">{tx.type === 'receive' ? 'Recibido' : 'Enviado'}</div>
                    <div className="text-sm text-gray-500">{tx.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${
                    tx.type === 'receive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'receive' ? '+' : '-'}${tx.amount}
                  </div>
                  <div className="text-sm text-gray-500">{tx.token}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Your Own Referral */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 text-white">
        <h3 className="font-bold mb-2">💰 ¿Quieres ganar dinero?</h3>
        <p className="text-sm opacity-90 mb-4">
          Invita a tus amigos y gana el 2% de cada regalo que creen usando tu link.
        </p>
        <a
          href="/referrals"
          className="inline-block bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Ver Mi Panel de Referidos
        </a>
      </div>

      {/* Modals */}
      <SwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        tbaAddress={tbaAddress}
        currentBalance={balance}
        currentToken={currentToken}
      />

      <GuardiansModal
        isOpen={showGuardiansModal}
        onClose={() => setShowGuardiansModal(false)}
        tbaAddress={tbaAddress}
      />
    </div>
  );
};