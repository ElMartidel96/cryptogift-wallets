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
    
    // FIXED: Generate UNIQUE neutral address per tokenId using deterministic derivation
    if (process.env.PRIVATE_KEY_DEPLOY) {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOY);
      const baseAddress = wallet.address;
      
      // Create unique neutral address per token using HDWallet-style derivation
      const seed = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'string'],
        [baseAddress, tokenId, 'NEUTRAL_CUSTODY_V1']
      );
      
      // Generate unique private key from seed
      const neutralPrivateKey = ethers.keccak256(seed);
      const neutralWallet = new ethers.Wallet(neutralPrivateKey);
      const uniqueNeutralAddress = neutralWallet.address;
      
      console.log(`🤖 SERVER: Generated UNIQUE neutral address for token ${tokenId}: ${uniqueNeutralAddress}`);
      console.log(`🔗 SERVER: Derived from base deployer: ${baseAddress}`);
      return uniqueNeutralAddress;
    } else {
      // Generate deterministic fallback unique per token
      const seed = ethers.solidityPackedKeccak256(
        ['string', 'uint256'],
        ['FALLBACK_NEUTRAL_V1', tokenId]
      );
      const fallbackAddress = ethers.getAddress('0x' + ethers.keccak256(seed).slice(-40));
      console.log(`🤖 SERVER: Generated deterministic fallback neutral for token ${tokenId}: ${fallbackAddress}`);
      return fallbackAddress;
    }
  } catch (error) {
    console.warn('⚠️ SERVER: Could not generate unique neutral address, using deterministic fallback');
    const { ethers } = require("ethers");
    const seed = ethers.solidityPackedKeccak256(['string', 'uint256'], ['ERROR_FALLBACK_V1', tokenId]);
    const fallbackAddress = ethers.getAddress('0x' + ethers.keccak256(seed).slice(-40));
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