"use client";

import React, { useState, useEffect } from 'react';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { client } from '../app/client';
import { authenticateWithSiwe, getAuthState, isAuthValid } from '../lib/siweClient';

interface ConnectAndAuthButtonProps {
  onAuthChange?: (isAuthenticated: boolean, address?: string) => void;
  className?: string;
  showAuthStatus?: boolean;
}

export const ConnectAndAuthButton: React.FC<ConnectAndAuthButtonProps> = ({
  onAuthChange,
  className = "",
  showAuthStatus = false
}) => {
  const account = useActiveAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check auth status when component mounts or account changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const authState = getAuthState();
      const isValid = isAuthValid();
      
      console.log('🔍 Checking auth status:', {
        isAuthenticated: authState.isAuthenticated,
        isValid,
        address: authState.address,
        accountAddress: account?.address
      });
      
      const authenticated = authState.isAuthenticated && isValid && 
                          authState.address?.toLowerCase() === account?.address?.toLowerCase();
      
      setIsAuthenticated(authenticated);
      onAuthChange?.(authenticated, account?.address);
    };

    if (account?.address) {
      checkAuthStatus();
      // Check auth status every 30 seconds
      const interval = setInterval(checkAuthStatus, 30000);
      return () => clearInterval(interval);
    } else {
      setIsAuthenticated(false);
      onAuthChange?.(false);
    }
  }, [account?.address, onAuthChange]);

  const handleAuthenticate = async () => {
    if (!account?.address) {
      setAuthError('No wallet connected');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      console.log('🔐 Starting SIWE authentication for:', account.address.slice(0, 10) + '...');
      
      // Get wallet signer for signing messages
      const signer = account;
      if (!signer.signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      // Perform SIWE authentication
      const authState = await authenticateWithSiwe(account.address, signer);
      
      if (authState.isAuthenticated) {
        setIsAuthenticated(true);
        setAuthError(null);
        onAuthChange?.(true, account.address);
        console.log('✅ Authentication successful!');
      } else {
        throw new Error('Authentication failed');
      }

    } catch (error: any) {
      console.error('❌ SIWE authentication failed:', error);
      setAuthError(error.message || 'Authentication failed');
      setIsAuthenticated(false);
      onAuthChange?.(false, account.address);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // If no wallet connected, show connect button
  if (!account?.address) {
    return (
      <div className={className}>
        <ConnectButton
          client={client}
          appMetadata={{
            name: "CryptoGift Wallets",
            url: "https://cryptogift-wallets.vercel.app",
          }}
        />
      </div>
    );
  }

  // If wallet connected but not authenticated
  if (!isAuthenticated) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center space-y-3">
          {/* Show connected wallet */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </div>
          
          {/* Authentication button */}
          <button
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAuthenticating ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Autenticando...</span>
              </div>
            ) : (
              'Firmar Mensaje de Autenticación'
            )}
          </button>
          
          {/* Error message */}
          {authError && (
            <div className="text-red-500 text-sm text-center max-w-xs">
              {authError}
            </div>
          )}
          
          {/* Connect button for changing wallet */}
          <div className="text-xs">
            <ConnectButton
              client={client}
              appMetadata={{
                name: "CryptoGift Wallets",
                url: "https://cryptogift-wallets.vercel.app",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show status
  return (
    <div className={className}>
      <div className="flex flex-col items-center space-y-2">
        {showAuthStatus && (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Autenticado</span>
          </div>
        )}
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </div>
        
        {/* Connect button for changing wallet */}
        <div className="text-xs">
          <ConnectButton
            client={client}
            appMetadata={{
              name: "CryptoGift Wallets",
              url: "https://cryptogift-wallets.vercel.app",
            }}
          />
        </div>
        
        {/* Re-authenticate button if needed */}
        <button
          onClick={handleAuthenticate}
          className="text-xs text-purple-600 hover:text-purple-700 underline"
        >
          Re-autenticar
        </button>
      </div>
    </div>
  );
};