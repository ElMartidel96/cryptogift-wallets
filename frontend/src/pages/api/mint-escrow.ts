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
    
    // Step 7: Mint NFT to correct recipient (escrow contract or user for skip-escrow)
    console.log(`🎨 Minting NFT to: ${to}...`);
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, tokenURI] // ← FIX: Use the actual 'to' parameter
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
    
    // CRITICAL: Verify transaction succeeded
    if (mintReceipt.status !== 'success') {
      throw new Error(`Mint transaction failed with status: ${mintReceipt.status}`);
    }
    
    console.log('✅ Mint transaction confirmed successful');
    let tokenId: string | null = null;
    
    // Parse Transfer event to get exact token ID from mint transaction
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    // Try to parse Transfer events using ethers for precise tokenId extraction
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (receipt) {
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase() &&
            log.topics[0] === transferEventSignature &&
            log.topics.length >= 4
          ) {
            // Third topic (index 3) contains the tokenId for Transfer(from, to, tokenId)
            tokenId = BigInt(log.topics[3]).toString();
            console.log('🎯 Token ID extracted from Transfer event:', tokenId);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse Transfer events, trying totalSupply fallback:', error);
    }
    
    // Fallback to totalSupply if Transfer event parsing failed
    if (!tokenId) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const nftContractABI = ["function totalSupply() public view returns (uint256)"];
        const nftContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          nftContractABI,
          provider
        );
        
        const totalSupply = await nftContract.totalSupply();
        tokenId = totalSupply.toString();
        console.log('🎯 Token ID extracted from totalSupply (fallback):', tokenId);
      } catch (error) {
        console.error('Both Transfer event parsing and totalSupply failed:', error);
        throw new Error('Failed to extract token ID from mint transaction');
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
    
    const approveReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: approveResult.transactionHash
    });
    
    // CRITICAL: Verify approve transaction succeeded
    if (approveReceipt.status !== 'success') {
      throw new Error(`Approve transaction failed with status: ${approveReceipt.status}`);
    }
    
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
    
    const escrowReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: escrowResult.transactionHash
    });
    
    // CRITICAL: Verify escrow creation succeeded
    if (escrowReceipt.status !== 'success') {
      throw new Error(`Escrow creation failed with status: ${escrowReceipt.status}. NFT may be stuck in deployer wallet.`);
    }
    
    console.log('✅ Escrow gift created successfully, NFT transferred to escrow contract');
    
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

// Direct mint (skip escrow) - mints directly to creator wallet
async function mintNFTDirectly(
  to: string,
  tokenURI: string,
  giftMessage: string,
  creatorAddress: string
): Promise<{
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  message?: string;
  error?: string;
}> {
  try {
    console.log('🎯 DIRECT MINT: Starting direct mint to creator wallet (skip escrow)');
    console.log('🎯 Target address:', to);
    
    // Get deployer account for minting
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!
    });
    
    // Mint NFT directly to creator (skip escrow entirely)
    console.log(`🎨 Direct minting NFT to creator: ${to}...`);
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, tokenURI]
    });
    
    const mintResult = await sendTransaction({
      transaction: mintTransaction,
      account: deployerAccount
    });
    
    console.log('✅ NFT minted directly, transaction hash:', mintResult.transactionHash);
    
    // Wait for transaction confirmation
    const mintReceipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: mintResult.transactionHash
    });
    
    // Verify transaction succeeded
    if (mintReceipt.status !== 'success') {
      throw new Error(`Direct mint transaction failed with status: ${mintReceipt.status}`);
    }
    
    console.log('✅ Direct mint transaction confirmed successful');
    
    // Extract token ID using same logic as escrow mint
    let tokenId: string | null = null;
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(mintResult.transactionHash);
      
      if (receipt) {
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!.toLowerCase() &&
            log.topics[0] === transferEventSignature &&
            log.topics.length >= 4
          ) {
            tokenId = BigInt(log.topics[3]).toString();
            console.log('🎯 Token ID extracted from Transfer event (direct):', tokenId);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse Transfer events for direct mint, trying totalSupply fallback:', error);
    }
    
    // Fallback to totalSupply if needed
    if (!tokenId) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const nftContractABI = ["function totalSupply() public view returns (uint256)"];
        const nftContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
          nftContractABI,
          provider
        );
        
        const totalSupply = await nftContract.totalSupply();
        tokenId = totalSupply.toString();
        console.log('🎯 Token ID extracted from totalSupply (direct fallback):', tokenId);
      } catch (error) {
        console.error('Both Transfer event parsing and totalSupply failed for direct mint:', error);
        throw new Error('Failed to extract token ID from direct mint transaction');
      }
    }
    
    if (!tokenId) {
      throw new Error('Failed to extract token ID from direct mint transaction');
    }
    
    console.log('🎉 Direct mint completed successfully - NFT delivered to creator wallet');
    
    return {
      success: true,
      tokenId,
      transactionHash: mintResult.transactionHash,
      message: `NFT minted directly to your wallet (skip escrow). Token ID: ${tokenId}`
    };
    
  } catch (error: any) {
    console.error('❌ Direct mint failed:', error);
    return {
      success: false,
      error: error.message || 'Direct mint failed'
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
    
    // Enhanced environment variable validation with detailed logging
    const requiredEnvVars = {
      PRIVATE_KEY_DEPLOY: process.env.PRIVATE_KEY_DEPLOY,
      NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
      ESCROW_CONTRACT_ADDRESS: ESCROW_CONTRACT_ADDRESS,
      NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
      NEXT_PUBLIC_TW_CLIENT_ID: process.env.NEXT_PUBLIC_TW_CLIENT_ID
    };
    
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      return res.status(500).json({ 
        success: false, 
        error: `Server configuration error: Missing ${missingVars.join(', ')}` 
      });
    }
    
    console.log('✅ Environment validation passed for mint-escrow API');
    
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
    
    // Validation - password is optional for direct minting (skip escrow)
    if (!metadataUri || !giftMessage || !creatorAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: metadataUri, giftMessage, creatorAddress' 
      });
    }
    
    // Determine if this is escrow or direct mint
    const isEscrowMint = !!password;
    const isDirectMint = !password;
    
    // For escrow mints, password is required and must be valid
    if (isEscrowMint) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: passwordValidation.message 
        });
      }
    }
    
    // For direct mint (skip escrow), password is not required
    if (isDirectMint) {
      console.log('🚀 DIRECT MINT MODE: Skip escrow enabled, minting directly to creator');
    }
    
    const messageValidation = validateGiftMessage(giftMessage);
    if (!messageValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: messageValidation.message 
      });
    }
    
    // For escrow mints, timeframe is required and must be valid
    if (isEscrowMint && !(timeframeDays in TIMEFRAME_OPTIONS)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid timeframe option' 
      });
    }
    
    // Derive deployer address from private key for neutral custody
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    // Determine target address and timeframe based on mint type
    let targetAddress: string;
    let timeframeIndex: number | undefined;
    
    if (isDirectMint) {
      // Direct mint: Always mint to creator (skip escrow)
      targetAddress = creatorAddress;
      timeframeIndex = undefined; // No timeframe needed for direct mints
      console.log('🎯 DIRECT MINT TARGET:', targetAddress.slice(0, 10) + '...');
    } else {
      // Escrow mint: NFT must be minted to the deployer first, then transferred to escrow contract
      // The mintNFTEscrowGasless function handles the escrow transfer internally
      targetAddress = deployerAccount.address; // First mint to deployer for escrow process
      timeframeIndex = TIMEFRAME_OPTIONS[timeframeDays];
      console.log('🔒 ESCROW MINT TARGET (deployer for escrow):', targetAddress.slice(0, 10) + '...');
    }
    
    console.log('🎁 MINT ESCROW REQUEST:', {
      timeframe: timeframeDays,
      gasless,
      recipientAddress: targetAddress.slice(0, 10) + '...',
      messageLength: giftMessage.length,
      escrowContract: ESCROW_CONTRACT_ADDRESS?.slice(0, 10) + '...',
      nftContract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS?.slice(0, 10) + '...',
      hasRpcUrl: !!process.env.NEXT_PUBLIC_RPC_URL
    });
    
    // Choose minting strategy based on escrow vs direct mint
    let result;
    
    if (isDirectMint) {
      console.log('🎯 DIRECT MINT: Bypassing escrow, minting directly to creator');
      result = await mintNFTDirectly(
        targetAddress,
        metadataUri,
        giftMessage,
        creatorAddress
      );
      // Direct mints are always gasless from user perspective (deployer pays)
      result.gasless = true;
    } else {
      // Escrow mint - attempt based on gasless preference
      if (gasless) {
        console.log('🚀 Attempting gasless escrow mint...');
        result = await mintNFTEscrowGasless(
          targetAddress,
          metadataUri,
          password,
          timeframeIndex!,
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
            timeframeIndex!,
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
          timeframeIndex!,
          giftMessage,
          creatorAddress
        );
        result.gasless = false;
      }
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Escrow mint failed'
      });
    }
    
    // Calculate expiration time (only for escrow mints)
    let expirationTime: number | undefined;
    let giftLink: string | undefined;
    
    if (isEscrowMint && timeframeIndex !== undefined) {
      const timeConstants = {
        [TIMEFRAME_OPTIONS.FIFTEEN_MINUTES]: 900,    // 15 minutes
        [TIMEFRAME_OPTIONS.SEVEN_DAYS]: 604800,      // 7 days
        [TIMEFRAME_OPTIONS.FIFTEEN_DAYS]: 1296000,   // 15 days
        [TIMEFRAME_OPTIONS.THIRTY_DAYS]: 2592000     // 30 days
      };
      
      const currentTime = Math.floor(Date.now() / 1000);
      expirationTime = currentTime + timeConstants[timeframeIndex];
      
      // Generate gift link for escrow mints
      const baseUrl = req.headers.host ? `https://${req.headers.host}` : '';
      giftLink = `${baseUrl}/gift/claim/${result.tokenId}`;
    } else {
      // Direct mints don't have expiration or gift links
      expirationTime = undefined;
      giftLink = undefined;
    }
    
    // Get current rate limit status
    const finalRateLimit = checkRateLimit(creatorAddress);
    
    const logMessage = isDirectMint ? 'DIRECT MINT SUCCESS' : 'ENHANCED ESCROW MINT SUCCESS';
    console.log(`🎉 ${logMessage}:`, {
      mintType: isDirectMint ? 'DIRECT' : 'ESCROW',
      tokenId: result.tokenId,
      gasless: result.gasless,
      transactionHash: result.transactionHash,
      escrowTransactionHash: result.escrowTransactionHash,
      nonce: result.nonce?.slice(0, 10) + '...',
      message: result.message,
      rateLimit: finalRateLimit
    });
    
    // Build response based on mint type
    const responseData: any = {
      success: true,
      tokenId: result.tokenId,
      transactionHash: result.transactionHash,
      gasless: result.gasless,
      rateLimit: {
        remaining: finalRateLimit.remaining,
        resetTime: finalRateLimit.resetTime
      }
    };
    
    if (isEscrowMint) {
      // Add escrow-specific fields
      responseData.escrowTransactionHash = result.escrowTransactionHash;
      responseData.giftLink = giftLink;
      responseData.salt = result.salt;
      responseData.passwordHash = result.passwordHash;
      responseData.expirationTime = expirationTime;
      responseData.nonce = result.nonce;
    } else {
      // Add direct mint specific message
      responseData.message = result.message || `NFT minted directly to your wallet. Token ID: ${result.tokenId}`;
      responseData.directMint = true;
    }
    
    return res.status(200).json(responseData);
    
  } catch (error: any) {
    console.error('💥 MINT ESCROW API ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}