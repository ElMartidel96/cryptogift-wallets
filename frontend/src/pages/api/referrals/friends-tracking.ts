import { NextApiRequest, NextApiResponse } from 'next';

interface ReferredFriend {
  id: string;
  joinDate: string;
  userIdentifier: string;
  status: 'registered' | 'activated' | 'active';
  totalGifts: number;
  totalSpent: number;
  lastActivity: string;
  source?: string;
  earningsGenerated: number;
  giftHistory: {
    id: string;
    date: string;
    amount: number;
    tokenId?: string;
  }[];
}

// Mock data for demonstration - replace with actual database queries
const mockFriends: ReferredFriend[] = [
  {
    id: '1',
    joinDate: '2024-01-15T10:30:00Z',
    userIdentifier: '...567890',
    status: 'active',
    totalGifts: 3,
    totalSpent: 450.0,
    lastActivity: '2024-01-16T14:20:00Z',
    source: 'WhatsApp',
    earningsGenerated: 9.0,
    giftHistory: [
      { id: 'g1', date: '2024-01-15T10:30:00Z', amount: 200.0, tokenId: '123' },
      { id: 'g2', date: '2024-01-15T15:45:00Z', amount: 150.0, tokenId: '124' },
      { id: 'g3', date: '2024-01-16T09:15:00Z', amount: 100.0, tokenId: '125' }
    ]
  },
  {
    id: '2',
    joinDate: '2024-01-14T08:15:00Z',
    userIdentifier: '...543210',
    status: 'activated',
    totalGifts: 1,
    totalSpent: 300.0,
    lastActivity: '2024-01-14T16:30:00Z',
    source: 'Twitter',
    earningsGenerated: 6.0,
    giftHistory: [
      { id: 'g4', date: '2024-01-14T16:30:00Z', amount: 300.0, tokenId: '126' }
    ]
  },
  {
    id: '3',
    joinDate: '2024-01-13T12:45:00Z',
    userIdentifier: 'juan.p...@gmail.com',
    status: 'registered',
    totalGifts: 0,
    totalSpent: 0,
    lastActivity: '2024-01-13T12:45:00Z',
    source: 'Telegram',
    earningsGenerated: 0,
    giftHistory: []
  },
  {
    id: '4',
    joinDate: '2024-01-12T16:20:00Z',
    userIdentifier: '...111111',
    status: 'active',
    totalGifts: 2,
    totalSpent: 350.0,
    lastActivity: '2024-01-15T11:10:00Z',
    source: 'WhatsApp',
    earningsGenerated: 7.0,
    giftHistory: [
      { id: 'g5', date: '2024-01-12T16:20:00Z', amount: 200.0, tokenId: '127' },
      { id: 'g6', date: '2024-01-13T10:40:00Z', amount: 150.0, tokenId: '128' }
    ]
  },
  {
    id: '5',
    joinDate: '2024-01-11T14:30:00Z',
    userIdentifier: 'maria.s...@outlook.com',
    status: 'registered',
    totalGifts: 0,
    totalSpent: 0,
    lastActivity: '2024-01-11T14:30:00Z',
    source: 'Direct',
    earningsGenerated: 0,
    giftHistory: []
  },
  {
    id: '6',
    joinDate: '2024-01-10T09:45:00Z',
    userIdentifier: '...222222',
    status: 'active',
    totalGifts: 4,
    totalSpent: 800.0,
    lastActivity: '2024-01-16T13:25:00Z',
    source: 'Twitter',
    earningsGenerated: 16.0,
    giftHistory: [
      { id: 'g7', date: '2024-01-10T09:45:00Z', amount: 100.0, tokenId: '129' },
      { id: 'g8', date: '2024-01-11T14:20:00Z', amount: 250.0, tokenId: '130' },
      { id: 'g9', date: '2024-01-12T11:10:00Z', amount: 200.0, tokenId: '131' },
      { id: 'g10', date: '2024-01-16T13:25:00Z', amount: 250.0, tokenId: '132' }
    ]
  }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, filter, sortBy } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Filter by status
    let filteredFriends = mockFriends;
    
    if (filter && filter !== 'all') {
      filteredFriends = mockFriends.filter(friend => friend.status === filter);
    }

    // Sort friends
    if (sortBy === 'earnings') {
      filteredFriends.sort((a, b) => b.earningsGenerated - a.earningsGenerated);
    } else if (sortBy === 'activity') {
      filteredFriends.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    } else {
      // Sort by join date (newest first)
      filteredFriends.sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());
    }

    const totalFriends = mockFriends.length;
    const activatedFriends = mockFriends.filter(f => f.status === 'activated' || f.status === 'active').length;
    const totalEarnings = mockFriends.reduce((sum, f) => sum + f.earningsGenerated, 0);

    res.status(200).json({
      success: true,
      friends: filteredFriends,
      summary: {
        totalFriends,
        activatedFriends,
        registeredOnly: mockFriends.filter(f => f.status === 'registered').length,
        totalEarnings,
        conversionRate: totalFriends > 0 ? (activatedFriends / totalFriends) * 100 : 0,
        averageEarningPerFriend: activatedFriends > 0 ? totalEarnings / activatedFriends : 0
      }
    });
  } catch (error) {
    console.error('Error fetching friends tracking:', error);
    res.status(500).json({ error: 'Failed to fetch friends tracking data' });
  }
}