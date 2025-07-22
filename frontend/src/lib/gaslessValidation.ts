/**
 * ENHANCED GASLESS VALIDATION
 * Anti-double minting mechanisms for temporal escrow system
 * Prevents transaction replay attacks and ensures single-use operations
 */

import { ethers } from 'ethers';
import { createThirdwebClient } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Transaction tracking for anti-double minting
interface TransactionAttempt {
  userAddress: string;
  nonce: string;
  timestamp: number;
  metadataHash: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
}

// In-memory store (in production, use Redis/database)
const transactionAttempts = new Map<string, TransactionAttempt>();
const completedTransactions = new Set<string>();
const userNonces = new Map<string, number>();

/**
 * Generate unique transaction nonce for user
 */
export function generateUserNonce(userAddress: string): `0x${string}` {
  const currentNonce = userNonces.get(userAddress.toLowerCase()) || 0;
  const nextNonce = currentNonce + 1;
  userNonces.set(userAddress.toLowerCase(), nextNonce);
  
  // Include timestamp for additional uniqueness
  const timestamp = Date.now();
  const nonceString = `${userAddress.toLowerCase()}_${nextNonce}_${timestamp}`;
  
  return ethers.keccak256(ethers.toUtf8Bytes(nonceString)) as `0x${string}`;
}

/**
 * Generate metadata hash for transaction deduplication
 */
export function generateMetadataHash(
  userAddress: string,
  metadataUri: string,
  amount: number,
  escrowConfig?: any
): `0x${string}` {
  const hashData = JSON.stringify({
    user: userAddress.toLowerCase(),
    metadata: metadataUri,
    amount,
    escrow: escrowConfig ? {
      password: escrowConfig.password ? '***REDACTED***' : null,
      timeframe: escrowConfig.timeframe,
      message: escrowConfig.giftMessage
    } : null,
    timestamp: Math.floor(Date.now() / 60000) // 1-minute window
  });
  
  return ethers.keccak256(ethers.toUtf8Bytes(hashData)) as `0x${string}`;
}

/**
 * Validate transaction attempt against double-minting
 */
export function validateTransactionAttempt(
  userAddress: string,
  metadataUri: string,
  amount: number,
  escrowConfig?: any
): {
  valid: boolean;
  nonce: string;
  reason?: string;
  existingTxHash?: string;
} {
  const metadataHash = generateMetadataHash(userAddress, metadataUri, amount, escrowConfig);
  
  // Check for recent identical transactions (last 5 minutes)
  const recentCutoff = Date.now() - (5 * 60 * 1000);
  const existingAttempts = Array.from(transactionAttempts.values()).filter(attempt => 
    attempt.userAddress.toLowerCase() === userAddress.toLowerCase() &&
    attempt.metadataHash === metadataHash &&
    attempt.timestamp > recentCutoff
  );
  
  // If there's a completed transaction with same metadata
  const completedAttempt = existingAttempts.find(attempt => attempt.status === 'completed');
  if (completedAttempt) {
    return {
      valid: false,
      nonce: '',
      reason: 'Identical transaction already completed',
      existingTxHash: completedAttempt.transactionHash
    };
  }
  
  // If there's a pending transaction with same metadata
  const pendingAttempt = existingAttempts.find(attempt => 
    attempt.status === 'pending' && 
    Date.now() - attempt.timestamp < (2 * 60 * 1000) // 2-minute timeout
  );
  if (pendingAttempt) {
    return {
      valid: false,
      nonce: '',
      reason: 'Similar transaction already in progress'
    };
  }
  
  // Generate new nonce for valid transaction
  const nonce = generateUserNonce(userAddress);
  
  return {
    valid: true,
    nonce
  };
}

/**
 * Register transaction attempt
 */
export function registerTransactionAttempt(
  userAddress: string,
  nonce: string,
  metadataUri: string,
  amount: number,
  escrowConfig?: any
): void {
  const metadataHash = generateMetadataHash(userAddress, metadataUri, amount, escrowConfig);
  
  const attempt: TransactionAttempt = {
    userAddress: userAddress.toLowerCase(),
    nonce,
    timestamp: Date.now(),
    metadataHash,
    status: 'pending'
  };
  
  transactionAttempts.set(nonce, attempt);
  
  console.log('📝 Transaction attempt registered:', {
    nonce: nonce.slice(0, 10) + '...',
    user: userAddress.slice(0, 10) + '...',
    metadataHash: metadataHash.slice(0, 10) + '...'
  });
}

/**
 * Mark transaction as completed
 */
export function markTransactionCompleted(
  nonce: string,
  transactionHash: string
): void {
  const attempt = transactionAttempts.get(nonce);
  if (attempt) {
    attempt.status = 'completed';
    attempt.transactionHash = transactionHash;
    completedTransactions.add(attempt.metadataHash);
    
    console.log('✅ Transaction completed:', {
      nonce: nonce.slice(0, 10) + '...',
      txHash: transactionHash,
      metadataHash: attempt.metadataHash.slice(0, 10) + '...'
    });
  }
}

/**
 * Mark transaction as failed
 */
export function markTransactionFailed(nonce: string, reason?: string): void {
  const attempt = transactionAttempts.get(nonce);
  if (attempt) {
    attempt.status = 'failed';
    
    console.log('❌ Transaction failed:', {
      nonce: nonce.slice(0, 10) + '...',
      reason: reason || 'Unknown error',
      metadataHash: attempt.metadataHash.slice(0, 10) + '...'
    });
  }
}

/**
 * Clean up old transaction attempts (run periodically)
 */
export function cleanupOldTransactions(): void {
  const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour ago
  
  for (const [nonce, attempt] of transactionAttempts.entries()) {
    if (attempt.timestamp < cutoff) {
      transactionAttempts.delete(nonce);
    }
  }
  
  console.log('🧹 Cleaned up old transaction attempts');
}

/**
 * Enhanced gasless transaction with receipt verification
 */
export async function verifyGaslessTransaction(
  transactionHash: string,
  expectedUserAddress: string,
  expectedTokenId?: string
): Promise<{
  verified: boolean;
  tokenId?: string;
  events?: any[];
  error?: string;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(transactionHash);
    
    if (!receipt) {
      return { verified: false, error: 'Transaction receipt not found' };
    }
    
    if (receipt.status !== 1) {
      return { verified: false, error: 'Transaction failed' };
    }
    
    // Parse events from logs
    const events = [];
    let foundTokenId = null;
    
    for (const log of receipt.logs) {
      try {
        // Check for Transfer event (ERC721)
        const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        if (log.topics[0] === transferEventSignature) {
          const tokenId = BigInt(log.topics[3]).toString();
          const to = ethers.getAddress('0x' + log.topics[2].slice(26));
          
          events.push({
            type: 'Transfer',
            tokenId,
            to,
            address: log.address
          });
          
          // Verify the transfer recipient matches expected user
          if (to.toLowerCase() === expectedUserAddress.toLowerCase()) {
            foundTokenId = tokenId;
          }
        }
        
        // Check for GiftCreated event (if escrow)
        const giftCreatedSignature = ethers.id("GiftCreated(uint256,address,address,uint256,string)");
        if (log.topics[0] === giftCreatedSignature) {
          const tokenId = BigInt(log.topics[1]).toString();
          const creator = ethers.getAddress('0x' + log.topics[2].slice(26));
          
          events.push({
            type: 'GiftCreated',
            tokenId,
            creator,
            address: log.address
          });
          
          if (creator.toLowerCase() === expectedUserAddress.toLowerCase()) {
            foundTokenId = tokenId;
          }
        }
        
      } catch (error) {
        // Skip unparseable logs
        continue;
      }
    }
    
    // Verify token ID if expected
    if (expectedTokenId && foundTokenId !== expectedTokenId) {
      return { 
        verified: false, 
        error: 'Token ID mismatch',
        events 
      };
    }
    
    return {
      verified: true,
      tokenId: foundTokenId,
      events
    };
    
  } catch (error: any) {
    console.error('❌ Transaction verification failed:', error);
    return { 
      verified: false, 
      error: error.message || 'Verification failed' 
    };
  }
}

/**
 * Enhanced biconomy transaction status checking
 */
export async function checkBiconomyTransactionStatus(
  userOpHash: string,
  maxRetries: number = 30,
  retryInterval: number = 2000
): Promise<{
  success: boolean;
  transactionHash?: string;
  receipt?: any;
  error?: string;
}> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // This would integrate with Biconomy's status API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL}/status/${userOpHash}`);
      
      if (response.ok) {
        const status = await response.json();
        
        if (status.transactionHash) {
          // Verify the transaction on-chain
          const verification = await verifyGaslessTransaction(
            status.transactionHash,
            status.userAddress,
            status.tokenId
          );
          
          return {
            success: verification.verified,
            transactionHash: status.transactionHash,
            receipt: status,
            error: verification.error
          };
        }
        
        if (status.status === 'failed') {
          return {
            success: false,
            error: status.reason || 'User operation failed'
          };
        }
      }
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
      
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxRetries - 1) {
        return {
          success: false,
          error: error.message || 'Status check failed'
        };
      }
    }
  }
  
  return {
    success: false,
    error: 'Transaction status check timed out'
  };
}

/**
 * Rate limiting for gasless transactions per user
 */
const userRateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userAddress: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5; // 5 transactions per minute
  
  const userKey = userAddress.toLowerCase();
  const current = userRateLimits.get(userKey);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    userRateLimits.set(userKey, {
      count: 1,
      resetTime: now + windowMs
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }
  
  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  current.count += 1;
  
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime
  };
}

// Cleanup interval (run every 10 minutes)
if (typeof window !== 'undefined') {
  setInterval(cleanupOldTransactions, 10 * 60 * 1000);
}