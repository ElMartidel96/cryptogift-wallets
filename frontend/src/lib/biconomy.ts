import { createSmartAccountClient, BiconomySmartAccountV2 } from "@biconomy/account";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Biconomy configuration for Base Sepolia
export const biconomyConfig = {
  chainId: 84532, // Base Sepolia
  rpcUrl: "https://sepolia.base.org",
  // These will be set from environment variables
  paymasterApiKey: process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY!,
  bundlerUrl: process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL!,
};

// Create Biconomy Smart Account
export async function createBiconomySmartAccount(privateKey: string) {
  try {
    // Create EOA from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    // Create Smart Account
    const smartAccount = await createSmartAccountClient({
      signer: walletClient,
      biconomyPaymasterApiKey: biconomyConfig.paymasterApiKey,
      bundlerUrl: biconomyConfig.bundlerUrl,
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
    // Build user operation
    const userOp = await smartAccount.buildUserOp([transaction]);
    
    // Send user operation (gasless)
    const userOpResponse = await smartAccount.sendUserOp(userOp);
    
    // Wait for transaction to be mined
    const receipt = await userOpResponse.wait();
    
    console.log("Gasless transaction successful:", receipt.transactionHash);
    return receipt;
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