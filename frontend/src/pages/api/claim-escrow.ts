/**
 * CLAIM ESCROW API
 * Claim escrow gift with password validation
 * Supports both claimGift and claimGiftFor functions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { sendTransaction, waitForReceipt } from 'thirdweb/transaction';
import { readContract } from 'thirdweb';
import { 
  generatePasswordHash,
  getEscrowContract,
  prepareClaimGiftCall,
  prepareClaimGiftForCall,
  validatePassword,
  validateAddress,
  validateTokenId,
  parseEscrowError,
  isGiftExpired
} from '../../lib/escrowUtils';
import {
  validateTransactionAttempt,
  registerTransactionAttempt,
  markTransactionCompleted,
  markTransactionFailed,
  verifyGaslessTransaction,
  checkRateLimit
} from '../../lib/gaslessValidation';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from '../../lib/escrowABI';

// Types
interface ClaimEscrowRequest {
  tokenId: string;
  password: string;
  salt: string;
  recipientAddress?: string; // If provided, uses claimGiftFor
  claimerAddress: string; // Who is initiating the claim
  gasless?: boolean;
}

interface ClaimEscrowResponse {
  success: boolean;
  transactionHash?: string;
  recipientAddress?: string;
  giftInfo?: {
    creator: string;
    giftMessage?: string;
    expirationTime: number;
  };
  nonce?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
  error?: string;
  gasless?: boolean;
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Authentication middleware
function authenticate(req: NextApiRequest): boolean {
  const apiToken = req.headers.authorization?.replace('Bearer ', '');
  return apiToken === process.env.API_ACCESS_TOKEN;
}

// Get gift information from contract
async function getGiftInfo(tokenId: string): Promise<EscrowGift | null> {
  try {
    const escrowContract = getEscrowContract();
    
    const giftData = await readContract({
      contract: escrowContract,
      method: "getGift",
      params: [BigInt(tokenId)]
    });
    
    return {
      creator: giftData[0],
      expirationTime: giftData[1],
      nftContract: giftData[2],
      tokenId: giftData[3],
      passwordHash: giftData[4],
      status: giftData[5]
    };
  } catch (error) {
    console.error('Failed to get gift info:', error);
    return null;
  }
}

// Validate claim request against contract state
async function validateClaimRequest(
  tokenId: string,
  password: string,
  salt: string
): Promise<{ valid: boolean; error?: string; gift?: EscrowGift }> {
  try {
    // Get gift information
    const gift = await getGiftInfo(tokenId);
    
    if (!gift) {
      return { valid: false, error: 'Gift not found or invalid token ID' };
    }
    
    // Check if gift is already claimed
    if (gift.status === 1) {
      return { valid: false, error: 'Gift has already been claimed' };
    }
    
    // Check if gift was returned
    if (gift.status === 2) {
      return { valid: false, error: 'Gift has been returned to creator' };
    }
    
    // Check if gift is expired
    if (isGiftExpired(gift.expirationTime)) {
      return { valid: false, error: 'Gift has expired and cannot be claimed' };
    }
    
    // Validate password
    const providedPasswordHash = generatePasswordHash(password, salt);
    if (providedPasswordHash.toLowerCase() !== gift.passwordHash.toLowerCase()) {
      return { valid: false, error: 'Invalid password' };
    }
    
    return { valid: true, gift };
    
  } catch (error: any) {
    console.error('Claim validation error:', error);
    return { 
      valid: false, 
      error: parseEscrowError(error)
    };
  }
}

// Execute gasless claim with anti-double claiming
async function claimEscrowGasless(
  tokenId: string,
  password: string,
  salt: string,
  claimerAddress: string,
  recipientAddress?: string
): Promise<{
  success: boolean;
  transactionHash?: string;
  nonce?: string;
  error?: string;
}> {
  let transactionNonce = '';
  
  try {
    console.log('🚀 CLAIM ESCROW GASLESS: Starting enhanced claim process');
    
    // Step 1: Rate limiting check
    const rateLimit = checkRateLimit(claimerAddress);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    console.log('✅ Claim rate limit check passed. Remaining:', rateLimit.remaining);
    
    // Step 2: Anti-double claiming validation
    const claimConfig = { tokenId, password, recipient: recipientAddress };
    const validation = validateTransactionAttempt(claimerAddress, `claim_${tokenId}`, 0, claimConfig);
    
    if (!validation.valid) {
      throw new Error(validation.reason || 'Claim validation failed');
    }
    
    transactionNonce = validation.nonce;
    console.log('✅ Anti-double claiming validation passed. Nonce:', transactionNonce.slice(0, 10) + '...');
    
    // Step 3: Register claim attempt
    registerTransactionAttempt(claimerAddress, transactionNonce, `claim_${tokenId}`, 0, claimConfig);
    
    // Step 4: Get deployer account (for now, we use deployer for gasless claims)
    // In production, this would use Biconomy smart accounts
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    // Step 5: Prepare claim transaction
    const claimTransaction = recipientAddress 
      ? prepareClaimGiftForCall(tokenId, password, salt, recipientAddress)
      : prepareClaimGiftCall(tokenId, password, salt);
    
    console.log('📝 Executing claim transaction...');
    const result = await sendTransaction({
      transaction: claimTransaction,
      account: deployerAccount
    });
    
    const receipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: result.transactionHash
    });
    console.log('✅ Claim successful, transaction hash:', result.transactionHash);
    
    // Step 6: Verify transaction on-chain
    const verification = await verifyGaslessTransaction(
      result.transactionHash,
      claimerAddress,
      tokenId
    );
    
    if (!verification.verified) {
      throw new Error(`Transaction verification failed: ${verification.error}`);
    }
    
    // Step 7: Mark transaction as completed
    markTransactionCompleted(transactionNonce, result.transactionHash);
    
    console.log('🎉 Enhanced gasless claim completed with verification');
    
    return {
      success: true,
      transactionHash: result.transactionHash,
      nonce: transactionNonce
    };
    
  } catch (error: any) {
    console.error('❌ Enhanced gasless claim failed:', error);
    
    // Mark transaction as failed if nonce was generated
    if (transactionNonce) {
      markTransactionFailed(transactionNonce, error.message);
    }
    
    return {
      success: false,
      error: parseEscrowError(error),
      nonce: transactionNonce
    };
  }
}

// Execute gas-paid claim
async function claimEscrowGasPaid(
  tokenId: string,
  password: string,
  salt: string,
  claimerAddress: string,
  recipientAddress?: string
): Promise<{
  success: boolean;
  transactionHash?: string;
  nonce?: string;
  error?: string;
}> {
  try {
    console.log('💰 CLAIM ESCROW GAS-PAID: Starting claim process');
    
    // For gas-paid claims, the user would typically pay with their own wallet
    // For now, we'll use the same implementation as gasless but note the difference
    const result = await claimEscrowGasless(tokenId, password, salt, claimerAddress, recipientAddress);
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Gas-paid claim failed:', error);
    return {
      success: false,
      error: parseEscrowError(error)
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClaimEscrowResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Authenticate request
    if (!authenticate(req)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    // Validate required environment variables
    if (!process.env.PRIVATE_KEY_DEPLOY || !ESCROW_CONTRACT_ADDRESS) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }
    
    // Parse and validate request body
    const {
      tokenId,
      password,
      salt,
      recipientAddress,
      claimerAddress,
      gasless = true
    }: ClaimEscrowRequest = req.body;
    
    // Basic validation
    if (!tokenId || !password || !salt || !claimerAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const tokenIdValidation = validateTokenId(tokenId);
    if (!tokenIdValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: tokenIdValidation.message 
      });
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: passwordValidation.message 
      });
    }
    
    if (recipientAddress) {
      const addressValidation = validateAddress(recipientAddress);
      if (!addressValidation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid recipient address' 
        });
      }
    }
    
    console.log('🎁 CLAIM ESCROW REQUEST:', {
      tokenId,
      gasless,
      hasRecipient: !!recipientAddress,
      claimerAddress: claimerAddress.slice(0, 10) + '...'
    });
    
    // Validate claim request against contract
    const validation = await validateClaimRequest(tokenId, password, salt);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    const gift = validation.gift!;
    
    // Attempt claim based on gasless preference
    let result;
    
    if (gasless) {
      console.log('🚀 Attempting enhanced gasless claim...');
      result = await claimEscrowGasless(tokenId, password, salt, claimerAddress, recipientAddress);
      
      // If gasless fails, fallback to gas-paid
      if (!result.success) {
        console.log('⚠️ Gasless failed, attempting gas-paid fallback...');
        result = await claimEscrowGasPaid(tokenId, password, salt, claimerAddress, recipientAddress);
        result.gasless = false;
      } else {
        result.gasless = true;
      }
    } else {
      console.log('💰 Attempting gas-paid claim...');
      result = await claimEscrowGasPaid(tokenId, password, salt, claimerAddress, recipientAddress);
      result.gasless = false;
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Claim failed'
      });
    }
    
    // Determine final recipient
    const finalRecipient = recipientAddress || claimerAddress;
    
    // Get final rate limit status
    const finalRateLimit = checkRateLimit(claimerAddress);
    
    console.log('🎉 ENHANCED CLAIM SUCCESS:', {
      tokenId,
      gasless: result.gasless,
      transactionHash: result.transactionHash,
      recipientAddress: finalRecipient,
      nonce: result.nonce?.slice(0, 10) + '...',
      rateLimit: finalRateLimit
    });
    
    return res.status(200).json({
      success: true,
      transactionHash: result.transactionHash,
      recipientAddress: finalRecipient,
      giftInfo: {
        creator: gift.creator,
        expirationTime: Number(gift.expirationTime)
      },
      nonce: result.nonce,
      rateLimit: {
        remaining: finalRateLimit.remaining,
        resetTime: finalRateLimit.resetTime
      },
      gasless: result.gasless
    });
    
  } catch (error: any) {
    console.error('💥 CLAIM ESCROW API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: parseEscrowError(error)
    });
  }
}