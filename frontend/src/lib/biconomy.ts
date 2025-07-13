import { createSmartAccountClient, BiconomySmartAccountV2 } from "@biconomy/account";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Biconomy configuration for Base Sepolia - CURRENT BEST PRACTICES 2025
export const biconomyConfig = {
  chainId: 84532, // Base Sepolia
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e",
  
  // PAYMASTER API KEY
  paymasterApiKey: process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY || "l0I7KBcia.2e5af1b9-52f2-43d8-aaad-bb5c8275d1a7",
  
  // BUNDLER URL - REQUIRED for AA transactions
  bundlerUrl: process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
  
  // PAYMASTER URL
  paymasterUrl: process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL || "https://paymaster.biconomy.io/api/v2/84532/l0I7KBcia.2e5af1b9-52f2-43d8-aaad-bb5c8275d1a7",
};

// Create Biconomy Smart Account
export async function createBiconomySmartAccount(privateKey: string) {
  try {
    console.log('🔧 BICONOMY CONFIG - CURRENT BEST PRACTICES 2025:', {
      chainId: biconomyConfig.chainId,
      rpcUrl: biconomyConfig.rpcUrl,
      paymasterApiKey: biconomyConfig.paymasterApiKey.substring(0, 10) + '...',
      bundlerUrl: biconomyConfig.bundlerUrl,
      paymasterUrl: biconomyConfig.paymasterUrl,
      architecture: 'Bundler + Paymaster (Complete AA Stack)',
    });
    // Ensure private key has 0x prefix and is properly formatted
    const formattedPrivateKey = privateKey.startsWith('0x') 
      ? privateKey as `0x${string}`
      : `0x${privateKey}` as `0x${string}`;
    
    console.log('🔍 Private key format check:', {
      original: privateKey.substring(0, 10) + '...',
      formatted: formattedPrivateKey.substring(0, 10) + '...',
      hasPrefix: privateKey.startsWith('0x'),
      length: privateKey.length
    });
    
    // Create EOA from private key
    const account = privateKeyToAccount(formattedPrivateKey);
    
    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    // Create Smart Account using current best practices
    const smartAccount = await createSmartAccountClient({
      signer: walletClient,
      biconomyPaymasterApiKey: biconomyConfig.paymasterApiKey,
      bundlerUrl: biconomyConfig.bundlerUrl, // REQUIRED for transactions
      paymasterUrl: biconomyConfig.paymasterUrl,
      rpcUrl: biconomyConfig.rpcUrl,
      chainId: biconomyConfig.chainId,
    });

    console.log("Smart Account created:", await smartAccount.getAccountAddress());
    return smartAccount;
  } catch (error) {
    console.error("Error creating Biconomy Smart Account:", error);
    throw error;
  }
}

// Send gasless transaction
export async function sendGaslessTransaction(
  smartAccount: BiconomySmartAccountV2,
  transaction: any
) {
  try {
    console.log("Preparing gasless transaction:", transaction);
    
    // CRITICAL FIX: ThirdWeb v5 returns data as async function, we need to call it
    let transactionData = "0x";
    if (transaction.data) {
      if (typeof transaction.data === 'function') {
        console.log("🔧 Resolving ThirdWeb v5 async data function...");
        transactionData = await transaction.data();
        console.log("✅ Data resolved:", transactionData.substring(0, 20) + "...");
      } else {
        transactionData = transaction.data;
      }
    }
    
    // Normalize transaction format for Biconomy
    const normalizedTx = {
      to: transaction.to || transaction.address,
      data: transactionData,
      value: transaction.value || "0x0",
    };
    
    console.log("Normalized transaction:", {
      to: normalizedTx.to,
      data: normalizedTx.data.substring(0, 20) + "...",
      value: normalizedTx.value
    });
    
    // Build user operation
    const userOp = await smartAccount.buildUserOp([normalizedTx]);
    
    // Send user operation (gasless)
    const userOpResponse = await smartAccount.sendUserOp(userOp);
    
    // Wait for transaction to be mined
    const receipt = await userOpResponse.wait();
    
    console.log("Gasless transaction successful:", receipt.userOpHash);
    return {
      transactionHash: receipt.userOpHash,
      blockNumber: receipt.receipt?.blockNumber || 0,
      logs: receipt.receipt?.logs || [],
      receipt: receipt.receipt
    };
  } catch (error) {
    console.error("Error sending gasless transaction:", error);
    throw error;
  }
}

// Check if Biconomy configuration is complete
export function validateBiconomyConfig() {
  const paymasterKey = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY || biconomyConfig.paymasterApiKey;
  const paymasterUrl = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL || biconomyConfig.paymasterUrl;
  const bundlerUrl = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL || biconomyConfig.bundlerUrl;
  
  if (!paymasterKey) {
    console.error('❌ Missing Biconomy Paymaster API Key');
    return false;
  }
  
  if (!bundlerUrl) {
    console.error('❌ Missing Biconomy Bundler URL');
    return false;
  }
  
  if (!paymasterUrl) {
    console.error('❌ Missing Biconomy Paymaster URL');
    return false;
  }
  
  console.log('✅ Biconomy configuration validated');
  console.log(`🔧 Bundler URL: ${bundlerUrl.substring(0, 50)}...`);
  console.log(`💰 Paymaster URL: ${paymasterUrl.substring(0, 50)}...`);
  console.log(`🔑 API Key: ${paymasterKey.substring(0, 10)}...`);
  
  return true;
}