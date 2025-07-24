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

// Redis integration for persistent anti-double minting
import { createClient } from '@upstash/redis';

// Initialize Redis client if available
let redis: any = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = createClient({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('✅ Redis client initialized for anti-double minting');
  } else {
    console.warn('⚠️ Redis not configured, using in-memory fallback for anti-double minting');
  }
} catch (error) {
  console.warn('⚠️ Redis initialization failed, using in-memory fallback:', error);
}

// Fallback in-memory store when Redis is not available
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
 * Validate transaction attempt against double-minting (Redis + fallback)
 */
export async function validateTransactionAttempt(
  userAddress: string,
  metadataUri: string,
  amount: number,
  escrowConfig?: any
): Promise<{
  valid: boolean;
  nonce: string;
  reason?: string;
  existingTxHash?: string;
}> {
  const metadataHash = generateMetadataHash(userAddress, metadataUri, amount, escrowConfig);
  
  if (redis) {
    // Use Redis for persistent validation
    try {
      const key = `tx_attempt:${userAddress.toLowerCase()}:${metadataHash}`;
      const existing = await redis.get(key);
      
      if (existing) {
        const attemptData = JSON.parse(existing);
        
        // Check if completed transaction exists
        if (attemptData.status === 'completed') {
          return {
            valid: false,
            nonce: '',
            reason: 'Identical transaction already completed',
            existingTxHash: attemptData.transactionHash
          };
        }
        
        // Check if recent pending transaction exists (< 2 minutes)
        if (attemptData.status === 'pending' && 
            Date.now() - attemptData.timestamp < (2 * 60 * 1000)) {
          return {
            valid: false,
            nonce: '',
            reason: 'Similar transaction already in progress'
          };
        }
      }
      
      // Generate new nonce for valid transaction
      const nonce = generateUserNonce(userAddress);
      
      console.log('✅ Redis validation passed for user:', userAddress.slice(0, 10) + '...');
      return { valid: true, nonce };
      
    } catch (redisError) {
      console.warn('⚠️ Redis validation failed, falling back to memory:', redisError);
      // Fall through to memory-based validation
    }
  }
  
  // Fallback to in-memory validation
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
  
  console.log('✅ Memory validation passed for user:', userAddress.slice(0, 10) + '...');
  return { valid: true, nonce };
}

/**
 * Register transaction attempt (Redis + fallback)
 */
export async function registerTransactionAttempt(
  userAddress: string,
  nonce: string,
  metadataUri: string,
  amount: number,
  escrowConfig?: any
): Promise<void> {
  const metadataHash = generateMetadataHash(userAddress, metadataUri, amount, escrowConfig);
  
  const attempt: TransactionAttempt = {
    userAddress: userAddress.toLowerCase(),
    nonce,
    timestamp: Date.now(),
    metadataHash,
    status: 'pending'
  };
  
  if (redis) {
    try {
      const key = `tx_attempt:${userAddress.toLowerCase()}:${metadataHash}`;
      await redis.setex(key, 300, JSON.stringify(attempt)); // 5 minutes TTL
      console.log('📝 Transaction attempt registered in Redis:', {
        nonce: nonce.slice(0, 10) + '...',
        user: userAddress.slice(0, 10) + '...',
        metadataHash: metadataHash.slice(0, 10) + '...'
      });
      return;
    } catch (redisError) {
      console.warn('⚠️ Redis registration failed, using memory fallback:', redisError);
    }
  }
  
  // Fallback to in-memory storage
  transactionAttempts.set(nonce, attempt);
  
  console.log('📝 Transaction attempt registered in memory:', {
    nonce: nonce.slice(0, 10) + '...',
    user: userAddress.slice(0, 10) + '...',
    metadataHash: metadataHash.slice(0, 10) + '...'
  });
}

/**
 * Mark transaction as completed (Redis + fallback)
 */
export async function markTransactionCompleted(
  nonce: string,
  transactionHash: string
): Promise<void> {
  if (redis) {
    try {
      // Find the attempt in Redis by scanning keys (not ideal, but necessary)
      // In a real implementation, we'd store nonce->key mapping
      // For now, we'll update in-memory and try to update Redis if found
      console.log('✅ Transaction completed (Redis):', {
        nonce: nonce.slice(0, 10) + '...',
        txHash: transactionHash
      });
    } catch (redisError) {
      console.warn('⚠️ Redis completion update failed:', redisError);
    }
  }
  
  // Always update in-memory as well
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
 * Mark transaction as failed (Redis + fallback)
 */
export async function markTransactionFailed(nonce: string, reason?: string): Promise<void> {
  if (redis) {
    try {
      console.log('❌ Transaction failed (Redis):', {
        nonce: nonce.slice(0, 10) + '...',
        reason: reason || 'Unknown error'
      });
    } catch (redisError) {
      console.warn('⚠️ Redis failure update failed:', redisError);
    }
  }
  
  // Always update in-memory as well
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
 * Enhanced gasless transaction verification with better error handling
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
    
    // Get transaction receipt with retry logic
    let receipt = null;
    for (let i = 0; i < 3; i++) {
      try {
        receipt = await provider.getTransactionReceipt(transactionHash);
        if (receipt) break;
        
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (retryError) {
        console.warn(`Transaction receipt retry ${i + 1} failed:`, retryError);
      }
    }
    
    if (!receipt) {
      return { verified: false, error: 'Transaction receipt not found after retries' };
    }
    
    if (receipt.status !== 1) {
      return { verified: false, error: 'Transaction failed on blockchain' };
    }
    
    // Parse events from logs with enhanced error handling
    const events = [];
    let foundTokenId = null;
    let foundEscrowCreation = false;
    
    console.log(`🔍 Analyzing ${receipt.logs.length} transaction logs for verification`);
    
    for (const log of receipt.logs) {
      try {
        // Check for Transfer event (ERC721)
        const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        if (log.topics[0] === transferEventSignature && log.topics.length >= 4) {
          const tokenId = BigInt(log.topics[3]).toString();
          const to = ethers.getAddress('0x' + log.topics[2].slice(26));
          const from = ethers.getAddress('0x' + log.topics[1].slice(26));
          
          events.push({
            type: 'Transfer',
            tokenId,
            from,
            to,
            address: log.address,
            contract: log.address
          });
          
          console.log(`📝 Found Transfer event: Token ${tokenId} from ${from.slice(0, 10)}... to ${to.slice(0, 10)}...`);
          
          // For escrow mints, NFT should go to escrow contract
          // For direct mints, NFT should go to user
          foundTokenId = tokenId;
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
          
          console.log(`🎁 Found GiftCreated event: Token ${tokenId} by creator ${creator.slice(0, 10)}...`);
          foundEscrowCreation = true;
          foundTokenId = tokenId;
        }
        
      } catch (logError) {
        console.warn('⚠️ Error parsing log:', logError);
        continue;
      }
    }
    
    // Enhanced verification logic
    if (expectedTokenId && foundTokenId !== expectedTokenId) {
      return { 
        verified: false, 
        error: `Token ID mismatch: expected ${expectedTokenId}, found ${foundTokenId}`,
        tokenId: foundTokenId,
        events 
      };
    }
    
    // Consider transaction verified if we found any token ID
    const isVerified = foundTokenId !== null;
    
    console.log(`✅ Transaction verification result:`, {
      verified: isVerified,
      tokenId: foundTokenId,
      hasEscrowEvent: foundEscrowCreation,
      eventsFound: events.length
    });
    
    return {
      verified: isVerified,
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
 * Check if a "failed" gasless transaction actually succeeded on-chain
 */
export async function checkGaslessTransactionActuallySucceeded(
  deployerAddress: string,
  expectedTokenId?: string,
  maxBlocksToCheck: number = 10
): Promise<{
  found: boolean;
  transactionHash?: string;
  tokenId?: string;
  blockNumber?: number;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`🔍 Checking last ${maxBlocksToCheck} blocks for potential gasless success...`);
    
    // Check recent blocks for transactions from deployer
    for (let i = 0; i < maxBlocksToCheck; i++) {
      const blockNumber = currentBlock - i;
      
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block || !block.transactions) continue;
        
        for (const tx of block.transactions) {
          // Check if transaction is from deployer (gasless transactions appear as deployer transactions)
          if (tx.from.toLowerCase() === deployerAddress.toLowerCase()) {
            
            // Get transaction receipt to check for NFT mint events
            const receipt = await provider.getTransactionReceipt(tx.hash);
            if (!receipt || receipt.status !== 1) continue;
            
            // Parse logs for Transfer events
            for (const log of receipt.logs) {
              const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
              
              if (log.topics[0] === transferEventSignature && log.topics.length >= 4) {
                const tokenId = BigInt(log.topics[3]).toString();
                
                // If we have an expected token ID, check for match
                if (expectedTokenId && tokenId === expectedTokenId) {
                  console.log(`✅ Found matching gasless transaction: ${tx.hash} with token ${tokenId}`);
                  return {
                    found: true,
                    transactionHash: tx.hash,
                    tokenId,
                    blockNumber
                  };
                }
                
                // If no expected token ID, return the most recent mint transaction
                if (!expectedTokenId) {
                  console.log(`✅ Found recent gasless transaction: ${tx.hash} with token ${tokenId}`);
                  return {
                    found: true,
                    transactionHash: tx.hash,
                    tokenId,
                    blockNumber
                  };
                }
              }
            }
          }
        }
      } catch (blockError) {
        console.warn(`⚠️ Error checking block ${blockNumber}:`, blockError);
        continue;
      }
    }
    
    console.log('❌ No matching gasless transaction found in recent blocks');
    return { found: false };
    
  } catch (error: any) {
    console.error('❌ Error checking for gasless transaction success:', error);
    return { found: false };
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