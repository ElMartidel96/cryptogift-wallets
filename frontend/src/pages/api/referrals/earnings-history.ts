import { NextApiRequest, NextApiResponse } from 'next';

interface EarningRecord {
  id: string;
  date: string;
  amount: number;
  referredUser: string;
  referredUserDisplay: string;
  giftAmount: number;
  giftTokenId?: string;
  transactionHash?: string;
  status: 'completed' | 'pending';
}

// Mock data for demonstration - replace with actual database queries
const mockEarnings: EarningRecord[] = [
  {
    id: '1',
    date: '2024-01-15T10:30:00Z',
    amount: 5.0,
    referredUser: '0x1234567890123456789012345678901234567890',
    referredUserDisplay: '...567890',
    giftAmount: 250.0,
    giftTokenId: '123',
    transactionHash: '0xabc123def456...',
    status: 'completed'
  },
  {
    id: '2',
    date: '2024-01-14T15:45:00Z',
    amount: 3.0,
    referredUser: '0x9876543210987654321098765432109876543210',
    referredUserDisplay: '...543210',
    giftAmount: 150.0,
    giftTokenId: '124',
    transactionHash: '0xdef456ghi789...',
    status: 'completed'
  },
  {
    id: '3',
    date: '2024-01-13T09:20:00Z',
    amount: 2.0,
    referredUser: '0x5555555555555555555555555555555555555555',
    referredUserDisplay: '...555555',
    giftAmount: 100.0,
    giftTokenId: '125',
    transactionHash: '0xghi789jkl012...',
    status: 'pending'
  },
  {
    id: '4',
    date: '2024-01-12T14:15:00Z',
    amount: 4.0,
    referredUser: '0x1111111111111111111111111111111111111111',
    referredUserDisplay: '...111111',
    giftAmount: 200.0,
    giftTokenId: '126',
    transactionHash: '0xjkl012mno345...',
    status: 'completed'
  },
  {
    id: '5',
    date: '2024-01-11T11:30:00Z',
    amount: 6.0,
    referredUser: '0x2222222222222222222222222222222222222222',
    referredUserDisplay: '...222222',
    giftAmount: 300.0,
    giftTokenId: '127',
    transactionHash: '0xmno345pqr678...',
    status: 'completed'
  }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, dateRange, sortBy } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Filter by date range
    const now = new Date();
    let filteredEarnings = mockEarnings;

    if (dateRange !== 'all') {
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      
      filteredEarnings = mockEarnings.filter(earning => 
        new Date(earning.date) > cutoffDate
      );
    }

    // Sort earnings
    if (sortBy === 'amount') {
      filteredEarnings.sort((a, b) => b.amount - a.amount);
    } else {
      // Sort by date (newest first)
      filteredEarnings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const completedEarnings = filteredEarnings.filter(e => e.status === 'completed');
    const pendingEarnings = filteredEarnings.filter(e => e.status === 'pending');

    res.status(200).json({
      success: true,
      earnings: filteredEarnings,
      summary: {
        totalEarnings: completedEarnings.reduce((sum, e) => sum + e.amount, 0),
        pendingEarnings: pendingEarnings.reduce((sum, e) => sum + e.amount, 0),
        completedCount: completedEarnings.length,
        pendingCount: pendingEarnings.length,
        averageEarning: completedEarnings.length > 0 ? completedEarnings.reduce((sum, e) => sum + e.amount, 0) / completedEarnings.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching earnings history:', error);
    res.status(500).json({ error: 'Failed to fetch earnings history' });
  }
}