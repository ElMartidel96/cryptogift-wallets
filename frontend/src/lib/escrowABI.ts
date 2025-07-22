/**
 * CRYPTOGIFT ESCROW CONTRACT ABI
 * Contract: 0x17a8296c2AE7212acC5E25Dd7f832E4B8A184b45
 * Network: Base Sepolia
 */

export const ESCROW_ABI = [
  // Core Escrow Functions
  "function createGift(uint256 tokenId, address nftContract, bytes32 passwordHash, uint256 timeframeDays, string calldata giftMessage) external",
  "function claimGift(uint256 tokenId, string calldata password, string calldata salt) external", 
  "function claimGiftFor(uint256 tokenId, string calldata password, string calldata salt, address recipient) external",
  "function returnExpiredGift(uint256 tokenId) external",
  
  // View Functions
  "function canClaimGift(uint256 tokenId) external view returns (bool canClaim, uint256 timeRemaining)",
  "function getGift(uint256 tokenId) external view returns (tuple(address creator, uint96 expirationTime, address nftContract, uint256 tokenId, bytes32 passwordHash, uint8 status))",
  
  // Time Constants
  "function FIFTEEN_MINUTES() external view returns (uint256)",
  "function SEVEN_DAYS() external view returns (uint256)", 
  "function FIFTEEN_DAYS() external view returns (uint256)",
  "function THIRTY_DAYS() external view returns (uint256)",
  
  // Access Control
  "function owner() external view returns (address)",
  "function isTrustedForwarder(address forwarder) external view returns (bool)",
  
  // Events
  "event GiftCreated(uint256 indexed tokenId, address indexed creator, address indexed nftContract, uint256 expirationTime, string giftMessage)",
  "event GiftClaimed(uint256 indexed tokenId, address indexed claimer, address indexed recipient)",
  "event GiftReturned(uint256 indexed tokenId, address indexed creator, uint256 timestamp)"
] as const;

// Type definitions for better TypeScript support
export interface EscrowGift {
  creator: string;
  expirationTime: bigint;
  nftContract: string;
  tokenId: bigint;
  passwordHash: string;
  status: number; // 0=Active, 1=Claimed, 2=Returned
}

export interface GiftCreatedEvent {
  tokenId: bigint;
  creator: string;
  nftContract: string;
  expirationTime: bigint;
  giftMessage: string;
}

export interface GiftClaimedEvent {
  tokenId: bigint;
  claimer: string;
  recipient: string;
}

export interface GiftReturnedEvent {
  tokenId: bigint;
  creator: string;
  timestamp: bigint;
}

// Contract address constant
export const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || process.env.ESCROW_CONTRACT_ADDRESS;

if (!ESCROW_CONTRACT_ADDRESS) {
  console.warn('⚠️ ESCROW_CONTRACT_ADDRESS not found in environment variables');
}