import React, { useState } from 'react';
import Link from 'next/link';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { client } from '../app/client';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const account = useActiveAccount();

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">🎁</span>
            </div>
            <div>
              <div className="font-bold text-xl text-gray-800">CryptoGift</div>
              <div className="text-xs text-gray-500">Wallets</div>
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
            <Link href="/explore" className="text-gray-600 hover:text-blue-600 transition-colors">
              Explorar
            </Link>
            <a 
              href="https://docs.cryptogift.gl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Docs
            </a>
            
            <ConnectButton
              client={client}
              appMetadata={{
                name: "CryptoGift Wallets",
                url: "https://cryptogift.gl",
              }}
            />
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
                href="/explore" 
                className="block text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Explorar
              </Link>
              <a 
                href="https://docs.cryptogift.gl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-gray-600 hover:text-blue-600 transition-colors"
              >
                Docs
              </a>
              
              <div className="pt-4">
                <ConnectButton
                  client={client}
                  appMetadata={{
                    name: "CryptoGift Wallets",
                    url: "https://cryptogift.gl",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};