import { createSmartAccountClient, BiconomySmartAccountV2 } from "@biconomy/account";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Biconomy configuration for Base Sepolia
export const biconomyConfig = {
  chainId: 84532, // Base Sepolia
  rpcUrl: "https://sepolia.base.org",
  // FIXED: Separate bundler and paymaster URLs
  paymasterApiKey: process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY || "l0I7KBcia.2e5af1b9-52f2-43d8-aaad-bb5c8275d1a7",
  // BUNDLER URL (different from paymaster)
  bundlerUrl: process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
  // PAYMASTER URL 
  paymasterUrl: process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_URL || "https://paymaster.biconomy.io/api/v2/84532/l0I7KBcia.2e5af1b9-52f2-43d8-aaad-bb5c8275d1a7",
};

// Create Biconomy Smart Account
export async function createBiconomySmartAccount(privateKey: string) {
  try {
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

    // Create Smart Account with proper URLs
    const smartAccount = await createSmartAccountClient({
      signer: walletClient,
      biconomyPaymasterApiKey: biconomyConfig.paymasterApiKey,
      bundlerUrl: biconomyConfig.bundlerUrl, // Now uses correct bundler URL
      paymasterUrl: biconomyConfig.paymasterUrl, // Add paymaster URL if supported
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

// Check if paymaster is available
export function validateBiconomyConfig() {
  const required = [
    'NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY',
    'NEXT_PUBLIC_BICONOMY_BUNDLER_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Missing Biconomy environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}