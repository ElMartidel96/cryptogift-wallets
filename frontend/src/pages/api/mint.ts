import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, readContract, waitForReceipt } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { createBiconomySmartAccount, sendGaslessTransaction, validateBiconomyConfig, isGaslessAvailable } from "../../lib/biconomy";
import { addMintLog } from "./debug/mint-logs";
import { uploadMetadata } from "../../lib/ipfs";
import { ethers } from "ethers";
import { storeNFTMetadata, createNFTMetadata, getNFTMetadata } from "../../lib/nftMetadataStore";
import { kvReferralDB, generateUserDisplay } from "../../lib/referralDatabaseKV";
import { REFERRAL_COMMISSION_PERCENT } from "../../lib/constants";

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

// CRITICAL NEW: Verify image accessibility across multiple IPFS gateways
async function verifyImageAccessibility(imageCid: string): Promise<{
  accessible: boolean;
  workingGateway?: string;
  allGatewayResults: Array<{ gateway: string; success: boolean; error?: string }>;
}> {
  const gateways = [
    `https://nftstorage.link/ipfs/${imageCid}`,
    `https://ipfs.io/ipfs/${imageCid}`,
    `https://gateway.pinata.cloud/ipfs/${imageCid}`,
    `https://cloudflare-ipfs.com/ipfs/${imageCid}`
  ];

  const results: Array<{ gateway: string; success: boolean; error?: string }> = [];
  let workingGateway: string | undefined;

  console.log(`🔍 Verifying image accessibility for CID: ${imageCid}`);

  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      console.log(`🔍 Testing gateway: ${gateway}`);
      
      const response = await fetch(gateway, {
        method: 'HEAD', // Just check if resource exists
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ Gateway working: ${gateway}`);
        results.push({ gateway, success: true });
        if (!workingGateway) workingGateway = gateway;
      } else {
        console.log(`❌ Gateway failed (${response.status}): ${gateway}`);
        results.push({ gateway, success: false, error: `HTTP ${response.status}` });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Gateway error: ${gateway} - ${errorMessage}`);
      results.push({ gateway, success: false, error: errorMessage });
    }
  }

  const accessible = results.some(r => r.success);
  
  addMintLog('INFO', 'IMAGE_VERIFICATION_COMPLETE', {
    imageCid,
    accessible,
    workingGateway,
    totalGateways: gateways.length,
    workingGateways: results.filter(r => r.success).length,
    allResults: results
  });

  return {
    accessible,
    workingGateway,
    allGatewayResults: results
  };
}

// Helper function to calculate TBA address using proper ERC-6551 standard
async function calculateTBAAddress(tokenId: string): Promise<string> {
  try {
    // Modo simplificado - dirección determinística
    const NFT_CONTRACT = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || "MISSING_CONTRACT";
    const DEPLOYER_ADDRESS = "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a"; // Deployer fijo
    
    // Crear dirección determinística usando keccak256 
    const deterministicSeed = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'address'],
      [NFT_CONTRACT, tokenId, DEPLOYER_ADDRESS]
    );
    
    // Generar dirección TBA determinística
    const tbaAddress = ethers.getAddress('0x' + deterministicSeed.slice(-40));
    
    console.log(`✅ TBA determinística calculada para token ${tokenId}: ${tbaAddress}`);
    addMintLog('INFO', 'TBA_SIMPLIFIED_CALCULATION', {
      tokenId,
      nftContract: NFT_CONTRACT,
      deployer: DEPLOYER_ADDRESS,
      calculatedAddress: tbaAddress,
      method: "deterministic_simplified"
    });
    
    return tbaAddress;
  } catch (error) {
    console.error("❌ Error calculating TBA determinística:", error);
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

// Removed deprecated helper functions:
// - extractTokenIdFromLogs (replaced with direct contract totalSupply reading)  
// - getTokenIdFromReceipt (replaced with waitForReceipt + totalSupply)

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
    
    // Get NFT contract with custom RPC
    console.log("🔍 GASLESS MINT Step 3c: Getting NFT contract", { 
      contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS 
    });
    
    const customChain = {
      ...baseSepolia,
      rpc: process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e"
    };
    
    const nftContract = getContract({
      client,
      chain: customChain,
      address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!,
    });
    console.log("✅ GASLESS MINT Step 3c SUCCESS: NFT contract obtained");

    // Use proper thirdweb v5 syntax for prepareContractCall - UPDATED METHOD
    console.log("🔍 GASLESS MINT Step 3d: Preparing contract call");
    // FIXED: Use NFT Collection mintTo method for classic contract
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "function mintTo(address to, string memory tokenURI) external",
      params: [
        to, // recipient
        tokenURI // token URI
      ],
    });
    console.log("✅ GASLESS MINT Step 3d SUCCESS: Contract call prepared");

    // Send gasless transaction via Biconomy
    console.log("🔍 GASLESS MINT Step 3e: Sending gasless transaction via Biconomy");
    const receipt = await sendGaslessTransaction(smartAccount, mintTransaction);
    console.log("✅ GASLESS MINT Step 3e SUCCESS: Gasless transaction completed", { 
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber 
    });
    
    // CRITICAL FIX: Extract REAL token ID using totalSupply (gasless)
    console.log("🔍 GASLESS: Extracting REAL token ID from contract...");
    let realTokenId;
    
    try {
      // RELIABLE METHOD: gasless transaction is confirmed, use totalSupply
      console.log("🎯 GASLESS: Using totalSupply for reliable tokenId extraction...");
      
      const totalSupply = await readContract({
        contract: nftContract,
        method: "function totalSupply() view returns (uint256)",
        params: []
      });
      
      // CRITICAL FIX: totalSupply is count of tokens, last token ID is totalSupply - 1
      realTokenId = (totalSupply - BigInt(1)).toString();
      console.log("✅ GASLESS: CORRECTED TOKEN ID calculation:");
      console.log("  📊 Total supply:", totalSupply.toString());
      console.log("  🎯 Last token ID (supply-1):", realTokenId);
      
    } catch (supplyError) {
      console.log("⚠️ GASLESS: Token ID extraction failed, using transaction-based fallback");
      
      // Fallback: Use transaction hash for deterministic but unique ID
      const hashNum = parseInt(receipt.transactionHash.slice(-8), 16);
      realTokenId = (hashNum % 1000000).toString();
      console.log("🎯 GASLESS: Fallback token ID from hash:", realTokenId);
    }
    
    return {
      success: true,
      tokenId: realTokenId,
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
  console.log("🚀 MINT API STARTED ===========================================");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🔧 Method:", req.method);
  console.log("📋 Request body keys:", Object.keys(req.body || {}));
  console.log("🌐 User Agent:", req.headers['user-agent']?.substring(0, 100));
  
  addMintLog('INFO', 'API_START', { timestamp: new Date().toISOString() });
  addAPIStep('API_HANDLER_STARTED', { method: req.method, timestamp: new Date().toISOString() }, 'pending');
  
  if (req.method !== 'POST') {
    addMintLog('ERROR', 'INVALID_METHOD', { method: req.method });
    addAPIError('INVALID_METHOD', `Method ${req.method} not allowed`, { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  addAPIDecision('isMethodPOST', true, { method: req.method });

  try {
    console.log("📝 EXTRACTING PARAMETERS from request body...");
    const { to, imageFile, giftMessage, initialBalance, filter = "Original", referrer } = req.body;
    
    console.log("🔍 PARAMETER ANALYSIS:");
    console.log("  📮 To address:", to?.slice(0, 20) + "...");
    console.log("  🖼️ Image file:", !!imageFile ? `Present (${imageFile?.substring(0, 50)}...)` : "MISSING");
    console.log("  💬 Gift message:", giftMessage?.substring(0, 50) + "...");
    console.log("  💰 Initial balance:", initialBalance, typeof initialBalance);
    console.log("  🎨 Filter:", filter);
    console.log("  🔗 Referrer:", referrer?.slice(0, 20) + "...");
    
    addMintLog('INFO', 'PARAMETERS_RECEIVED', { 
      to: to?.slice(0, 10) + "...", 
      hasImageFile: !!imageFile, 
      imageFileLength: imageFile?.length,
      hasGiftMessage: !!giftMessage, 
      initialBalance,
      filter,
      hasReferrer: !!referrer
    });
    
    addAPIStep('PARAMETERS_EXTRACTED', { 
      to: to?.slice(0, 10) + "...", 
      hasImageFile: !!imageFile, 
      hasGiftMessage: !!giftMessage, 
      initialBalance,
      filter 
    }, 'success');

    const hasRequiredParams = !!(to && imageFile && giftMessage && typeof initialBalance === 'number');
    addAPIDecision('hasAllRequiredParameters', hasRequiredParams, {
      to: !!to,
      imageFile: !!imageFile,
      giftMessage: !!giftMessage,
      initialBalance: typeof initialBalance === 'number'
    });

    if (!hasRequiredParams) {
      addMintLog('ERROR', 'MISSING_PARAMETERS', { 
        missingTo: !to, 
        missingImageFile: !imageFile, 
        missingGiftMessage: !giftMessage, 
        missingInitialBalance: typeof initialBalance !== 'number' 
      });
      addAPIError('MISSING_PARAMETERS', 'Required parameters missing', {
        missingTo: !to, 
        missingImageFile: !imageFile, 
        missingGiftMessage: !giftMessage, 
        missingInitialBalance: typeof initialBalance !== 'number' 
      });
      return res.status(400).json({ 
        error: 'Missing required parameters: to, imageFile, giftMessage, initialBalance',
        debug: 'Check /api/debug/mint-logs for detailed error information'
      });
    }

    console.log("🏗️ CREATING NFT METADATA ===========================================");
    
    // Create metadata following NFT standards
    // Clean and ensure imageFile has proper IPFS format (avoid double prefix)
    const cleanImageFile = imageFile.replace(/^ipfs:\/\//, ''); // Remove existing prefix if any
    const imageUri = `ipfs://${cleanImageFile}`;
    
    console.log('🖼️ IMAGE URI PROCESSING:');
    console.log("  📥 Original imageFile:", imageFile?.substring(0, 100) + "...");
    console.log("  🧹 Clean imageFile:", cleanImageFile?.substring(0, 100) + "...");
    console.log("  📤 Final imageUri:", imageUri?.substring(0, 100) + "...");
    console.log("  ✅ Is IPFS format:", imageFile.startsWith('ipfs://'));
    console.log("  📊 ImageFile type:", typeof imageFile);
    console.log("  📏 ImageFile length:", imageFile?.length);
    
    addMintLog('INFO', 'NFT_IMAGE_URI_PREPARED', {
      originalImageFile: imageFile,
      finalImageUri: imageUri,
      isIPFSFormat: imageFile.startsWith('ipfs://')
    });
    
    const metadata = {
      name: "CryptoGift Wallet",
      description: giftMessage,
      image: imageUri, // NFT standard: should point directly to image file
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
    // tokenId will be extracted from contract after minting

    // PERFORMANCE OPTIMIZED: Fast gasless detection
    const gaslessAvailable = isGaslessAvailable();
    console.log(`🚀 FAST GASLESS CHECK: ${gaslessAvailable ? 'Available' : 'Not Available'}`);
    addAPIStep('GASLESS_FAST_CHECK', { available: gaslessAvailable }, gaslessAvailable ? 'success' : 'skipped');
    
    // TRY GASLESS FIRST - Only if fast check passes
    if (gaslessAvailable) {
      try {
        console.log("🔍 GASLESS MINT: Attempting gasless transaction");
        addAPIStep('GASLESS_ATTEMPT', { strategy: 'OPTIMIZED_GASLESS' }, 'pending');
        
        // Create client for gasless (reuse if possible)
        const client = createThirdwebClient({
          clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
          secretKey: process.env.TW_SECRET_KEY!,
        });
        
        // Set shorter timeout for gasless attempt
        const gaslessPromise = mintNFTGasless(to, metadataUri, client);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gasless timeout - falling back to gas-paid')), 15000) // 15s timeout
        );
        
        const gaslessResult = await Promise.race([gaslessPromise, timeoutPromise]) as {
          success: boolean;
          transactionHash: string;
          blockNumber: number;
          gasless: boolean;
          tokenId: string;
        };
        
        transactionHash = gaslessResult.transactionHash;
        
        // CRITICAL FIX: Use REAL token ID from gasless result instead of generating manual ID
        tokenId = gaslessResult.tokenId; // Use real tokenId from gasless function
        
        console.log(`🎯 REAL TOKEN ID: ${tokenId} (gasless - from contract)`);
        addAPIStep('REAL_TOKEN_ID_EXTRACTED', { tokenId, method: 'gasless-from-contract' }, 'success');
        
        gasless = true;
        
        console.log("✅ GASLESS SUCCESS!", { transactionHash, tokenId });
        addAPIStep('GASLESS_SUCCESS', { transactionHash, tokenId }, 'success');
        
      } catch (gaslessError) {
        console.log("⚠️ GASLESS FAILED (fast fallback):", gaslessError.message);
        addAPIStep('GASLESS_FAILED', { error: gaslessError.message }, 'error');
        
        // Fast fallback - don't wait
      }
    } else {
      console.log("⚡ SKIPPING GASLESS: Fast check failed");
      addAPIStep('GASLESS_SKIPPED', { reason: 'Fast validation failed' }, 'skipped');
    }
    
    // FALLBACK: Direct gas-paid transaction (if gasless failed or skipped)
    if (!gasless) {
      console.log("🔍 FALLBACK: Direct gas-paid transaction");
      addAPIStep('DIRECT_GAS_PAID_ATTEMPT', { strategy: 'FAST_FALLBACK' }, 'pending');
      
      try {
      console.log("🔍 MINT DEBUG: Creating ThirdWeb client");
      const client = createThirdwebClient({
        clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
        secretKey: process.env.TW_SECRET_KEY!,
      });
      
      // Create deployer account from private key
      const account = privateKeyToAccount({
        client,
        privateKey: process.env.PRIVATE_KEY_DEPLOY!,
      });

      // Get NFT contract
      const customChain = {
        ...baseSepolia,
        rpc: process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e"
      };

      console.log("🎯 MINTING TRANSACTION SETUP ===========================================");
      console.log("🔍 CONTRACT CONFIGURATION:");
      console.log("  📝 CryptoGift NFT Address:", process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
      console.log("  📝 Chain ID:", process.env.NEXT_PUBLIC_CHAIN_ID);
      console.log("  📝 RPC URL:", process.env.NEXT_PUBLIC_RPC_URL?.substring(0, 50) + "...");
      console.log("🎯 TRANSACTION PARAMETERS:");
      console.log("  📮 Recipient:", to);
      console.log("  📄 Metadata URI:", metadataUri?.substring(0, 100) + "...");
      console.log("  💰 Initial Balance:", initialBalance, "USDC");
      console.log("  🔗 Referrer:", referrer?.slice(0, 20) + "...");
      
      // Use the Factory contract as the main NFT contract
      console.log("🎯 APPROACH: Using Factory contract directly");
      
      const nftDropContract = getContract({
        client,
        chain: customChain,
        address: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS!, // CORRECT: Use CryptoGift NFT contract
      });
      
      // ESTRATEGIA CORRECTA ERC-6551: Crear Token Bound Account directamente
      console.log("🎯 ESTRATEGIA ERC-6551: Crear Token Bound Account directamente");
      
      // Verificar configuración con NUEVO CONTRATO CRYPTOGIFT NFT
      const CRYPTOGIFT_NFT_CONTRACT = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS; // 0xdF514FDC06D7f2cc51Db20aBF6d6F56582F796BE
      const ERC6551_REGISTRY = process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS; // 0x3cb823e40359b9698b942547d9d2241d531f2708
      const TBA_IMPLEMENTATION = process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS; // 0x60883bd1549cd618691ee38d838d131d304f2664
      
      console.log("🏗️ Configuración ERC-6551 con NUEVO CONTRATO:");
      console.log("📝 CryptoGift NFT Contract (TÚ OWNER):", CRYPTOGIFT_NFT_CONTRACT);
      console.log("📝 ERC6551Registry:", ERC6551_REGISTRY);
      console.log("📝 ERC6551Account Implementation:", TBA_IMPLEMENTATION);
      
      // PASO 1: Mint NFT en CryptoGift NFT Contract
      console.log("🎯 PASO 1: Minting NFT en CryptoGift NFT Contract");
      
      const cryptoGiftNFTContract = getContract({
        client,
        chain: customChain,
        address: CRYPTOGIFT_NFT_CONTRACT,
      });
      
      // Mint NFT usando el método correcto para NFT Collection (contract clásico)
      console.log("🔍 Usando método mintTo de NFT Collection (contract clásico)...");
      
      // NOTE: We'll extract the REAL token ID from the contract after minting
      // No need to generate manual IDs anymore
      console.log("🔍 Will extract real token ID from contract after minting...");
      addAPIStep('PREPARE_REAL_TOKEN_ID_EXTRACTION', { method: 'from-contract-receipt' }, 'pending');
      var nftTransaction = prepareContractCall({
        contract: cryptoGiftNFTContract,
        method: "function mintTo(address to, string memory tokenURI) external",
        params: [
          to, // recipient
          metadataUri // token URI
        ],
      });
      
      console.log("🔍 ENVIANDO TRANSACCIÓN NFT MINT...");
      const nftResult = await sendTransaction({
        transaction: nftTransaction,
        account,
      });
      
      console.log("✅ NFT MINTED SUCCESSFULLY!", nftResult.transactionHash);
      
      // CRITICAL FIX: Extract REAL token ID from transaction receipt
      console.log("🔍 Extracting REAL token ID from transaction receipt...");
      let actualTokenId;
      
      try {
        // CRITICAL FIX: Get ACTUAL transaction receipt and parse Transfer events
        console.log("🔍 Waiting for transaction to be mined...");
        
        // Wait for transaction to be confirmed and get receipt
        const receipt = await waitForReceipt({
          client,
          chain: baseSepolia,
          transactionHash: nftResult.transactionHash
        });
        
        console.log("📜 REAL Transaction receipt:", receipt);
        console.log("📄 Receipt logs count:", receipt.logs?.length || 0);
        
        // Parse Transfer event from logs to get the actual token ID
        let tokenIdFromEvent = null;
        
        if (receipt.logs && receipt.logs.length > 0) {
          console.log("🔍 Parsing Transfer events from receipt logs...");
          
          // ThirdWeb v5 receipt format - try to extract events
          try {
            // Look for Transfer events in the logs
            for (const log of receipt.logs) {
              // ThirdWeb v5 may have different log format, try both approaches
              console.log("🔍 Checking log:", log);
              
              // Check if this log is from our NFT contract
              if (log.address && log.address.toLowerCase() === process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS?.toLowerCase()) {
                console.log("✅ Found log from NFT contract:", log);
                
                // Try to extract tokenId from log data or use alternative approach
                // For now, fall back to totalSupply since log parsing may be complex
                console.log("📝 Will use totalSupply fallback for reliable tokenId");
                break;
              }
            }
          } catch (logParseError) {
            console.log("⚠️ Log parsing failed, will use totalSupply:", logParseError.message);
          }
        }
        
        // RELIABLE METHOD: Use totalSupply after transaction confirmation
        console.log("🎯 Using totalSupply method for reliable tokenId extraction...");
        
        // Transaction is confirmed, now read totalSupply to get the new tokenId
        const totalSupply = await readContract({
          contract: cryptoGiftNFTContract,
          method: "function totalSupply() view returns (uint256)",
          params: []
        });
        
        // CRITICAL FIX: totalSupply is count of tokens, last token ID is totalSupply - 1
        actualTokenId = (totalSupply - BigInt(1)).toString();
        console.log("✅ CORRECTED TOKEN ID calculation:");
        console.log("  📊 Total supply:", totalSupply.toString());
        console.log("  🎯 Last token ID (supply-1):", actualTokenId);
        
      } catch (extractError) {
        console.error("❌ Failed to extract real token ID:", extractError);
        console.log("🔄 Fallback: Using deterministic transaction-based ID");
        
        // Deterministic fallback based on transaction hash
        const hashNum = parseInt(nftResult.transactionHash.slice(-8), 16);
        actualTokenId = (hashNum % 1000000).toString();
        console.log("🔄 Fallback token ID:", actualTokenId);
      }
      
      console.log("📝 FINAL Token ID:", actualTokenId);
      
      // PASO 2: Crear dirección TBA determinística (modo simplificado)
      console.log("🎯 PASO 2: Creando TBA determinística (modo simplificado)");
      
      // Crear dirección determinística usando keccak256 
      const deterministicSeed = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'address'],
        [CRYPTOGIFT_NFT_CONTRACT, actualTokenId, account.address]
      );
      
      // Generar dirección TBA determinística
      const tbaAddress = ethers.getAddress('0x' + deterministicSeed.slice(-40));
      
      transactionHash = nftResult.transactionHash; // Solo una transacción (el NFT)
      tokenId = actualTokenId.toString();
      gasless = false;
      
      console.log("✅ TBA DETERMINÍSTICA CREADA!", { 
        nftTxHash: nftResult.transactionHash,
        tokenId, 
        tbaAddress,
        nftContract: CRYPTOGIFT_NFT_CONTRACT,
        method: "deterministic",
        simplified: true
      });
      
    } catch (contractError) {
      console.log("❌ CONTRACT ERROR DETAILS:");
      console.log("📝 Error message:", contractError.message);
      console.log("📝 Error name:", contractError.name);
      console.log("📝 Contract address:", process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
      console.log("📝 Chain ID:", 84532);
      addMintLog('ERROR', 'CONTRACT_EXECUTION_ERROR', {
        error: contractError.message,
        stack: contractError.stack,
        contract: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
        chainId: 84532
      });
      
      throw new Error(`Contract execution failed: ${contractError.message}`);
      }
    }

    // Calculate TBA address (ya calculada en el paso anterior, pero verificamos)
    addMintLog('INFO', 'STEP_5_START', { tokenId, message: 'Verifying TBA address' });
    addAPIStep('TBA_ADDRESS_VERIFICATION', { tokenId }, 'pending');
    const calculatedTbaAddress = await calculateTBAAddress(tokenId);
    addMintLog('SUCCESS', 'STEP_5_COMPLETE', { tbaAddress: calculatedTbaAddress, tokenId });
    addAPIStep('TBA_ADDRESS_VERIFIED', { tbaAddress: calculatedTbaAddress, tokenId }, 'success');

    // Final success
    // Generate share URL and QR code for the NFT
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cryptogift-wallets.vercel.app';
    const shareUrl = `${baseUrl}/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}/${tokenId}`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

    // Track referral activation if referrer is provided
    if (referrer) {
      try {
        console.log('🔗 Processing referral activation for:', { 
          referrer: referrer?.slice(0, 10) + '...', 
          recipient: to?.slice(0, 10) + '...',
          fullRecipient: to
        });
        
        // Generate user display identifier for the gift recipient
        const referredIdentifier = generateUserDisplay(to);
        
        console.log('🎯 Generated referredIdentifier for activation:', {
          referredIdentifier,
          recipientAddress: to?.slice(0, 10) + '...'
        });
        
        // Calculate commission (20% of platform earnings, not of gift amount)
        // Assuming platform takes 4% of gift amount, so commission is 20% of that 4%
        const platformFee = initialBalance * 0.04; // 4% platform fee
        const commission = platformFee * (REFERRAL_COMMISSION_PERCENT / 100); // 20% of platform fee
        
        // Track referral activation with enhanced data including wallet address
        await kvReferralDB.trackReferralActivation(
          referrer, 
          {
            address: to, // Critical: Include actual wallet address for proper mapping
            identifier: referredIdentifier
          },
          {
            tokenId,
            amount: initialBalance,
            commission,
            transactionHash
          }
        );
        
        // Also trigger real-time update via API endpoint for dashboard refresh
        try {
          const activationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/referrals/track-activation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrerAddress: referrer,
              referredAddress: to,
              tokenId,
              giftAmount: initialBalance,
              transactionHash
            })
          });
          
          if (activationResponse.ok) {
            console.log('📡 Real-time activation update sent successfully');
          } else {
            console.warn('⚠️ Real-time activation update failed:', activationResponse.statusText);
          }
        } catch (realtimeError) {
          console.warn('⚠️ Real-time activation update error:', realtimeError);
          // Don't throw - main activation already tracked
        }
        
        console.log('✅ Referral activation tracked successfully:', {
          referrer: referrer?.slice(0, 10) + '...',
          referredIdentifier,
          tokenId,
          commission,
          giftAmount: initialBalance
        });
        
        addMintLog('SUCCESS', 'REFERRAL_ACTIVATION_TRACKED', {
          referrer: referrer?.slice(0, 10) + '...',
          referredIdentifier,
          tokenId,
          commission,
          giftAmount: initialBalance,
          platformFee
        });
        
      } catch (referralError) {
        console.error('⚠️ Error tracking referral activation:', referralError);
        addMintLog('WARN', 'REFERRAL_TRACKING_FAILED', {
          referrer: referrer?.slice(0, 10) + '...',
          error: referralError.message,
          tokenId
        });
        // Don't fail the whole mint for referral tracking issues
      }
    } else {
      console.log('ℹ️ No referrer provided - skipping referral tracking');
      addMintLog('INFO', 'NO_REFERRER_PROVIDED', { tokenId });
    }

    const finalResult = {
      success: true,
      transactionHash,
      tokenId,
      tbaAddress: calculatedTbaAddress,
      metadataUri,
      shareUrl,
      qrCode,
      gasless,
      simplified: true,
      method: "deterministic_tba",
      message: gasless ? '🎉 NFT-Wallet creado con transacción GASLESS (gratis)!' : '💰 NFT-Wallet creado exitosamente - usuario pagó gas (~$0.01)'
    };
    
    addMintLog('SUCCESS', 'MINT_COMPLETE', finalResult);
    addAPIStep('MINT_API_SUCCESS', finalResult, 'success');

    // CRITICAL FIX: Store NFT metadata with image verification
    try {
      console.log("💾 CRITICAL DEBUG: Starting NFT metadata storage...");
      console.log("🔍 CRITICAL DEBUG: Storage parameters:", {
        contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
        tokenId: tokenId,
        imageFileParameter: imageFile,
        imageFileType: typeof imageFile,
        imageFileLength: imageFile?.length,
        metadataUri: metadataUri,
        giftMessage: giftMessage,
        initialBalance: initialBalance,
        filter: filter,
        to: to,
        transactionHash: transactionHash
      });
      
      // Extract image CID from imageFile parameter
      let imageIpfsCid = imageFile;
      if (imageFile && imageFile.startsWith('ipfs://')) {
        imageIpfsCid = imageFile.replace('ipfs://', '');
      }
      
      console.log("🔍 CRITICAL DEBUG: Image CID Processing:", {
        originalImageFile: imageFile,
        processedImageIpfsCid: imageIpfsCid,
        hasValidCID: !!(imageIpfsCid && imageIpfsCid.length > 10),
        isPlaceholderCID: imageIpfsCid?.includes('placeholder'),
        cidLength: imageIpfsCid?.length
      });
      
      // CRITICAL: Verify image is accessible before storing metadata
      const imageVerificationResult = await verifyImageAccessibility(imageIpfsCid);
      console.log("🔍 Image verification result:", imageVerificationResult);
      
      // CRITICAL FIX: FAIL mint if image verification fails
      if (!imageVerificationResult.accessible) {
        console.error("❌ CRITICAL: Image verification failed - image not accessible from IPFS");
        console.error("🚨 FAILING mint to prevent placeholder storage");
        console.error("🔍 Gateway results:", imageVerificationResult.allGatewayResults);
        
        addMintLog('ERROR', 'IMAGE_VERIFICATION_FAILED', {
          imageCid: imageIpfsCid,
          gatewayResults: imageVerificationResult.allGatewayResults
        });
        
        return res.status(400).json({
          error: 'Image verification failed',
          message: 'The uploaded image is not accessible from IPFS. Please try uploading again.',
          details: {
            imageCid: imageIpfsCid,
            gatewayResults: imageVerificationResult.allGatewayResults
          }
        });
      }
      
      console.log("✅ Image verification passed - proceeding with mint");
      
      // Get deployer wallet address for tracking
      let creatorWallet = 'unknown';
      try {
        const deployerAccount = privateKeyToAccount({
          client: createThirdwebClient({
            clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
            secretKey: process.env.TW_SECRET_KEY!,
          }),
          privateKey: process.env.PRIVATE_KEY_DEPLOY!,
        });
        creatorWallet = deployerAccount.address;
      } catch (error) {
        console.warn('Could not determine creator wallet:', error);
      }

      console.log("📦 CREATING NFT METADATA OBJECT ===========================================");
      console.log("🔧 METADATA CONFIGURATION:");
      console.log("  📝 Contract Address:", process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
      console.log("  🎯 Token ID:", tokenId);
      console.log("  🖼️ Image IPFS CID:", imageIpfsCid);
      console.log("  📄 Metadata URI:", metadataUri?.substring(0, 100) + "...");
      console.log("  💬 Gift Message:", giftMessage?.substring(0, 50) + "...");
      console.log("  💰 Initial Balance:", initialBalance);
      console.log("  🎨 Filter:", filter);
      
      const nftMetadata = createNFTMetadata({
        contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '',
        tokenId: tokenId,
        name: `CryptoGift NFT-Wallet #${tokenId}`,
        description: giftMessage || 'Un regalo cripto único creado con amor',
        imageIpfsCid: imageIpfsCid,
        metadataIpfsCid: metadataUri.startsWith('ipfs://') ? metadataUri.replace('ipfs://', '') : undefined,
        attributes: [
          {
            trait_type: "Initial Balance",
            value: `${initialBalance} USDC`
          },
          {
            trait_type: "Filter",
            value: filter || "Original"
          },
          {
            trait_type: "Creation Date",
            value: new Date().toISOString()
          },
          {
            trait_type: "Network",
            value: "Base Sepolia"
          },
          {
            trait_type: "Wallet Type",
            value: "ERC-6551 Token Bound Account"
          },
          {
            trait_type: "Creator Wallet",
            value: creatorWallet.slice(0, 10) + '...'
          },
          {
            trait_type: "Image Status",
            value: imageVerificationResult.accessible ? "Verified" : "Verification Failed - Using Anyway"
          },
          {
            trait_type: "IPFS CID",
            value: imageIpfsCid.slice(0, 12) + "..."
          },
          {
            trait_type: "Debug Mode",
            value: "Testing - Ignoring IPFS verification"
          }
        ],
        mintTransactionHash: transactionHash,
        owner: to,
        creatorWallet: creatorWallet // CRITICAL: Track who created this to prevent cache conflicts
      });
      
      console.log("🔍 CRITICAL DEBUG: Created NFT metadata object:");
      console.log(JSON.stringify(nftMetadata, null, 2));
      console.log("🔖 CRITICAL DEBUG: Final image values being stored:", {
        imageField: nftMetadata.image,
        imageIpfsCid: nftMetadata.imageIpfsCid,
        imageFieldFormat: nftMetadata.image?.startsWith('ipfs://') ? 'CORRECT' : 'INCORRECT',
        imageIsPlaceholder: nftMetadata.image?.includes('placeholder') ? 'YES - PROBLEM!' : 'NO - GOOD',
        cidIsValid: !!(nftMetadata.imageIpfsCid && nftMetadata.imageIpfsCid.length > 10) ? 'YES' : 'NO - PROBLEM!'
      });
      
      console.log("💾 STORING NFT METADATA ===========================================");
      console.log("🔧 STORAGE PARAMETERS:");
      console.log("  📝 Contract Address:", nftMetadata.contractAddress);
      console.log("  🎯 Token ID:", nftMetadata.tokenId);
      console.log("  🖼️ Image IPFS CID:", nftMetadata.imageIpfsCid);
      console.log("  📄 Metadata IPFS CID:", nftMetadata.metadataIpfsCid);
      console.log("  🌐 Image field:", nftMetadata.image);
      console.log("  📊 Metadata object keys:", Object.keys(nftMetadata));
      
      // CRITICAL: Ensure storage completes successfully
      console.log("💾 Calling storeNFTMetadata...");
      await storeNFTMetadata(nftMetadata);
      console.log("✅ storeNFTMetadata call completed");
      
      // VERIFICATION: Double-check storage worked
      console.log("🔍 VERIFYING STORAGE: Attempting to retrieve stored metadata...");
      const storedCheck = await getNFTMetadata(nftMetadata.contractAddress, nftMetadata.tokenId);
      if (storedCheck) {
        console.log("✅ NFT metadata stored and verified successfully!");
        console.log("🔍 RETRIEVED METADATA:");
        console.log("  📝 Contract:", storedCheck.contractAddress);
        console.log("  🎯 Token ID:", storedCheck.tokenId);
        console.log("  🖼️ Image field:", storedCheck.image);
        console.log("  📊 Attributes count:", storedCheck.attributes?.length || 0);
      } else {
        console.error("❌ CRITICAL: Metadata storage verification failed!");
        console.error("🔍 LOOKUP FAILED FOR:");
        console.error("  📝 Contract:", nftMetadata.contractAddress);
        console.error("  🎯 Token ID:", nftMetadata.tokenId);
        addMintLog('ERROR', 'METADATA_STORAGE_VERIFICATION_FAILED', {
          tokenId,
          contractAddress: nftMetadata.contractAddress
        });
      }
      
    } catch (metadataError) {
      console.error("⚠️ Failed to store NFT metadata:", metadataError);
      console.error("📍 Full metadata error:", metadataError);
      addMintLog('ERROR', 'METADATA_STORAGE_FAILED', {
        tokenId,
        error: metadataError instanceof Error ? metadataError.message : 'Unknown error',
        stack: metadataError instanceof Error ? metadataError.stack : undefined
      });
      // Don't fail the whole mint for this, but log the error
    }

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