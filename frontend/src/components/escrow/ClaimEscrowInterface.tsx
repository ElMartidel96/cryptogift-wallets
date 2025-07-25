"use client";

import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { 
  validatePassword,
  getGiftStatus,
  formatTimeRemaining,
  isGiftExpired,
  parseEscrowError
} from '../../lib/escrowUtils';
import { type EscrowGift } from '../../lib/escrowABI';
import { useAuth } from '../../hooks/useAuth';
import { makeAuthenticatedRequest } from '../../lib/siweClient';
import { ConnectAndAuthButton } from '../ConnectAndAuthButton';

interface ClaimEscrowInterfaceProps {
  tokenId: string;
  giftInfo?: {
    creator: string;
    nftContract: string;
    expirationTime: number;
    status: 'active' | 'expired' | 'claimed' | 'returned';
    timeRemaining?: string;
    canClaim: boolean;
    isExpired: boolean;
  };
  nftMetadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
  onClaimSuccess?: (transactionHash: string, giftInfo?: any) => void;
  onClaimError?: (error: string) => void;
  className?: string;
}

interface ClaimFormData {
  password: string;
  salt: string;
  recipientAddress?: string;
  gasless: boolean;
}

export const ClaimEscrowInterface: React.FC<ClaimEscrowInterfaceProps> = ({
  tokenId,
  giftInfo,
  nftMetadata,
  onClaimSuccess,
  onClaimError,
  className = ''
}) => {
  const account = useActiveAccount();
  const auth = useAuth();
  const [formData, setFormData] = useState<ClaimFormData>({
    password: '',
    salt: '',
    recipientAddress: '',
    gasless: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [claimStep, setClaimStep] = useState<'password' | 'claiming' | 'success'>('password');

  // Fetch correct salt for this token when component mounts
  useEffect(() => {
    const fetchSalt = async () => {
      try {
        console.log('🧂 Fetching salt for token:', tokenId);
        const response = await fetch(`/api/escrow-salt/${tokenId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.salt) {
            setFormData(prev => ({
              ...prev,
              salt: data.salt
            }));
            console.log('✅ Salt retrieved successfully for token:', tokenId);
          } else {
            console.warn('⚠️ Salt not found for token:', tokenId);
            setError('Gift salt not available. This gift may not be claimable.');
          }
        } else {
          console.error('❌ Failed to fetch salt:', response.status, response.statusText);
          setError('Unable to load gift information. Please try again.');
        }
      } catch (error) {
        console.error('❌ Error fetching salt:', error);
        setError('Network error. Please check your connection.');
      }
    };
    
    if (tokenId) {
      fetchSalt();
    }
  }, [tokenId]);

  // Reset error when form changes
  useEffect(() => {
    setError('');
  }, [formData.password, formData.recipientAddress]);

  const validateForm = () => {
    if (!formData.password) {
      return 'Password is required';
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      return passwordValidation.message;
    }

    if (formData.recipientAddress && !formData.recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return 'Invalid recipient address';
    }

    return null;
  };

  const handleClaimGift = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    // Check SIWE authentication
    if (!auth.isAuthenticated) {
      setError('Please authenticate with your wallet first to claim the gift');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setClaimStep('claiming');
    setError('');

    try {
      console.log('🎁 CLAIM ESCROW: Starting claim process for token', tokenId);

      // Use authenticated request with JWT token
      const response = await makeAuthenticatedRequest('/api/claim-escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokenId,
          password: formData.password,
          salt: formData.salt,
          recipientAddress: formData.recipientAddress || undefined,
          claimerAddress: account.address,
          gasless: formData.gasless
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to claim gift');
      }

      console.log('✅ CLAIM SUCCESS:', result);
      
      setClaimStep('success');
      
      if (onClaimSuccess) {
        onClaimSuccess(result.transactionHash, {
          tokenId,
          recipientAddress: result.recipientAddress,
          giftInfo: result.giftInfo,
          gasless: result.gasless
        });
      }

    } catch (err: any) {
      console.error('❌ CLAIM ERROR:', err);
      const errorMessage = parseEscrowError(err);
      setError(errorMessage);
      setClaimStep('password');
      
      if (onClaimError) {
        onClaimError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-orange-600 bg-orange-100';
      case 'claimed': return 'text-blue-600 bg-blue-100';
      case 'returned': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'expired': return '⏰';
      case 'claimed': return '✅';
      case 'returned': return '↩️';
      default: return '❓';
    }
  };

  const canClaim = giftInfo?.status === 'active' && !giftInfo?.isExpired && giftInfo?.canClaim;

  if (claimStep === 'success') {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Gift Claimed Successfully!</h2>
          <p className="text-green-600 mb-4">
            The escrow gift has been transferred to your wallet.
          </p>
          <div className="text-sm text-green-700 space-y-1">
            <p>Token ID: {tokenId}</p>
            <p>Recipient: {formData.recipientAddress || account?.address}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            🎁 Claim Your Escrow Gift
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Token ID: {tokenId}
          </p>
        </div>

        {/* Gift Status */}
        {giftInfo && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Gift Status</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(giftInfo.status)}`}>
                {getStatusIcon(giftInfo.status)} {giftInfo.status.toUpperCase()}
              </span>
            </div>
            
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>Creator: {giftInfo.creator.slice(0, 10)}...{giftInfo.creator.slice(-8)}</p>
              {giftInfo.timeRemaining && !giftInfo.isExpired && (
                <p>Time remaining: {giftInfo.timeRemaining}</p>
              )}
              {giftInfo.isExpired && (
                <p className="text-orange-600">⚠️ This gift has expired</p>
              )}
            </div>
          </div>
        )}

        {/* NFT Preview */}
        {nftMetadata && (
          <div className="mb-6 text-center">
            {nftMetadata.image && (
              <img 
                src={nftMetadata.image} 
                alt={nftMetadata.name || 'Gift NFT'}
                className="w-32 h-32 object-cover rounded-lg mx-auto mb-2"
              />
            )}
            {nftMetadata.name && (
              <h3 className="font-medium text-gray-900 dark:text-white">{nftMetadata.name}</h3>
            )}
            {nftMetadata.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{nftMetadata.description}</p>
            )}
          </div>
        )}

        {/* Authentication Section */}
        {!auth.isAuthenticated ? (
          <div className="mb-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="text-yellow-600 dark:text-yellow-400 text-xl mr-3">🔐</div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                    Authentication Required
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    You need to authenticate with your wallet to claim this gift securely.
                  </p>
                </div>
              </div>
            </div>
            
            <ConnectAndAuthButton 
              showAuthStatus={true}
              className="w-full"
              onAuthChange={(isAuthenticated) => {
                if (isAuthenticated) {
                  console.log('✅ User authenticated, can now claim gift');
                }
              }}
            />
          </div>
        ) : (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center text-green-800 dark:text-green-400">
              <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
              <span className="text-sm font-medium">Wallet authenticated - Ready to claim</span>
            </div>
          </div>
        )}

        {/* Claim Form */}
        {canClaim && auth.isAuthenticated ? (
          <div className="space-y-4">
            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gift Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter the gift password"
                disabled={isLoading}
              />
            </div>

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                disabled={isLoading}
              >
                <svg
                  className={`w-4 h-4 mr-2 transform transition-transform ${
                    showAdvanced ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Claim to Different Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.recipientAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, recipientAddress: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="0x... (leave empty to claim to your wallet)"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      If specified, the gift will be sent to this address instead
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Gasless Transaction
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Use gasless claiming (no gas fees)
                      </p>
                    </div>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, gasless: !prev.gasless }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.gasless 
                          ? 'bg-blue-600' 
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                      disabled={isLoading}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.gasless ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Claim Button */}
            <button
              onClick={handleClaimGift}
              disabled={isLoading || !formData.password || !account || !auth.isAuthenticated}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {claimStep === 'claiming' ? 'Claiming Gift...' : 'Processing...'}
                </div>
              ) : (
                '🎁 Claim Gift'
              )}
            </button>

            {!account && (
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Connect your wallet to claim this gift
              </p>
            )}
          </div>
        ) : (
          /* Cannot Claim */
          <div className="text-center py-6">
            <div className="text-4xl mb-4">
              {giftInfo?.status === 'claimed' ? '✅' : 
               giftInfo?.status === 'returned' ? '↩️' : 
               giftInfo?.isExpired ? '⏰' : '❌'}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {giftInfo?.status === 'claimed' ? 'Gift Already Claimed' :
               giftInfo?.status === 'returned' ? 'Gift Returned to Creator' :
               giftInfo?.isExpired ? 'Gift Has Expired' :
               'Gift Cannot Be Claimed'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {giftInfo?.status === 'claimed' ? 'This gift has already been claimed by someone else.' :
               giftInfo?.status === 'returned' ? 'This gift has been returned to its creator.' :
               giftInfo?.isExpired ? 'This gift has expired and can no longer be claimed.' :
               'This gift is not available for claiming at this time.'}
            </p>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Secure Claiming Process:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>Your password is processed securely and never stored</li>
                <li>Transactions are processed {formData.gasless ? 'gaslessly' : 'with gas'}</li>
                <li>The NFT will be transferred to your specified address</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};