import { NextApiRequest, NextApiResponse } from 'next';

interface PendingReward {
  id: string;
  date: string;
  amount: number;
  referredUser: string;
  referredUserDisplay: string;
  giftAmount: number;
  giftTokenId?: string;
  estimatedCompletionDate: string;
  reason: 'blockchain_confirmation' | 'payment_processing' | 'fraud_review' | 'manual_review';
  dayCategory: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'older';
}

// Mock data for demonstration - replace with actual database queries
const mockPendingRewards: PendingReward[] = [
  {
    id: '1',
    date: new Date().toISOString(), // Today
    amount: 8.0,
    referredUser: '0x1234567890123456789012345678901234567890',
    referredUserDisplay: '...567890',
    giftAmount: 40.0,
    giftTokenId: '150',
    estimatedCompletionDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    reason: 'blockchain_confirmation',
    dayCategory: 'today'
  },
  {
    id: '2',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    amount: 12.0,
    referredUser: '0x9876543210987654321098765432109876543210',
    referredUserDisplay: '...543210',
    giftAmount: 60.0,
    giftTokenId: '151',
    estimatedCompletionDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
    reason: 'payment_processing',
    dayCategory: 'yesterday'
  },
  {
    id: '3',
    date: new Date().toISOString(), // Today
    amount: 6.0,
    referredUser: '0x5555555555555555555555555555555555555555',
    referredUserDisplay: '...555555',
    giftAmount: 30.0,
    giftTokenId: '152',
    estimatedCompletionDate: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
    reason: 'fraud_review',
    dayCategory: 'today'
  },
  {
    id: '4',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    amount: 10.0,
    referredUser: '0x1111111111111111111111111111111111111111',
    referredUserDisplay: '...111111',
    giftAmount: 50.0,
    giftTokenId: '153',
    estimatedCompletionDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
    reason: 'manual_review',
    dayCategory: 'this_week'
  }
];

function categorizePendingRewards(rewards: PendingReward[]): PendingReward[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return rewards.map(reward => {
    const rewardDate = new Date(reward.date);
    const rewardDay = new Date(rewardDate.getFullYear(), rewardDate.getMonth(), rewardDate.getDate());

    let dayCategory: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'older';

    if (rewardDay.getTime() === today.getTime()) {
      dayCategory = 'today';
    } else if (rewardDay.getTime() === yesterday.getTime()) {
      dayCategory = 'yesterday';
    } else if (rewardDay >= startOfWeek) {
      dayCategory = 'this_week';
    } else if (rewardDay >= startOfMonth) {
      dayCategory = 'this_month';
    } else {
      dayCategory = 'older';
    }

    return { ...reward, dayCategory };
  });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, dateFilter, sortBy } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Categorize rewards by day
    let categorizedRewards = categorizePendingRewards(mockPendingRewards);

    // Filter by date category
    if (dateFilter && dateFilter !== 'all') {
      categorizedRewards = categorizedRewards.filter(reward => 
        reward.dayCategory === dateFilter
      );
    }

    // Sort rewards
    if (sortBy === 'amount') {
      categorizedRewards.sort((a, b) => b.amount - a.amount);
    } else {
      // Sort by date (newest first)
      categorizedRewards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Calculate statistics
    const totalPending = categorizedRewards.reduce((sum, r) => sum + r.amount, 0);
    const todayCount = categorizedRewards.filter(r => r.dayCategory === 'today').length;
    const yesterdayCount = categorizedRewards.filter(r => r.dayCategory === 'yesterday').length;
    const thisWeekCount = categorizedRewards.filter(r => r.dayCategory === 'this_week').length;
    const thisMonthCount = categorizedRewards.filter(r => r.dayCategory === 'this_month').length;

    // Group by reason
    const reasonCounts = categorizedRewards.reduce((counts: Record<string, number>, reward) => {
      counts[reward.reason] = (counts[reward.reason] || 0) + 1;
      return counts;
    }, {});

    res.status(200).json({
      success: true,
      pendingRewards: categorizedRewards,
      summary: {
        totalPending,
        totalCount: categorizedRewards.length,
        todayCount,
        yesterdayCount,
        thisWeekCount,
        thisMonthCount,
        reasonCounts,
        averageAmount: categorizedRewards.length > 0 ? totalPending / categorizedRewards.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching pending rewards:', error);
    res.status(500).json({ error: 'Failed to fetch pending rewards' });
  }
}