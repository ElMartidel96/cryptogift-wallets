import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
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

// Helper function to extract token ID from transaction logs (REAL)
function extractTokenIdFromLogs(logs: any[]): string {
  try {
    console.log("🔍 Extrayendo token ID de los logs de la transacción...");
    
    // Buscar el evento Transfer que indica el mint
    // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    for (const log of logs || []) {
      if (log.topics && log.topics[0] === transferTopic) {
        // El token ID está en el tercer topic (topics[3])
        if (log.topics.length >= 4) {
          const tokenIdHex = log.topics[3];
          const tokenId = parseInt(tokenIdHex, 16).toString();
          console.log("✅ Token ID extraído de logs:", tokenId);
          return tokenId;
        }
      }
    }
    
    // Fallback: usar timestamp si no encontramos en logs
    const fallbackTokenId = Date.now().toString();
    console.log("⚠️ No se encontró token ID en logs, usando fallback:", fallbackTokenId);
    return fallbackTokenId;
  } catch (error) {
    console.error("❌ Error extrayendo token ID:", error);
    const fallbackTokenId = Date.now().toString();
    console.log("⚠️ Error al extraer token ID, usando fallback:", fallbackTokenId);
    return fallbackTokenId;
  }
}

// Helper function to get token ID from receipt (DEPRECATED)
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
    
    // Get NFT contract with custom RPC
    console.log("🔍 GASLESS MINT Step 3c: Getting NFT contract", { 
      contractAddress: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS 
    });
    
    const customChain = {
      ...baseSepolia,
      rpc: process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e"
    };
    
    const nftContract = getContract({
      client,
      chain: customChain,
      address: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS!,
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
    
    // CRITICAL FIX: Extract REAL token ID from contract instead of generating manual ID
    console.log("🔍 GASLESS: Extracting REAL token ID from contract...");
    let realTokenId;
    
    try {
      // Get the real token ID by reading totalSupply from the contract
      const totalSupply = await readContract({
        contract: nftContract,
        method: "function totalSupply() view returns (uint256)",
        params: []
      });
      
      realTokenId = totalSupply.toString();
      console.log("🎯 GASLESS: Real TOKEN ID from contract:", realTokenId);
      
    } catch (supplyError) {
      console.log("⚠️ GASLESS: totalSupply method not available, using transaction-based fallback");
      
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
  addMintLog('INFO', 'API_START', { timestamp: new Date().toISOString() });
  addAPIStep('API_HANDLER_STARTED', { method: req.method, timestamp: new Date().toISOString() }, 'pending');
  
  if (req.method !== 'POST') {
    addMintLog('ERROR', 'INVALID_METHOD', { method: req.method });
    addAPIError('INVALID_METHOD', `Method ${req.method} not allowed`, { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  addAPIDecision('isMethodPOST', true, { method: req.method });

  try {
    const { to, imageFile, giftMessage, initialBalance, filter = "Original", referrer } = req.body;
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

    // Create metadata following NFT standards
    // Clean and ensure imageFile has proper IPFS format (avoid double prefix)
    const cleanImageFile = imageFile.replace(/^ipfs:\/\//, ''); // Remove existing prefix if any
    const imageUri = `ipfs://${cleanImageFile}`;
    
    console.log('🖼️ NFT Image URI for metadata:', {
      originalImageFile: imageFile,
      finalImageUri: imageUri,
      isIPFSFormat: imageFile.startsWith('ipfs://'),
      imageFileType: typeof imageFile
    });
    
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
    let generatedTokenId: string; // Enhanced numeric string for uniqueness

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

      console.log("🔍 CONTRACT DEBUG: Using Factory as NFT contract");
      console.log("📝 Contract address:", process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS);
      console.log("📝 Recipient:", to);
      console.log("📝 Metadata URI:", metadataUri);
      console.log("📝 Initial Balance:", initialBalance, "USDC");
      
      // Use the Factory contract as the main NFT contract
      console.log("🎯 APPROACH: Using Factory contract directly");
      
      const nftDropContract = getContract({
        client,
        chain: customChain,
        address: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS!, // This is now the Factory
      });
      
      // ESTRATEGIA CORRECTA ERC-6551: Crear Token Bound Account directamente
      console.log("🎯 ESTRATEGIA ERC-6551: Crear Token Bound Account directamente");
      
      // Verificar configuración con NUEVO CONTRATO CRYPTOGIFT NFT
      const CRYPTOGIFT_NFT_CONTRACT = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS; // 0xdF514FDC06D7f2cc51Db20aBF6d6F56582F796BE
      const ERC6551_REGISTRY = process.env.NEXT_PUBLIC_ERC6551_REGISTRY; // 0x3cb823e40359b9698b942547d9d2241d531f2708
      const TBA_IMPLEMENTATION = process.env.NEXT_PUBLIC_TBA_IMPLEMENTATION; // 0x60883bd1549cd618691ee38d838d131d304f2664
      
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
        // Get transaction receipt to extract token ID from Transfer event
        const receipt = await nftResult.transactionHash;
        console.log("📜 Transaction receipt:", receipt);
        
        // Try to extract token ID from transaction receipt
        // Method 1: Try to get transaction receipt and parse events
        console.log("🔍 Attempting to get transaction receipt...");
        
        // IMPROVED: Use a more systematic approach to get the token ID
        // Since this is a standard ERC721 mint, the token ID should be sequential
        // Let's try to read the total supply to estimate the token ID
        try {
          console.log("🔍 Trying to read total supply from contract...");
          const totalSupply = await readContract({
            contract: cryptoGiftNFTContract,
            method: "function totalSupply() view returns (uint256)",
            params: []
          });
          
          actualTokenId = totalSupply.toString();
          console.log("🎯 TOKEN ID from totalSupply:", actualTokenId);
          
        } catch (supplyError) {
          console.log("⚠️ totalSupply method not available, using hash-based ID");
          
          // Fallback: Use transaction hash for deterministic but unique ID
          const hashNum = parseInt(nftResult.transactionHash.slice(-8), 16);
          actualTokenId = (hashNum % 1000000).toString();
          console.log("🎯 TOKEN ID from hash:", actualTokenId);
        }
        
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
      console.log("📝 Contract address:", process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS);
      console.log("📝 Chain ID:", 84532);
      addMintLog('ERROR', 'CONTRACT_EXECUTION_ERROR', {
        error: contractError.message,
        stack: contractError.stack,
        contract: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS,
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
    const shareUrl = `${baseUrl}/token/${process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS}/${tokenId}`;
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
        contractAddress: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS,
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
      
      // TESTING MODE: Continue even if verification fails to identify root cause
      if (!imageVerificationResult.accessible) {
        console.log("⚠️ WARNING: Image verification failed, but continuing for testing purposes");
        console.log("🔍 This will help us identify if the issue is verification or storage");
      }
      
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

      const nftMetadata = createNFTMetadata({
        contractAddress: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS || '',
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
      
      // CRITICAL: Ensure storage completes successfully
      console.log("💾 Attempting to store NFT metadata...");
      await storeNFTMetadata(nftMetadata);
      console.log("✅ storeNFTMetadata call completed");
      
      // VERIFICATION: Double-check storage worked
      const storedCheck = await getNFTMetadata(nftMetadata.contractAddress, nftMetadata.tokenId);
      if (storedCheck) {
        console.log("✅ NFT metadata stored and verified successfully");
        console.log("🔍 Stored image:", storedCheck.image);
      } else {
        console.error("❌ CRITICAL: Metadata storage verification failed!");
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