import { baseSepolia } from "thirdweb/chains";

export const ACTIVE_CHAIN = baseSepolia;

// Legacy environment variables (server-side)
export const NFT_DROP     = process.env.NFT_DROP || process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS!;
export const TOKEN_DROP   = process.env.TOKEN_DROP!;
export const EDITION_DROP = process.env.EDITION_DROP!;
export const TBA_IMPL     = process.env.TBA_IMPL!;
export const FACTORY_6551 = process.env.FACTORY_6551!;
export const THIRDWEB_KEY = process.env.NEXT_PUBLIC_TW_CLIENT_ID!;

// New constants for CryptoGift Wallets
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || "base-sepolia";

// Contract Addresses (Base Sepolia Testnet)
export const NFT_DROP_ADDRESS = process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS || "0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3";
export const REF_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_REF_TREASURY_ADDRESS || "0x75341Ce1E98c24F33b0AB0e5ABE3AaaC5b0A8f01"; // ReferralTreasury deployed address
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
export const ERC6551_REGISTRY = process.env.NEXT_PUBLIC_ERC6551_REGISTRY || "0x000000006551c19487814612e58FE06813775758"; // Standard ERC6551 Registry
export const TBA_IMPLEMENTATION = process.env.NEXT_PUBLIC_TBA_IMPLEMENTATION || "0x2D25602551487C3f3354dD80D76D54383A243358"; // TBA Implementation

// API Endpoints
export const ZEROX_ENDPOINT = process.env.NEXT_PUBLIC_ZEROX_ENDPOINT || "https://base.api.0x.org/swap/v2";
export const PERMIT2_ADDRESS = process.env.NEXT_PUBLIC_PERMIT2_ADDRESS || "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || "https://paymaster.thirdweb.com/v1";

// Configuration
export const CREATION_FEE_PERCENT = parseInt(process.env.NEXT_PUBLIC_CREATION_FEE_PERCENT || "4");
export const REFERRAL_COMMISSION_PERCENT = parseInt(process.env.NEXT_PUBLIC_REFERRAL_COMMISSION_PERCENT || "20");
export const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

// Biconomy Configuration
export const BICONOMY_PAYMASTER_API_KEY = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY;
export const BICONOMY_BUNDLER_URL = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL;

// Validation
export const validateEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_TW_CLIENT_ID',
    'NEXT_PUBLIC_CHAIN_ID',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}. Using fallback values.`);
  }

  // Log current configuration
  console.log('🔧 Environment Configuration:', {
    chainId: CHAIN_ID,
    nftDrop: NFT_DROP_ADDRESS,
    treasury: REF_TREASURY_ADDRESS,
    usdc: USDC_ADDRESS,
    clientId: THIRDWEB_KEY ? 'Configured' : 'Missing',
    biconomy: BICONOMY_PAYMASTER_API_KEY ? 'Configured' : 'Missing'
  });
};

// Common token addresses on Base
export const COMMON_TOKENS = {
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  WETH: "0x4200000000000000000000000000000000000006",
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
} as const;

// Supported filters for PhotoRoom
export const PHOTO_FILTERS = [
  { id: 'vintage', name: 'Vintage', description: 'Classic retro look' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Futuristic neon style' },
  { id: 'watercolor', name: 'Watercolor', description: 'Artistic paint effect' },
  { id: 'sketch', name: 'Sketch', description: 'Hand-drawn style' },
] as const;
