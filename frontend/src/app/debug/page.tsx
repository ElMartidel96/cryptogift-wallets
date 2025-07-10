"use client";

import { useState, useEffect } from 'react';

interface MintLog {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'SUCCESS';
  step: string;
  data: any;
}

export default function DebugPage() {
  const [logs, setLogs] = useState<MintLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/mint-logs');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/debug/mint-logs?clear=true');
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'SUCCESS': return 'text-green-600 bg-green-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">🔍 Mint Debug Console</h1>
            <div className="flex gap-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh (2s)
              </label>
              <button
                onClick={fetchLogs}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear Logs
              </button>
            </div>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <div className="mb-4">
              <div className="text-yellow-400">📋 DEBUGGING GUIDE:</div>
              <div>1. Try to mint an NFT and watch the logs appear here</div>
              <div>2. Look for ERROR level logs to identify the exact failure point</div>
              <div>3. Check the step where it fails (STEP_1 to STEP_5)</div>
              <div>4. Use the data field to see specific error details</div>
            </div>
            
            <div className="border-t border-gray-700 pt-4">
              <div className="text-yellow-400">📊 LOGS ({logs.length} total):</div>
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">No logs yet. Try minting an NFT to see debug information.</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className={`p-2 my-2 rounded ${getLevelColor(log.level)}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">
                            [{log.level}] {log.step}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          {log.data && (
                            <div className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                              <pre className="text-gray-800">{JSON.stringify(log.data, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-bold text-yellow-800 mb-2">🚨 Common Issues & Solutions:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li><strong>STEP_1 fails:</strong> IPFS upload issue - check internet connection</li>
              <li><strong>STEP_2 fails:</strong> Biconomy configuration issue - check environment variables</li>
              <li><strong>STEP_3 fails:</strong> Smart Account creation issue - check private key and funding</li>
              <li><strong>STEP_4 fails:</strong> Transaction execution issue - check contract addresses</li>
              <li><strong>STEP_5 fails:</strong> TBA calculation issue - should not fail, but check token ID</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}