"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { client } from '../app/client';
import { WalletSwitcher } from './WalletSwitcher';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const account = useActiveAccount();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-12 h-12">
              <Image
                src="/logo.png"
                alt="CryptoGift Wallets Logo"
                width={48}
                height={48}
                className="rounded-xl object-cover shadow-lg"
                priority
                onError={(e) => {
                  // Fallback to emoji if PNG fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
              <div 
                className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg"
                style={{ display: 'none' }}
              >
                <span className="text-white font-bold text-xl">🎁</span>
              </div>
            </div>
            <div>
              <div className="font-bold text-xl text-gray-800">CryptoGift</div>
              <div className="text-xs text-gray-500 -mt-1">Wallets</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
              Inicio
            </Link>
            <Link href="/referrals" className="text-gray-600 hover:text-blue-600 transition-colors">
              Referidos
            </Link>
            <Link href="/knowledge" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center">
              📚 Knowledge
            </Link>
            <Link href="/nexuswallet" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center">
              💼 NexusWallet
            </Link>
            
            {mounted && (
              account ? (
                <WalletSwitcher className="min-w-[200px]" />
              ) : (
                <ConnectButton
                  client={client}
                  appMetadata={{
                    name: "CryptoGift Wallets",
                    url: "https://cryptogift-wallets.vercel.app",
                  }}
                />
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-4">
              <Link 
                href="/" 
                className="block text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </Link>
              <Link 
                href="/referrals" 
                className="block text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Referidos
              </Link>
              <Link 
                href="/knowledge" 
                className="block text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                📚 Knowledge
              </Link>
              <Link 
                href="/nexuswallet" 
                className="block text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                💼 NexusWallet
              </Link>
              
              <div className="pt-4">
                {account ? (
                  <WalletSwitcher className="w-full" />
                ) : (
                  <ConnectButton
                    client={client}
                    appMetadata={{
                      name: "CryptoGift Wallets",
                      url: "https://cryptogift-wallets.vercel.app",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};