/**
 * AUTO-RETURN CRON JOB API
 * Automated return of expired gifts via Vercel cron jobs
 * Secured endpoint with CRON_SECRET authentication
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createThirdwebClient, readContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { sendTransaction, waitForReceipt } from 'thirdweb/transaction';
import { 
  prepareReturnExpiredGiftCall,
  getEscrowContract,
  isGiftExpired,
  parseEscrowError
} from '../../../lib/escrowUtils';
import { ESCROW_ABI, ESCROW_CONTRACT_ADDRESS, type EscrowGift } from '../../../lib/escrowABI';

// Types
interface AutoReturnResponse {
  success: boolean;
  processed: number;
  returned: number;
  errors: number;
  results?: Array<{
    tokenId: string;
    status: 'returned' | 'skipped' | 'error';
    transactionHash?: string;
    error?: string;
  }>;
  error?: string;
  timestamp: number;
}

// Initialize ThirdWeb client
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!
});

// Cron authentication middleware
function authenticateCron(req: NextApiRequest): boolean {
  // Check for cron secret in headers
  const cronSecret = req.headers['x-cron-secret'] || req.headers.authorization?.replace('Bearer ', '');
  return cronSecret === process.env.CRON_SECRET;
}

// Get all expired gifts that haven't been returned
async function getExpiredGifts(): Promise<{
  gifts: Array<{ tokenId: string; gift: EscrowGift }>;
  error?: string;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const escrowContract = getEscrowContract();
    
    console.log('🔍 CRON AUTO-RETURN: Scanning for expired gifts...');
    
    // Get GiftCreated events to find all gifts
    // Note: In production, you might want to use a more efficient indexing approach
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100000); // Last ~100k blocks (~2 weeks on Base)
    
    // For now, we'll use a simplified approach - scan known token IDs
    // In production, you would want to use event indexing or a database
    const expiredGifts: Array<{ tokenId: string; gift: EscrowGift }> = [];
    
    // Scan last 1000 token IDs (this is a simplified approach)
    const maxTokenId = 1000;
    console.log(`📝 Scanning token IDs 1-${maxTokenId}...`);
    
    // Check each potential token ID
    for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
      try {
        // Get current gift data
        const giftData = await readContract({
          contract: escrowContract,
          method: "getGift",
          params: [BigInt(tokenId)]
        });
        
        const gift: EscrowGift = {
          creator: giftData.creator,
          expirationTime: giftData.expirationTime,
          nftContract: giftData.nftContract,
          tokenId: giftData.tokenId,
          passwordHash: giftData.passwordHash,
          status: giftData.status
        };
        
        // Only process gifts that are:
        // 1. Active (status === 0)
        // 2. Expired
        if (gift.status === 0 && isGiftExpired(gift.expirationTime)) {
          expiredGifts.push({ tokenId: tokenId.toString(), gift });
        }
        
      } catch (error) {
        // Gift doesn't exist or error reading - skip
        if (!error.message?.includes('Gift not found')) {
          console.warn(`⚠️ Failed to check gift ${tokenId}:`, error);
        }
      }
    }
    
    console.log(`⏰ Found ${expiredGifts.length} expired gifts ready for return`);
    
    return { gifts: expiredGifts };
    
  } catch (error: any) {
    console.error('❌ Failed to get expired gifts:', error);
    return { 
      gifts: [], 
      error: parseEscrowError(error) 
    };
  }
}

// Return a single expired gift
async function returnSingleGift(tokenId: string): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    const deployerAccount = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!
    });
    
    const returnTransaction = prepareReturnExpiredGiftCall(tokenId);
    
    const result = await sendTransaction({
      transaction: returnTransaction,
      account: deployerAccount
    });
    
    const receipt = await waitForReceipt({
      client,
      chain: baseSepolia,
      transactionHash: result.transactionHash
    });
    
    return {
      success: true,
      transactionHash: result.transactionHash
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: parseEscrowError(error)
    };
  }
}

// Process all expired gifts with rate limiting
async function processExpiredGifts(
  expiredGifts: Array<{ tokenId: string; gift: EscrowGift }>
): Promise<{
  processed: number;
  returned: number;
  errors: number;
  results: Array<{
    tokenId: string;
    status: 'returned' | 'error';
    transactionHash?: string;
    error?: string;
  }>;
}> {
  const results: Array<{
    tokenId: string;
    status: 'returned' | 'error';
    transactionHash?: string;
    error?: string;
  }> = [];
  
  let returned = 0;
  let errors = 0;
  
  // Process with rate limiting (max 5 concurrent, 1 second delay between batches)
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < expiredGifts.length; i += batchSize) {
    batches.push(expiredGifts.slice(i, i + batchSize));
  }
  
  console.log(`🔄 Processing ${expiredGifts.length} gifts in ${batches.length} batches`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    // Process batch in parallel
    const batchPromises = batch.map(async ({ tokenId, gift }) => {
      try {
        console.log(`⏳ Returning gift ${tokenId} to creator ${gift.creator.slice(0, 10)}...`);
        
        const result = await returnSingleGift(tokenId);
        
        if (result.success) {
          console.log(`✅ Gift ${tokenId} returned successfully: ${result.transactionHash}`);
          returned++;
          return {
            tokenId,
            status: 'returned' as const,
            transactionHash: result.transactionHash
          };
        } else {
          console.error(`❌ Failed to return gift ${tokenId}:`, result.error);
          errors++;
          return {
            tokenId,
            status: 'error' as const,
            error: result.error
          };
        }
        
      } catch (error: any) {
        console.error(`💥 Unexpected error returning gift ${tokenId}:`, error);
        errors++;
        return {
          tokenId,
          status: 'error' as const,
          error: parseEscrowError(error)
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Rate limiting: wait 1 second between batches (except last batch)
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return {
    processed: expiredGifts.length,
    returned,
    errors,
    results
  };
}

// Send webhook notification (optional)
async function sendWebhookNotification(summary: {
  processed: number;
  returned: number;
  errors: number;
  timestamp: number;
}) {
  if (!process.env.WEBHOOK_URL || process.env.WEBHOOK_URL === 'https://hooks.slack.com/services/optional') {
    return; // Skip webhook if not configured
  }
  
  try {
    const message = {
      text: `🔄 CryptoGift Auto-Return Summary`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*CryptoGift Auto-Return Job Completed*\n\n• Processed: ${summary.processed} expired gifts\n• Returned: ${summary.returned} successfully\n• Errors: ${summary.errors}\n• Timestamp: ${new Date(summary.timestamp).toISOString()}`
          }
        }
      ]
    };
    
    await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
  } catch (error) {
    console.warn('⚠️ Failed to send webhook notification:', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AutoReturnResponse>
) {
  const timestamp = Date.now();
  
  // Only allow POST requests (Vercel cron sends POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      processed: 0,
      returned: 0,
      errors: 0,
      error: 'Method not allowed',
      timestamp
    });
  }
  
  try {
    // Authenticate cron request
    if (!authenticateCron(req)) {
      return res.status(401).json({ 
        success: false,
        processed: 0,
        returned: 0,
        errors: 0,
        error: 'Unauthorized - invalid cron secret',
        timestamp
      });
    }
    
    // Validate required environment variables
    if (!process.env.PRIVATE_KEY_DEPLOY || !ESCROW_CONTRACT_ADDRESS || !process.env.NEXT_PUBLIC_RPC_URL) {
      return res.status(500).json({ 
        success: false,
        processed: 0,
        returned: 0,
        errors: 0,
        error: 'Server configuration error',
        timestamp
      });
    }
    
    console.log('⏰ CRON AUTO-RETURN: Job started at', new Date(timestamp).toISOString());
    
    // Get all expired gifts
    const expiredGiftsResult = await getExpiredGifts();
    
    if (expiredGiftsResult.error) {
      return res.status(500).json({
        success: false,
        processed: 0,
        returned: 0,
        errors: 1,
        error: expiredGiftsResult.error,
        timestamp
      });
    }
    
    const expiredGifts = expiredGiftsResult.gifts;
    
    // If no expired gifts, return early
    if (expiredGifts.length === 0) {
      console.log('✨ No expired gifts found, job completed successfully');
      
      return res.status(200).json({
        success: true,
        processed: 0,
        returned: 0,
        errors: 0,
        results: [],
        timestamp
      });
    }
    
    // Process all expired gifts
    const processResult = await processExpiredGifts(expiredGifts);
    
    // Send summary notification
    await sendWebhookNotification({
      processed: processResult.processed,
      returned: processResult.returned,
      errors: processResult.errors,
      timestamp
    });
    
    console.log('🎉 CRON AUTO-RETURN COMPLETED:', {
      processed: processResult.processed,
      returned: processResult.returned,
      errors: processResult.errors,
      duration: Date.now() - timestamp
    });
    
    return res.status(200).json({
      success: true,
      processed: processResult.processed,
      returned: processResult.returned,
      errors: processResult.errors,
      results: processResult.results,
      timestamp
    });
    
  } catch (error: any) {
    console.error('💥 CRON AUTO-RETURN ERROR:', error);
    
    return res.status(500).json({
      success: false,
      processed: 0,
      returned: 0,
      errors: 1,
      error: parseEscrowError(error),
      timestamp
    });
  }
}