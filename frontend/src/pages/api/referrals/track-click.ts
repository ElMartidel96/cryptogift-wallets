import { NextApiRequest, NextApiResponse } from 'next';
import { trackReferralClick, generateUserDisplay } from '../../../lib/referralDatabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { referrerAddress, referredAddress, referredEmail, source, userAgent } = req.body;

  if (!referrerAddress) {
    return res.status(400).json({ error: 'Referrer address is required' });
  }

  try {
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     req.socket.remoteAddress || 
                     'unknown';
    
    // Use first IP if multiple (proxy chain)
    const clientIP = Array.isArray(ipAddress) ? ipAddress[0] : ipAddress.split(',')[0];
    
    // Generate user display identifier - prefer user data, fallback to IP-based
    const referredIdentifier = (referredAddress || referredEmail) ? 
      generateUserDisplay(referredAddress, referredEmail) : 
      `ip_${clientIP.split('.').slice(-2).join('.')}`;
    
    // Determine source from user agent or provided source
    let detectedSource = source;
    if (!detectedSource && userAgent) {
      if (userAgent.includes('WhatsApp')) detectedSource = 'WhatsApp';
      else if (userAgent.includes('Twitter')) detectedSource = 'Twitter';
      else if (userAgent.includes('Telegram')) detectedSource = 'Telegram';
      else if (userAgent.includes('Facebook')) detectedSource = 'Facebook';
      else detectedSource = 'Direct';
    }

    await trackReferralClick(referrerAddress, referredIdentifier, detectedSource, clientIP);

    console.log('✅ Referral click tracked:', {
      referrerAddress,
      referredIdentifier,
      source: detectedSource,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Referral click tracked successfully',
      referredIdentifier
    });
  } catch (error) {
    console.error('❌ Error tracking referral click:', error);
    res.status(500).json({ error: 'Failed to track referral click' });
  }
}