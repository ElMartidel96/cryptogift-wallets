// SERVER-SIDE ONLY CONSTANTS - DO NOT IMPORT IN CLIENT COMPONENTS
// This file contains functions that require private keys and should only be used in API routes

/**
 * SERVER-ONLY: Generate neutral address for gift custodial
 * This function calculates the actual deployer address from private key
 * CRITICAL: Only use in API routes, never in client components
 */
export const generateNeutralGiftAddressServer = (tokenId: string): string => {
  // SECURITY: This function should only be called server-side
  if (typeof window !== 'undefined') {
    throw new Error('❌ SECURITY VIOLATION: generateNeutralGiftAddressServer called on client-side');
  }

  try {
    const { ethers } = require("ethers");
    
    // Calculate deployer address from private key to ensure consistency
    if (process.env.PRIVATE_KEY_DEPLOY) {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOY);
      const deployerAddress = wallet.address;
      
      console.log(`🤖 SERVER: Using calculated deployer as neutral custodial for token ${tokenId}: ${deployerAddress}`);
      return deployerAddress;
    } else {
      // Fallback for environments without private key
      const fallbackAddress = '0x75341Ce1E98c24F33b0AB0e5ABE3AaaC5b0A8f01';
      console.log(`🤖 SERVER: Using fallback deployer as neutral custodial for token ${tokenId}: ${fallbackAddress}`);
      return fallbackAddress;
    }
  } catch (error) {
    console.warn('⚠️ SERVER: Could not calculate deployer address, using fallback');
    const fallbackAddress = '0x75341Ce1E98c24F33b0AB0e5ABE3AaaC5b0A8f01';
    return fallbackAddress;
  }
};

/**
 * SERVER-ONLY: Check if address is a neutral gift address (server version)
 */
export const isNeutralGiftAddressServer = (address: string, tokenId: string): boolean => {
  const expectedNeutral = generateNeutralGiftAddressServer(tokenId);
  return address.toLowerCase() === expectedNeutral.toLowerCase();
};