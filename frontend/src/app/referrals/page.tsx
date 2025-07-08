"use client";

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount, ConnectButton, TransactionButton } from 'thirdweb/react';
import { prepareContractCall, getContract } from 'thirdweb';
import { baseSepolia, base } from 'thirdweb/chains';
import { client } from '../client';

export default function ReferralsPage() {
  const account = useActiveAccount();
  const [referralData, setReferralData] = useState({
    balance: '0',
    totalEarned: '0',
    referralCount: 0,
    pendingRewards: '0',
    referralUrl: '',
  });
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadReferralData = useCallback(async () => {
    if (!account) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account.address }),
      });

      if (response.ok) {
        const data = await response.json();
        setReferralData(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  const generateReferralUrl = useCallback(() => {
    if (!account) return;
    
    const baseUrl = window.location.origin;
    const referralUrl = `${baseUrl}/?ref=${account.address}`;
    setReferralData(prev => ({ ...prev, referralUrl }));
  }, [account]);

  useEffect(() => {
    if (account) {
      loadReferralData();
      generateReferralUrl();
    }
  }, [account, loadReferralData, generateReferralUrl]);

  const copyReferralUrl = () => {
    navigator.clipboard.writeText(referralData.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = () => {
    const contract = getContract({
      client,
      chain: process.env.NEXT_PUBLIC_CHAIN_ID === '84532' ? baseSepolia : base,
      address: process.env.NEXT_PUBLIC_REF_TREASURY_ADDRESS!,
    });

    return prepareContractCall({
      contract,
      method: 'withdraw',
      params: []
    });
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Panel de Referidos</h1>
          <p className="text-gray-600 mb-8">
            Conecta tu wallet para ver tus comisiones y generar tu link de referido
          </p>
          <ConnectButton
            client={client}
            appMetadata={{
              name: "CryptoGift Wallets",
              url: "https://cryptogift.gl",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            💰 Panel de Referidos
          </h1>
          <p className="text-gray-600">
            Gana dinero invitando amigos a CryptoGift Wallets
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${parseFloat(referralData.balance).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Balance Disponible</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ${parseFloat(referralData.totalEarned).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Ganado</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {referralData.referralCount}
                </div>
                <div className="text-sm text-gray-600">Amigos Invitados</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  ${parseFloat(referralData.pendingRewards).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Pendiente</div>
              </div>
            </div>
          </div>

          {/* Withdraw Section */}
          {parseFloat(referralData.balance) > 0 && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-8 text-white">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">¡Tienes dinero disponible!</h2>
                <p className="text-green-100 mb-6">
                  Puedes retirar ${parseFloat(referralData.balance).toFixed(2)} USDC a tu wallet
                </p>
                <TransactionButton
                  transaction={handleWithdraw}
                  onTransactionConfirmed={() => {
                    loadReferralData();
                  }}
                  className="bg-white text-green-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                >
                  💸 Retirar ${parseFloat(referralData.balance).toFixed(2)}
                </TransactionButton>
              </div>
            </div>
          )}

          {/* Referral Link Section */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Tu Link de Referido</h2>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">Comparte este link:</div>
                  <div className="font-mono text-sm bg-white p-3 rounded-lg border break-all">
                    {referralData.referralUrl}
                  </div>
                </div>
                <button
                  onClick={copyReferralUrl}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {copied ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  const text = `🎁 ¡Descubre CryptoGift Wallets! Crea regalos cripto únicos con arte IA. ¡Es gratis y súper fácil! ${referralData.referralUrl}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 p-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
              >
                <span>📱</span>
                Compartir en WhatsApp
              </button>

              <button
                onClick={() => {
                  const text = `🎁 ¡Descubre CryptoGift Wallets! ${referralData.referralUrl}`;
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(referralData.referralUrl)}&text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 p-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                <span>✈️</span>
                Compartir en Telegram
              </button>

              <button
                onClick={() => {
                  const text = `🎁 Acabo de descubrir @CryptoGiftWallets - la forma más fácil de regalar cripto con arte IA único. ¡Pruébalo gratis!`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralData.referralUrl)}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 p-4 bg-blue-400 text-white rounded-xl hover:bg-blue-500 transition-colors"
              >
                <span>🐦</span>
                Compartir en Twitter
              </button>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">¿Cómo Funciona?</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📤</span>
                </div>
                <h3 className="font-bold mb-2">1. Comparte tu Link</h3>
                <p className="text-sm text-gray-600">
                  Envía tu link de referido a amigos por WhatsApp, redes sociales o email
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎁</span>
                </div>
                <h3 className="font-bold mb-2">2. Ellos Crean Regalos</h3>
                <p className="text-sm text-gray-600">
                  Cuando tus amigos creen NFT-wallets, generas comisiones automáticamente
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="font-bold mb-2">3. Ganas Dinero</h3>
                <p className="text-sm text-gray-600">
                  Obtienes el 2% del monto de cada regalo que creen usando tu link
                </p>
              </div>
            </div>
          </div>

          {/* Earnings Calculator */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-6">Calculadora de Ganancias</h2>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">$20</div>
                <div className="text-purple-100 text-sm mb-2">Si invitas 10 amigos</div>
                <div className="text-xs text-purple-200">Promedio $100 por regalo</div>
              </div>

              <div>
                <div className="text-3xl font-bold mb-2">$100</div>
                <div className="text-purple-100 text-sm mb-2">Si invitas 50 amigos</div>
                <div className="text-xs text-purple-200">Promedio $100 por regalo</div>
              </div>

              <div>
                <div className="text-3xl font-bold mb-2">$500</div>
                <div className="text-purple-100 text-sm mb-2">Si invitas 250 amigos</div>
                <div className="text-xs text-purple-200">Promedio $100 por regalo</div>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-purple-100 text-sm">
                💡 Cada amigo que invites puede a su vez invitar a otros, ¡creando un efecto multiplicador!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}