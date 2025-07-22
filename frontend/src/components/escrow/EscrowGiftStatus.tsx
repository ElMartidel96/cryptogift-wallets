"use client";

import React, { useState, useEffect } from 'react';
import { 
  formatTimeRemaining,
  isGiftExpired,
  getGiftStatus,
  getGiftStatusColor,
  getGiftStatusBadgeColor,
  generateGiftLink,
  generateGiftShareMessage
} from '../../lib/escrowUtils';

interface EscrowGiftStatusProps {
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
  giftMessage?: string;
  isCreator?: boolean;
  onRefresh?: () => void;
  onReturnExpired?: () => void;
  className?: string;
}

export const EscrowGiftStatus: React.FC<EscrowGiftStatusProps> = ({
  tokenId,
  giftInfo,
  nftMetadata,
  giftMessage,
  isCreator = false,
  onRefresh,
  onReturnExpired,
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update countdown timer
  useEffect(() => {
    if (!giftInfo) return;

    const updateTimer = () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingSeconds = giftInfo.expirationTime - currentTime;
      
      if (remainingSeconds <= 0) {
        setTimeRemaining('Expired');
        setIsExpired(true);
      } else {
        setTimeRemaining(formatTimeRemaining(remainingSeconds));
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [giftInfo?.expirationTime]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'expired': return '⏰';
      case 'claimed': return '✅';
      case 'returned': return '↩️';
      default: return '❓';
    }
  };

  const getProgressPercentage = () => {
    if (!giftInfo) return 0;
    
    const now = Math.floor(Date.now() / 1000);
    const totalTime = giftInfo.expirationTime;
    const elapsed = now;
    const remaining = Math.max(0, totalTime - now);
    
    if (giftInfo.status === 'claimed') return 100;
    if (giftInfo.status === 'returned') return 100;
    if (remaining === 0) return 100;
    
    // Calculate progress based on remaining time (reverse - less time = more progress)
    const progress = Math.min(100, Math.max(0, 100 - (remaining / (7 * 24 * 60 * 60)) * 100));
    return progress;
  };

  const handleShare = async () => {
    const giftLink = generateGiftLink(tokenId);
    const shareMessage = generateGiftShareMessage(tokenId, giftMessage);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CryptoGift - You have a gift!',
          text: shareMessage,
          url: giftLink
        });
      } catch (error) {
        console.log('Share failed:', error);
        copyToClipboard(giftLink);
      }
    } else {
      copyToClipboard(giftLink);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleReturnGift = () => {
    if (onReturnExpired && isExpired && giftInfo?.status === 'active') {
      onReturnExpired();
    }
  };

  if (!giftInfo) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header with NFT Image */}
      <div className="relative">
        {nftMetadata?.image ? (
          <img 
            src={nftMetadata.image} 
            alt={nftMetadata.name || 'Gift NFT'}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
            <div className="text-6xl">🎁</div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getGiftStatusBadgeColor(giftInfo.status)}`}>
            {getStatusIcon(giftInfo.status)} {giftInfo.status.toUpperCase()}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="absolute top-3 left-3 flex gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors"
              title="Refresh status"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Title and Token ID */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {nftMetadata?.name || `Gift NFT #${tokenId}`}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Token ID: {tokenId}
          </p>
          {isCreator && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              👤 You created this gift
            </p>
          )}
        </div>

        {/* Gift Message */}
        {giftMessage && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              &ldquo;{giftMessage}&rdquo;
            </p>
          </div>
        )}

        {/* Time Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {giftInfo.status === 'active' ? 'Time Remaining' : 'Status'}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {giftInfo.status === 'active' ? timeRemaining : giftInfo.status.toUpperCase()}
            </span>
          </div>
          
          {giftInfo.status === 'active' && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isExpired ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          )}
        </div>

        {/* Gift Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Creator:</span>
            <span className="text-gray-900 dark:text-white font-mono text-xs">
              {giftInfo.creator.slice(0, 8)}...{giftInfo.creator.slice(-6)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Contract:</span>
            <span className="text-gray-900 dark:text-white font-mono text-xs">
              {giftInfo.nftContract.slice(0, 8)}...{giftInfo.nftContract.slice(-6)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Expires:</span>
            <span className="text-gray-900 dark:text-white">
              {new Date(giftInfo.expirationTime * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Share Button (only for active gifts) */}
          {giftInfo.status === 'active' && !isExpired && (
            <button
              onClick={handleShare}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {copied ? '✅ Copied!' : '📤 Share Gift'}
            </button>
          )}

          {/* Return Button (only for creators with expired gifts) */}
          {isCreator && isExpired && giftInfo.status === 'active' && onReturnExpired && (
            <button
              onClick={handleReturnGift}
              className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              ↩️ Return to Wallet
            </button>
          )}

          {/* Claim Button (for non-creators with active gifts) */}
          {!isCreator && giftInfo.status === 'active' && !isExpired && (
            <button
              onClick={() => window.location.href = `/gift/claim/${tokenId}`}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              🎁 Claim Gift
            </button>
          )}

          {/* View Details Button */}
          <button
            onClick={() => window.open(`/gift/claim/${tokenId}`, '_blank')}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            👁️ View
          </button>
        </div>

        {/* Status-specific Messages */}
        {giftInfo.status === 'claimed' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-green-800 dark:text-green-300 text-sm font-medium">
              ✅ This gift has been successfully claimed!
            </p>
          </div>
        )}

        {giftInfo.status === 'returned' && (
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              ↩️ This gift has been returned to the creator&apos;s wallet.
            </p>
          </div>
        )}

        {isExpired && giftInfo.status === 'active' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <p className="text-orange-800 dark:text-orange-300 text-sm font-medium">
              ⏰ This gift has expired and can no longer be claimed.
            </p>
            {isCreator && (
              <p className="text-orange-700 dark:text-orange-400 text-sm mt-1">
                You can return it to your wallet using the button above.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};