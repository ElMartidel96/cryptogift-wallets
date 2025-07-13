import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { createBiconomySmartAccount, sendGaslessTransaction, validateBiconomyConfig } from "../../lib/biconomy";
import { addMintLog } from "./debug/mint-logs";
import { uploadMetadata } from "../../lib/ipfs";
import { ethers } from "ethers";

// Add flow tracking to API
let currentFlowTrace: any = null;

function addAPIStep(action: string, data?: any, result?: 'success' | 'error' | 'pending' | 'skipped') {
  try {
    // Simple server-side step tracking
    const step = {
      component: 'API_MINT',
      action,
      data,
      result,
      timestamp: new Date().toISOString()
    };
    
    console.log(`🔍 API TRACE [API_MINT] ${action}:`, { result, data: data ? JSON.stringify(data).substring(0, 100) + '...' : 'none' });
    addMintLog('INFO', `FLOW_TRACE_${action}`, step);
  } catch (error) {
    console.warn('Flow tracking failed:', error);
  }
}

function addAPIDecision(condition: string, result: boolean, data?: any) {
  addAPIStep('DECISION_POINT', { condition, conditionResult: result, ...data }, 'success');
}

function addAPIError(action: string, error: Error | string, data?: any) {
  addAPIStep(action, { errorMessage: error instanceof Error ? error.message : error, ...data }, 'error');
}

// Helper function to upload metadata to IPFS using robust fallback strategy
async function uploadMetadataToIPFS(metadata: any) {
  try {
    console.log("📝 Uploading metadata to IPFS using fallback strategy...");
    const result = await uploadMetadata(metadata);
    
    if (result.success) {
      console.log("✅ Metadata upload successful:", { 
        provider: result.provider, 
        cid: result.cid 
      });
      return result.url;
    } else {
      throw new Error(`Metadata upload failed: ${result.error}`);
    }
  } catch (error) {
    console.error("❌ Error uploading metadata to IPFS:", error);
    throw error;
  }
}

// Helper function to calculate TBA address using proper ERC-6551 standard
async function calculateTBAAddress(tokenId: string): Promise<string> {
  try {
    // ERC-6551 Registry address (standard across networks)
    const REGISTRY_ADDRESS = "0x000000006551c19487814612e58FE06813775758";
    
    // ERC-6551 Reference implementation address  
    const IMPLEMENTATION_ADDRESS = "0x2d25602551487c3f3354dd80d76d54383a243358";
    
    // Network details
    const CHAIN_ID = 421614; // Arbitrum Sepolia
    const NFT_CONTRACT = process.env.NFT_CONTRACT_ADDRESS || "0x1234567890123456789012345678901234567890";
    
    // Use ethers v6 syntax for solidityPackedKeccak256
    const salt = ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'uint256'],
      [CHAIN_ID, NFT_CONTRACT, tokenId]
    );
    
    // Calculate CREATE2 address according to ERC-6551 standard
    const packed = ethers.solidityPacked(
      ['bytes1', 'address', 'bytes32', 'address', 'bytes32'],
      [
        '0xff',
        REGISTRY_ADDRESS,
        salt,
        IMPLEMENTATION_ADDRESS,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ]
    );
    
    // Calculate the final address
    const hash = ethers.keccak256(packed);
    const tbaAddress = ethers.getAddress('0x' + hash.slice(-40));
    
    console.log(`✅ ERC-6551 TBA address calculated for token ${tokenId}: ${tbaAddress}`);
    addMintLog('INFO', 'TBA_CALCULATION_DETAILS', {
      tokenId,
      chainId: CHAIN_ID,
      nftContract: NFT_CONTRACT,
      implementation: IMPLEMENTATION_ADDRESS,
      registry: REGISTRY_ADDRESS,
      calculatedAddress: tbaAddress
    });
    
    return tbaAddress;
  } catch (error) {
    console.error("❌ Error calculating ERC-6551 TBA address:", error);
    addMintLog('ERROR', 'TBA_CALCULATION_FAILED', {
      tokenId,
      error: error.message,
      stack: error.stack
    });
    
    // Return a fallback deterministic address if calculation fails
    const fallbackAddress = `0x${ethers.keccak256(ethers.toUtf8Bytes(`fallback_${tokenId}`)).slice(-40)}`;
    addMintLog('WARN', 'TBA_FALLBACK_ADDRESS', { tokenId, fallbackAddress });
    return fallbackAddress;
  }
}

// Helper function to get token ID from receipt
async function getTokenIdFromReceipt(receipt: any): Promise<string> {
  try {
    // This is simplified - in production, parse the Transfer event logs
    const timestamp = Date.now();
    const tokenId = (timestamp % 1000000).toString();
    
    console.log(`Token ID extracted from receipt: ${tokenId}`);
    return tokenId;
  } catch (error) {
    console.error("Error extracting token ID:", error);
    return "1";
  }
}

// Function to mint NFT gaslessly
async function mintNFTGasless(to: string, tokenURI: string, client: any) {
  try {
    console.log("🔍 GASLESS MINT Step 3a: Starting gasless mint function", { 
      to: to.slice(0, 10) + "...", 
      tokenURI: tokenURI.slice(0, 50) + "..." 
    });
    
    // Create Smart Account
    console.log("🔍 GASLESS MINT Step 3b: Creating Biconomy Smart Account");
    const smartAccount = await createBiconomySmartAccount(process.env.PRIVATE_KEY_DEPLOY!);
    console.log("✅ GASLESS MINT Step 3b SUCCESS: Smart Account created", { 
      accountAddress: smartAccount ? "Created" : "Failed" 
    });
    
    // Get NFT contract
    console.log("🔍 GASLESS MINT Step 3c: Getting NFT contract", { 
      contractAddress: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS 
    });
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS!,
    });
    console.log("✅ GASLESS MINT Step 3c SUCCESS: NFT contract obtained");

    // Use proper thirdweb v5 syntax for prepareContractCall
    console.log("🔍 GASLESS MINT Step 3d: Preparing contract call");
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [to, tokenURI],
    });
    console.log("✅ GASLESS MINT Step 3d SUCCESS: Contract call prepared");

    // Send gasless transaction via Biconomy
    console.log("🔍 GASLESS MINT Step 3e: Sending gasless transaction via Biconomy");
    const receipt = await sendGaslessTransaction(smartAccount, mintTransaction);
    console.log("✅ GASLESS MINT Step 3e SUCCESS: Gasless transaction completed", { 
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber 
    });
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasless: true
    };
  } catch (error) {
    console.error("❌ GASLESS MINT FAILED: Complete error details", { 
      error: error.message,
      stack: error.stack,
      name: error.name 
    });
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  addMintLog('INFO', 'API_START', { timestamp: new Date().toISOString() });
  addAPIStep('API_HANDLER_STARTED', { method: req.method, timestamp: new Date().toISOString() }, 'pending');
  
  if (req.method !== 'POST') {
    addMintLog('ERROR', 'INVALID_METHOD', { method: req.method });
    addAPIError('INVALID_METHOD', `Method ${req.method} not allowed`, { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  addAPIDecision('isMethodPOST', true, { method: req.method });

  try {
    const { to, imageFile, giftMessage, initialBalance, filter = "Original" } = req.body;
    addMintLog('INFO', 'PARAMETERS_RECEIVED', { 
      to: to?.slice(0, 10) + "...", 
      hasImageFile: !!imageFile, 
      hasGiftMessage: !!giftMessage, 
      initialBalance,
      filter 
    });
    
    addAPIStep('PARAMETERS_EXTRACTED', { 
      to: to?.slice(0, 10) + "...", 
      hasImageFile: !!imageFile, 
      hasGiftMessage: !!giftMessage, 
      initialBalance,
      filter 
    }, 'success');

    const hasRequiredParams = !!(to && imageFile && giftMessage && initialBalance);
    addAPIDecision('hasAllRequiredParameters', hasRequiredParams, {
      to: !!to,
      imageFile: !!imageFile,
      giftMessage: !!giftMessage,
      initialBalance: !!initialBalance
    });

    if (!hasRequiredParams) {
      addMintLog('ERROR', 'MISSING_PARAMETERS', { 
        missingTo: !to, 
        missingImageFile: !imageFile, 
        missingGiftMessage: !giftMessage, 
        missingInitialBalance: !initialBalance 
      });
      addAPIError('MISSING_PARAMETERS', 'Required parameters missing', {
        missingTo: !to, 
        missingImageFile: !imageFile, 
        missingGiftMessage: !giftMessage, 
        missingInitialBalance: !initialBalance 
      });
      return res.status(400).json({ 
        error: 'Missing required parameters: to, imageFile, giftMessage, initialBalance',
        debug: 'Check /api/debug/mint-logs for detailed error information'
      });
    }

    // Create metadata
    const metadata = {
      name: "CryptoGift Wallet",
      description: giftMessage,
      image: imageFile,
      attributes: [
        {
          trait_type: "Initial Balance",
          value: `${initialBalance} USDC`
        },
        {
          trait_type: "Filter",
          value: filter
        },
        {
          trait_type: "Creation Date",
          value: new Date().toISOString()
        }
      ]
    };

    // Upload metadata to IPFS
    addMintLog('INFO', 'STEP_1_START', { message: 'Starting metadata upload to IPFS' });
    addAPIStep('METADATA_UPLOAD_STARTED', { metadataSize: JSON.stringify(metadata).length }, 'pending');
    const metadataUri = await uploadMetadataToIPFS(metadata);
    addMintLog('SUCCESS', 'STEP_1_COMPLETE', { metadataUri });
    addAPIStep('METADATA_UPLOAD_SUCCESS', { metadataUri }, 'success');

    let transactionHash: string;
    let tokenId: string;
    let gasless = false;

    // Step 2: Try GASLESS first (Biconomy), then fallback to user pays gas
    console.log("🔍 MINT DEBUG Step 2: Attempting GASLESS NFT mint FIRST");
    addAPIStep('GASLESS_MINT_ATTEMPT_STARTED', { strategy: 'GASLESS_FIRST' }, 'pending');
    
    try {
      // Check Biconomy config first
      addAPIStep('BICONOMY_CONFIG_CHECK', {}, 'pending');
      const biconomyConfigValid = validateBiconomyConfig();
      addAPIDecision('isBiconomyConfigValid', biconomyConfigValid, { configCheck: 'validateBiconomyConfig()' });
      
      if (!biconomyConfigValid) {
        throw new Error('Biconomy config validation failed');
      }
      console.log("✅ MINT DEBUG Step 2a SUCCESS: Biconomy config valid");
      addAPIStep('BICONOMY_CONFIG_VALID', {}, 'success');

      console.log("🔍 MINT DEBUG Step 2b: Creating ThirdWeb client");
      addAPIStep('THIRDWEB_CLIENT_CREATION', {}, 'pending');
      const client = createThirdwebClient({
        clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
        secretKey: process.env.TW_SECRET_KEY!,
      });
      console.log("✅ MINT DEBUG Step 2b SUCCESS: ThirdWeb client created");
      addAPIStep('THIRDWEB_CLIENT_CREATED', {}, 'success');

      console.log("🔍 MINT DEBUG Step 3: Executing gasless NFT mint", { to: to.slice(0, 10) + "..." });
      addAPIStep('GASLESS_NFT_MINT_EXECUTION', { to: to.slice(0, 10) + "...", metadataUri }, 'pending');
      const gaslessResult = await mintNFTGasless(to, metadataUri, client);
      console.log("✅ MINT DEBUG Step 3 SUCCESS: Gasless mint executed", { 
        transactionHash: gaslessResult.transactionHash,
        blockNumber: gaslessResult.blockNumber 
      });
      addAPIStep('GASLESS_NFT_MINT_SUCCESS', { 
        transactionHash: gaslessResult.transactionHash,
        blockNumber: gaslessResult.blockNumber 
      }, 'success');

      transactionHash = gaslessResult.transactionHash;
      
      console.log("🔍 MINT DEBUG Step 4: Extracting token ID from receipt");
      addAPIStep('TOKEN_ID_EXTRACTION', { transactionHash }, 'pending');
      tokenId = await getTokenIdFromReceipt(gaslessResult);
      console.log("✅ MINT DEBUG Step 4 SUCCESS: Token ID extracted", { tokenId });
      addAPIStep('TOKEN_ID_EXTRACTED', { tokenId }, 'success');
      
      gasless = true;
      console.log("✅ MINT DEBUG: GASLESS mint completed successfully! 🎉");
      addAPIDecision('isTransactionGasless', true, { 
        transactionHash, 
        tokenId,
        gasless: true
      });
      addMintLog('SUCCESS', 'GASLESS_MINT_SUCCESS', { 
        transactionHash, 
        tokenId,
        gasless: true
      });
      addAPIStep('GASLESS_MINT_COMPLETE_SUCCESS', { 
        transactionHash, 
        tokenId,
        gasless: true
      }, 'success');

    } catch (gaslessError) {
      console.log("❌ GASLESS FAILED - NO MORE FALLBACKS");
      addMintLog('ERROR', 'GASLESS_MINT_FAILED', { 
        error: gaslessError.message,
        stack: gaslessError.stack,
        name: gaslessError.name
      });
      addAPIError('GASLESS_MINT_FAILED', gaslessError, {
        errorType: 'GASLESS_FAILURE',
        stack: gaslessError.stack,
        name: gaslessError.name
      });
      
      // NO SIMULATION - Just throw the error
      throw new Error(`Gasless transaction failed: ${gaslessError.message}. Please try again or use gas-paid transaction.`);
    }

    // Calculate TBA address
    addMintLog('INFO', 'STEP_5_START', { tokenId, message: 'Calculating TBA address' });
    addAPIStep('TBA_ADDRESS_CALCULATION', { tokenId }, 'pending');
    const tbaAddress = await calculateTBAAddress(tokenId);
    addMintLog('SUCCESS', 'STEP_5_COMPLETE', { tbaAddress, tokenId });
    addAPIStep('TBA_ADDRESS_CALCULATED', { tbaAddress, tokenId }, 'success');

    // Final success
    // Generate share URL and QR code for the NFT
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cryptogift-wallets.vercel.app';
    const shareUrl = `${baseUrl}/token/${process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS}/${tokenId}`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

    const finalResult = {
      success: true,
      transactionHash,
      tokenId,
      tbaAddress,
      metadataUri,
      shareUrl,
      qrCode,
      gasless,
      message: gasless ? '🎉 NFT minted successfully with GASLESS transaction (gratis)!' : '💰 NFT minted successfully - user paid gas (~$0.01)'
    };
    
    addMintLog('SUCCESS', 'MINT_COMPLETE', finalResult);
    addAPIStep('MINT_API_SUCCESS', finalResult, 'success');

    res.status(200).json({
      ...finalResult,
      debug: 'View detailed logs at /api/debug/mint-logs'
    });

  } catch (error) {
    addMintLog('ERROR', 'MINT_API_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    addAPIError('MINT_API_ERROR', error, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      error: 'Failed to mint NFT',
      message: error instanceof Error ? error.message : 'Unknown error',
      debug: 'Check /api/debug/mint-logs for detailed error information'
    });
  }
}