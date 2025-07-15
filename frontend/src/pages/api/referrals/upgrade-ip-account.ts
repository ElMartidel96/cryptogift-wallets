import { NextApiRequest, NextApiResponse } from 'next';
import { upgradeIPAccountToUser } from '../../../lib/referralDatabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userAddress, userEmail } = req.body;

  if (!userAddress && !userEmail) {
    return res.status(400).json({ error: 'User address or email is required' });
  }

  try {
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     req.socket.remoteAddress || 
                     'unknown';
    
    // Use first IP if multiple (proxy chain)
    const clientIP = Array.isArray(ipAddress) ? ipAddress[0] : ipAddress.split(',')[0];
    
    await upgradeIPAccountToUser(clientIP, userAddress, userEmail);

    console.log('✅ IP account upgrade processed:', {
      ipAddress: clientIP,
      userAddress: userAddress?.slice(0, 10) + '...',
      userEmail: userEmail ? userEmail.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'IP account upgrade processed successfully'
    });
  } catch (error) {
    console.error('❌ Error upgrading IP account:', error);
    res.status(500).json({ error: 'Failed to upgrade IP account' });
  }
}