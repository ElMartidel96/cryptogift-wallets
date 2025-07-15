// Simple file-based referral database for development
// In production, this should be replaced with a proper database

import { promises as fs } from 'fs';
import path from 'path';

export interface ReferralRecord {
  id: string;
  referrerAddress: string;
  referredAddress?: string;
  referredEmail?: string;
  referredUserDisplay: string;
  registrationDate: string;
  status: 'registered' | 'activated' | 'active';
  source?: string;
  lastActivity: string;
  gifts: GiftRecord[];
  totalEarnings: number;
}

export interface GiftRecord {
  id: string;
  tokenId: string;
  amount: number;
  commission: number;
  date: string;
  transactionHash?: string;
  status: 'completed' | 'pending';
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  conversionRate: number;
}

const REFERRALS_DIR = path.join('/tmp', 'referrals-data');
const REFERRALS_FILE = path.join(REFERRALS_DIR, 'referrals.json');

async function ensureReferralsDir() {
  try {
    await fs.access(REFERRALS_DIR);
  } catch {
    await fs.mkdir(REFERRALS_DIR, { recursive: true });
  }
}

async function loadReferrals(): Promise<ReferralRecord[]> {
  try {
    await ensureReferralsDir();
    const data = await fs.readFile(REFERRALS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveReferrals(referrals: ReferralRecord[]): Promise<void> {
  await ensureReferralsDir();
  await fs.writeFile(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
}

export async function trackReferralClick(referrerAddress: string, referredIdentifier: string, source?: string): Promise<void> {
  console.log('🔗 Tracking referral click:', { referrerAddress, referredIdentifier, source });
  
  const referrals = await loadReferrals();
  
  // Check if this referral already exists
  const existingReferral = referrals.find(r => 
    r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase() && 
    r.referredUserDisplay === referredIdentifier
  );
  
  if (existingReferral) {
    // Update last activity
    existingReferral.lastActivity = new Date().toISOString();
    console.log('📝 Updated existing referral activity');
  } else {
    // Create new referral record
    const newReferral: ReferralRecord = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      referrerAddress: referrerAddress.toLowerCase(),
      referredUserDisplay: referredIdentifier,
      registrationDate: new Date().toISOString(),
      status: 'registered',
      source: source || 'direct',
      lastActivity: new Date().toISOString(),
      gifts: [],
      totalEarnings: 0
    };
    
    referrals.push(newReferral);
    console.log('✅ Created new referral record:', newReferral.id);
  }
  
  await saveReferrals(referrals);
}

export async function trackReferralActivation(
  referrerAddress: string, 
  referredIdentifier: string, 
  giftData: {
    tokenId: string;
    amount: number;
    commission: number;
    transactionHash?: string;
  }
): Promise<void> {
  console.log('🎁 Tracking referral activation:', { referrerAddress, referredIdentifier, giftData });
  
  const referrals = await loadReferrals();
  
  const referral = referrals.find(r => 
    r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase() && 
    r.referredUserDisplay === referredIdentifier
  );
  
  if (referral) {
    // Update referral status
    referral.status = referral.gifts.length > 0 ? 'active' : 'activated';
    referral.lastActivity = new Date().toISOString();
    
    // Add gift record
    const giftRecord: GiftRecord = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenId: giftData.tokenId,
      amount: giftData.amount,
      commission: giftData.commission,
      date: new Date().toISOString(),
      transactionHash: giftData.transactionHash,
      status: 'completed'
    };
    
    referral.gifts.push(giftRecord);
    referral.totalEarnings += giftData.commission;
    
    console.log('✅ Updated referral with activation:', referral.id);
  } else {
    console.warn('⚠️ Referral not found for activation:', { referrerAddress, referredIdentifier });
  }
  
  await saveReferrals(referrals);
}

export async function getReferralStats(referrerAddress: string): Promise<ReferralStats> {
  const referrals = await loadReferrals();
  const userReferrals = referrals.filter(r => r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase());
  
  const totalReferrals = userReferrals.length;
  const activeReferrals = userReferrals.filter(r => r.status === 'activated' || r.status === 'active').length;
  const totalEarnings = userReferrals.reduce((sum, r) => sum + r.totalEarnings, 0);
  const pendingRewards = 0; // For now, assuming all rewards are immediate
  const conversionRate = totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0;
  
  return {
    totalReferrals,
    activeReferrals,
    totalEarnings,
    pendingRewards,
    conversionRate
  };
}

export async function getUserReferrals(referrerAddress: string): Promise<ReferralRecord[]> {
  const referrals = await loadReferrals();
  return referrals.filter(r => r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase());
}

export async function getUserEarningsHistory(referrerAddress: string) {
  const referrals = await loadReferrals();
  const userReferrals = referrals.filter(r => r.referrerAddress.toLowerCase() === referrerAddress.toLowerCase());
  
  const earnings = [];
  for (const referral of userReferrals) {
    for (const gift of referral.gifts) {
      earnings.push({
        id: gift.id,
        date: gift.date,
        amount: gift.commission,
        referredUser: referral.referredAddress || '',
        referredUserDisplay: referral.referredUserDisplay,
        giftAmount: gift.amount,
        giftTokenId: gift.tokenId,
        transactionHash: gift.transactionHash,
        status: gift.status
      });
    }
  }
  
  return earnings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Helper function to generate user display identifier
export function generateUserDisplay(address?: string, email?: string): string {
  if (address && address.startsWith('0x')) {
    return `...${address.slice(-6)}`;
  }
  if (email) {
    const parts = email.split('@');
    if (parts.length === 2) {
      const [local, domain] = parts;
      return `${local.slice(0, 4)}...@${domain}`;
    }
  }
  return `user_${Date.now().toString().slice(-6)}`;
}