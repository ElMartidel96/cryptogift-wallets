import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { getReferralStats } from "../../lib/referralDatabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ 
        error: 'Missing required parameter: address' 
      });
    }

    // Initialize ThirdWeb Client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    // Get real referral statistics from database
    console.log('📊 Loading real referral stats for address:', address);
    const stats = await getReferralStats(address);
    
    const referralData = {
      balance: stats.totalEarnings.toString(),
      totalEarned: stats.totalEarnings.toString(),
      referralCount: stats.totalReferrals,
      pendingRewards: stats.pendingRewards.toString(),
      conversionRate: stats.conversionRate,
      activeReferrals: stats.activeReferrals,
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cryptogift-wallets.vercel.app'}/?ref=${address}`,
    };
    
    console.log('✅ Real referral data loaded:', {
      totalReferrals: stats.totalReferrals,
      totalEarnings: stats.totalEarnings,
      conversionRate: stats.conversionRate
    });

    res.status(200).json({
      success: true,
      ...referralData,
    });

  } catch (error) {
    console.error('Referrals API error:', error);
    res.status(500).json({
      error: 'Failed to get referral data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}