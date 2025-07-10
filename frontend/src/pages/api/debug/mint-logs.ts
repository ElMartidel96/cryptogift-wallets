import { NextApiRequest, NextApiResponse } from "next";

// In-memory log storage for debugging (temporary solution)
let mintLogs: Array<{
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'SUCCESS';
  step: string;
  data: any;
}> = [];

// Function to add log (to be called from mint API)
export function addMintLog(level: 'INFO' | 'ERROR' | 'SUCCESS', step: string, data: any) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    step,
    data
  };
  
  mintLogs.push(log);
  
  // Keep only last 100 logs to prevent memory issues
  if (mintLogs.length > 100) {
    mintLogs = mintLogs.slice(-100);
  }
  
  console.log(`🔍 MINT LOG [${level}] ${step}:`, data);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clear } = req.query;

  if (clear === 'true') {
    mintLogs = [];
    return res.status(200).json({ 
      success: true, 
      message: 'Mint logs cleared',
      totalLogs: 0 
    });
  }

  // Return logs with latest first
  const recentLogs = mintLogs.slice().reverse();

  res.status(200).json({
    success: true,
    totalLogs: mintLogs.length,
    logs: recentLogs,
    usage: {
      info: "Call /api/debug/mint-logs?clear=true to clear logs",
      lastUpdate: recentLogs[0]?.timestamp || 'No logs yet'
    }
  });
}