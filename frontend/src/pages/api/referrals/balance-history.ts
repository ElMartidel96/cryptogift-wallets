import { NextApiRequest, NextApiResponse } from 'next';

interface BalanceTransaction {
  id: string;
  date: string;
  type: 'earning' | 'withdrawal';
  amount: number;
  description: string;
  referredUser?: string;
  transactionHash?: string;
}

// Mock data for demonstration - replace with actual database queries
const mockTransactions: BalanceTransaction[] = [
  {
    id: '1',
    date: '2024-01-15T10:30:00Z',
    type: 'earning',
    amount: 5.0,
    description: 'Comisión por referido',
    referredUser: '0x1234...5678',
    transactionHash: '0xabc123...'
  },
  {
    id: '2',
    date: '2024-01-14T15:45:00Z',
    type: 'earning',
    amount: 3.0,
    description: 'Comisión por referido',
    referredUser: '0x9876...5432',
    transactionHash: '0xdef456...'
  },
  {
    id: '3',
    date: '2024-01-13T09:20:00Z',
    type: 'withdrawal',
    amount: 10.0,
    description: 'Retiro a wallet',
    transactionHash: '0xghi789...'
  },
  {
    id: '4',
    date: '2024-01-12T14:15:00Z',
    type: 'earning',
    amount: 2.0,
    description: 'Comisión por referido',
    referredUser: '0x5555...1111',
    transactionHash: '0xjkl012...'
  }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, dateRange, filter } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Filter by date range
    const now = new Date();
    let filteredTransactions = mockTransactions;

    if (dateRange !== 'all') {
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      
      filteredTransactions = mockTransactions.filter(tx => 
        new Date(tx.date) > cutoffDate
      );
    }

    // Filter by transaction type
    if (filter && filter !== 'all') {
      filteredTransactions = filteredTransactions.filter(tx => tx.type === filter);
    }

    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json({
      success: true,
      transactions: filteredTransactions,
      summary: {
        totalEarnings: filteredTransactions.filter(tx => tx.type === 'earning').reduce((sum, tx) => sum + tx.amount, 0),
        totalWithdrawals: filteredTransactions.filter(tx => tx.type === 'withdrawal').reduce((sum, tx) => sum + tx.amount, 0),
        transactionCount: filteredTransactions.length
      }
    });
  } catch (error) {
    console.error('Error fetching balance history:', error);
    res.status(500).json({ error: 'Failed to fetch balance history' });
  }
}