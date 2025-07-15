import { NextApiRequest, NextApiResponse } from 'next';
import { trackReferralActivation, generateUserDisplay } from '../../../lib/referralDatabase';
import { REFERRAL_COMMISSION_PERCENT } from '../../../lib/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    referrerAddress, 
    referredAddress, 
    referredEmail, 
    tokenId, 
    giftAmount, 
    transactionHash 
  } = req.body;

  if (!referrerAddress || !tokenId || !giftAmount) {
    return res.status(400).json({ 
      error: 'Referrer address, token ID, and gift amount are required' 
    });
  }

  try {
    // Generate user display identifier (same as used in tracking click)
    const referredIdentifier = generateUserDisplay(referredAddress, referredEmail);
    
    // Calculate commission (20% of platform earnings, not of gift amount)
    // Assuming platform takes 4% of gift amount, so commission is 20% of that 4%
    const platformFee = giftAmount * 0.04; // 4% platform fee
    const commission = platformFee * (REFERRAL_COMMISSION_PERCENT / 100); // 20% of platform fee

    await trackReferralActivation(referrerAddress, referredIdentifier, {
      tokenId,
      amount: giftAmount,
      commission,
      transactionHash
    });

    console.log('✅ Referral activation tracked:', {
      referrerAddress,
      referredIdentifier,
      tokenId,
      giftAmount,
      commission,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Referral activation tracked successfully',
      commission,
      referredIdentifier
    });
  } catch (error) {
    console.error('❌ Error tracking referral activation:', error);
    res.status(500).json({ error: 'Failed to track referral activation' });
  }
}