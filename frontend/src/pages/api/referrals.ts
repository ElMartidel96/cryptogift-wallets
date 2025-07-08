import { NextApiRequest, NextApiResponse } from "next";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { baseSepolia } from "@thirdweb-dev/chains";

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

    // Initialize ThirdWeb SDK
    const sdk = ThirdwebSDK.fromPrivateKey(
      process.env.PRIVATE_KEY_DEPLOY!,
      baseSepolia,
      {
        secretKey: process.env.TW_SECRET_KEY!,
      }
    );

    // Get ReferralTreasury contract
    const referralTreasury = await sdk.getContract(
      process.env.NEXT_PUBLIC_REF_TREASURY_ADDRESS!
    );

    // Get user's balance in the referral treasury
    const balance = await referralTreasury.call("balance", [address]);
    const balanceFormatted = (parseFloat(balance.toString()) / 1e18).toFixed(6);

    // Get events to calculate statistics
    // This would require more complex event filtering in a real implementation
    // For now, we'll return mock data that you can replace with actual event parsing

    const mockData = {
      balance: balanceFormatted,
      totalEarned: (parseFloat(balanceFormatted) * 1.5).toFixed(2), // Mock: 50% more than current balance
      referralCount: Math.floor(parseFloat(balanceFormatted) * 10), // Mock: 10 referrals per dollar earned
      pendingRewards: "0.00", // Would come from pending transactions
      recentReferrals: [
        // Mock data - replace with actual event parsing
        {
          date: new Date().toISOString(),
          amount: "2.50",
          referredUser: "0x1234...5678",
          giftAmount: "125.00",
        }
      ],
    };

    res.status(200).json({
      success: true,
      ...mockData,
    });

  } catch (error) {
    console.error('Referrals API error:', error);
    res.status(500).json({
      error: 'Failed to fetch referral data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}