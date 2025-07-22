/**
 * MINT ESCROW API
 * Mint NFT + Create Escrow Gift in one atomic operation
 * Supports gasless transactions with anti-double minting
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, getContract, prepareContractCall } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { sendTransaction, waitForReceipt } from 'thirdweb/transaction';
import { 
  generatePasswordHash,
  generateSalt,
  getEscrowContract,
  prepareCreateGiftCall,
  validatePassword,
  validateGiftMessage,
  TIMEFRAME_OPTIONS
} from '../../lib/escrowUtils';
import {
  validateTransactionAttempt,
  registerTransactionAttempt,
  markTransactionCompleted,
  markTransactionFailed,
  verifyGaslessTransaction,
  checkRateLimit
} from '../../lib/gaslessValidation';
import { ESCROW_CONTRACT_ADDRESS } from '../../lib/escrowABI';

// Types
interface MintEscrowRequest {
  metadataUri: string;
  recipientAddress?: string; // If not provided, uses neutral custody
  password: string;
  timeframeDays: keyof typeof TIMEFRAME_OPTIONS;
  giftMessage: string;
  creatorAddress: string; // For tracking and returns
  gasless?: boolean;
}

interface MintEscrowResponse {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  escrowTransactionHash?: string;
  giftLink?: string;
  salt?: string;
  passwordHash?: string;
  expirationTime?: number;
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

// Enhanced gasless minting with anti-double minting
async function mintNFTEscrowGasless(
  to: string,
  tokenURI: string,
  password: string,
  timeframeDays: number,
  giftMessage: string,
  creatorAddress: string
): Promise<{
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  escrowTransactionHash?: string;
  salt?: string;
  passwordHash?: string;
  nonce?: string;
  error?: string;
}> {
  let transactionNonce = '';
  
  try {
    console.log('🚀 MINT ESCROW GASLESS: Starting atomic operation with anti-double minting');
    
    // Step 1: Rate limiting check
    const rateLimit = checkRateLimit(creatorAddress);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    console.log('✅ Rate limit check passed. Remaining: ', rateLimit.remaining);
    
    // Step 2: Anti-double minting validation
    const escrowConfig = { password, timeframe: timeframeDays, giftMessage };
    const validation = validateTransactionAttempt(creatorAddress, tokenURI, 0, escrowConfig);
    
    if (!validation.valid) {
      throw new Error(validation.reason || 'Transaction validation failed');
    }
    
    transactionNonce = validation.nonce;
    console.log('✅ Anti-double minting validation passed. Nonce:', transactionNonce.slice(0, 10) + '...');
    
    // Step 3: Register transaction attempt
    registerTransactionAttempt(creatorAddress, transactionNonce, tokenURI, 0, escrowConfig);
    
    // Step 4: Generate salt and password hash
    const salt = generateSalt();
    const passwordHash = generatePasswordHash(password, salt);
    
    console.log('🔐 Password hash generated:', passwordHash.slice(0, 10) + '...');
    
    // Step 5: Get deployer account for minting and transfers
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    // Step 6: Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    });
    
    // Step 7: First mint NFT to deployer (neutral custody)
    console.log('🎨 Minting NFT to neutral custody...');
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [deployerAccount.address, tokenURI]
    });
    
    const mintResult = await sendTransaction({
      transaction: mintTransaction,
      account: deployerAccount
    });
    
    console.log('✅ NFT minted, transaction hash:', mintResult.transactionHash);
    
    // Step 8: Extract token ID from mint transaction
    const mintReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: mintResult.transactionHash
    });
    let tokenId: string | null = null;
    
    // Parse Transfer event to get token ID
    for (const log of mintReceipt.logs || []) {
      if (log.address?.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS?.toLowerCase()) {
        if (log.topics && log.topics.length >= 4) {
          const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
          if (log.topics[0] === transferEventSignature) {
            tokenId = BigInt(log.topics[3]).toString();
            console.log('🎯 Token ID extracted from mint:', tokenId);
            break;
          }
        }
      }
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from mint transaction');
    }
    
    // Step 9: Approve escrow contract to transfer the NFT
    console.log('🔓 Approving escrow contract for NFT transfer...');
    const approveTransaction = prepareContractCall({
      contract: nftContract,
      method: "function approve(address to, uint256 tokenId) external",
      params: [ESCROW_CONTRACT_ADDRESS!, BigInt(tokenId)]
    });
    
    const approveResult = await sendTransaction({
      transaction: approveTransaction,
      account: deployerAccount
    });
    
    await approveResult.wait();
    console.log('✅ NFT approved for escrow transfer');
    
    // Step 10: Create escrow gift (this will transfer NFT to escrow contract)
    console.log('🔒 Creating escrow gift...');
    const createGiftTransaction = prepareCreateGiftCall(
      tokenId,
      process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
      password,
      salt,
      timeframeDays,
      giftMessage
    );
    
    const escrowResult = await sendTransaction({
      transaction: createGiftTransaction,
      account: deployerAccount
    });
    
    await escrowResult.wait();
    console.log('✅ Escrow gift created, transaction hash:', escrowResult.transactionHash);
    
    // Step 11: Verify transactions on-chain
    const mintVerification = await verifyGaslessTransaction(
      mintResult.transactionHash,
      creatorAddress,
      tokenId
    );
    
    if (!mintVerification.verified) {
      throw new Error(`Transaction verification failed: ${mintVerification.error}`);
    }
    
    const escrowVerification = await verifyGaslessTransaction(
      escrowResult.transactionHash,
      creatorAddress,
      tokenId
    );
    
    if (!escrowVerification.verified) {
      console.warn('⚠️ Escrow verification failed but mint succeeded:', escrowVerification.error);
    }
    
    // Step 12: Mark transaction as completed
    markTransactionCompleted(transactionNonce, escrowResult.transactionHash);
    
    console.log('🎉 Enhanced gasless escrow mint completed with verification');
    
    return {
      success: true,
      tokenId,
      transactionHash: mintResult.transactionHash,
      escrowTransactionHash: escrowResult.transactionHash,
      salt,
      passwordHash,
      nonce: transactionNonce
    };
    
  } catch (error: any) {
    console.error('❌ Enhanced gasless escrow mint failed:', error);
    
    // Mark transaction as failed if nonce was generated
    if (transactionNonce) {
      markTransactionFailed(transactionNonce, error.message);
    }
    
    return {
      success: false,
      error: error.message || 'Enhanced gasless escrow mint failed',
      nonce: transactionNonce
    };
  }
}

// Gas-paid fallback for escrow minting
async function mintNFTEscrowGasPaid(
  to: string,
  tokenURI: string,
  password: string,
  timeframeDays: number,
  giftMessage: string,
  creatorAddress: string
): Promise<{
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  escrowTransactionHash?: string;
  salt?: string;
  passwordHash?: string;
  error?: string;
}> {
  try {
    console.log('💰 MINT ESCROW GAS-PAID: Starting atomic operation');
    
    // Similar implementation to gasless but without Biconomy
    // For now, we'll use the deployer account for gas-paid transactions
    // In production, this would use the user's wallet
    
    const result = await mintNFTEscrowGasless(to, tokenURI, password, timeframeDays, giftMessage, creatorAddress);
    
    return {
      ...result,
      // Note: In gas-paid version, user would pay for their own transactions
      // This is a simplified implementation using deployer account
    };
    
  } catch (error: any) {
    console.error('❌ Gas-paid escrow mint failed:', error);
    return {
      success: false,
      error: error.message || 'Gas-paid escrow mint failed'
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MintEscrowResponse>
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
    if (!process.env.PRIVATE_KEY_DEPLOY || !process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || !ESCROW_CONTRACT_ADDRESS) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }
    
    // Parse and validate request body
    const {
      metadataUri,
      recipientAddress,
      password,
      timeframeDays,
      giftMessage,
      creatorAddress,
      gasless = true
    }: MintEscrowRequest = req.body;
    
    // Validation
    if (!metadataUri || !password || !giftMessage || !creatorAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: passwordValidation.message 
      });
    }
    
    const messageValidation = validateGiftMessage(giftMessage);
    if (!messageValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: messageValidation.message 
      });
    }
    
    if (!(timeframeDays in TIMEFRAME_OPTIONS)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid timeframe option' 
      });
    }
    
    // Use neutral custody address if no specific recipient
    const targetAddress = recipientAddress || process.env.PRIVATE_KEY_DEPLOY!;
    const timeframeIndex = TIMEFRAME_OPTIONS[timeframeDays];
    
    console.log('🎁 MINT ESCROW REQUEST:', {
      timeframe: timeframeDays,
      gasless,
      recipientAddress: targetAddress.slice(0, 10) + '...',
      messageLength: giftMessage.length
    });
    
    // Attempt minting based on gasless preference
    let result;
    
    if (gasless) {
      console.log('🚀 Attempting gasless escrow mint...');
      result = await mintNFTEscrowGasless(
        targetAddress,
        metadataUri,
        password,
        timeframeIndex,
        giftMessage,
        creatorAddress
      );
      
      // If gasless fails, fallback to gas-paid
      if (!result.success) {
        console.log('⚠️ Gasless failed, attempting gas-paid fallback...');
        result = await mintNFTEscrowGasPaid(
          targetAddress,
          metadataUri,
          password,
          timeframeIndex,
          giftMessage,
          creatorAddress
        );
        result.gasless = false;
      } else {
        result.gasless = true;
      }
    } else {
      console.log('💰 Attempting gas-paid escrow mint...');
      result = await mintNFTEscrowGasPaid(
        targetAddress,
        metadataUri,
        password,
        timeframeIndex,
        giftMessage,
        creatorAddress
      );
      result.gasless = false;
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Escrow mint failed'
      });
    }
    
    // Calculate expiration time
    const timeConstants = {
      [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 900,    // 15 minutes
      [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 604800,      // 7 days
      [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 1296000,   // 15 days
      [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 2592000     // 30 days
    };
    
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = currentTime + timeConstants[timeframeIndex];
    
    // Generate gift link
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
    const giftLink = `${baseUrl}/gift/claim/${result.tokenId}`;
    
    // Get current rate limit status
    const finalRateLimit = checkRateLimit(creatorAddress);
    
    console.log('🎉 ENHANCED ESCROW MINT SUCCESS:', {
      tokenId: result.tokenId,
      gasless: result.gasless,
      transactionHash: result.transactionHash,
      escrowTransactionHash: result.escrowTransactionHash,
      nonce: result.nonce?.slice(0, 10) + '...',
      rateLimit: finalRateLimit
    });
    
    return res.status(200).json({
      success: true,
      tokenId: result.tokenId,
      transactionHash: result.transactionHash,
      escrowTransactionHash: result.escrowTransactionHash,
      giftLink,
      salt: result.salt,
      passwordHash: result.passwordHash,
      expirationTime,
      nonce: result.nonce,
      rateLimit: {
        remaining: finalRateLimit.remaining,
        resetTime: finalRateLimit.resetTime
      },
      gasless: result.gasless
    });
    
  } catch (error: any) {
    console.error('💥 MINT ESCROW API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}