import React, { useState, useEffect } from 'react';
import { TransactionButton } from 'thirdweb/react';
import { PERMIT2_ADDRESS, COMMON_TOKENS } from '../lib/constants';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tbaAddress: string;
  currentBalance: string;
  currentToken: string;
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  tbaAddress,
  currentBalance,
  currentToken,
}) => {
  const [targetToken, setTargetToken] = useState(COMMON_TOKENS.USDC);
  const [swapData, setSwapData] = useState<any>(null);
  const [needsPermit, setNeedsPermit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user needs to approve Permit2 first
  useEffect(() => {
    if (currentToken !== COMMON_TOKENS.USDC) {
      checkPermit2Approval();
    }
  }, [currentToken, currentBalance]);

  const checkPermit2Approval = async () => {
    try {
      // Check if the token has sufficient allowance for Permit2
      const response = await fetch('/api/check-allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: currentToken,
          owner: tbaAddress,
          spender: PERMIT2_ADDRESS,
          amount: currentBalance,
        }),
      });

      const data = await response.json();
      setNeedsPermit(!data.hasAllowance);
    } catch (err) {
      console.error('Error checking allowance:', err);
    }
  };

  const getSwapQuote = async () => {
    if (!currentBalance || currentToken === targetToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: currentToken,
          to: targetToken,
          amount: currentBalance,
        }),
      });

      if (!response.ok) {
        throw new Error(`Swap quote failed: ${response.status}`);
      }

      const data = await response.json();
      setSwapData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get swap quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async (contract: any) => {
    if (!swapData) return;

    try {
      // Execute the swap through the Token Bound Account
      const tx = await contract.call('executeCall', [
        swapData.dest,
        swapData.value || '0',
        swapData.calldata,
      ]);

      console.log('Swap transaction:', tx);
      
      // Close modal and refresh balance
      onClose();
      
      // Show success message
      alert('Swap completed successfully!');
      
      return tx;
    } catch (err) {
      console.error('Swap execution error:', err);
      setError('Swap execution failed. Please try again.');
      throw err;
    }
  };

  const handleApprovePermit2 = async (contract: any) => {
    try {
      // Approve Permit2 contract to spend tokens
      const tx = await contract.call('approve', [
        PERMIT2_ADDRESS,
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // Max approval
      ]);

      console.log('Permit2 approval transaction:', tx);
      
      // Update state
      setNeedsPermit(false);
      
      // Get swap quote after approval
      await getSwapQuote();
      
      return tx;
    } catch (err) {
      console.error('Permit2 approval error:', err);
      setError('Approval failed. Please try again.');
      throw err;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Swap Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Current Token */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                {currentToken === COMMON_TOKENS.USDC ? 'USDC' : 
                 currentToken === COMMON_TOKENS.WETH ? 'WETH' : 
                 'Token'}
              </span>
              <span className="font-medium">{currentBalance}</span>
            </div>
          </div>

          {/* Target Token */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <select
              value={targetToken}
              onChange={(e) => setTargetToken(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {Object.entries(COMMON_TOKENS)
                .filter(([, address]) => address !== currentToken)
                .map(([name, address]) => (
                  <option key={address} value={address}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          {/* Swap Quote */}
          {swapData && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Swap quote ready! Click "Execute Swap" to proceed.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {needsPermit ? (
              <Web3Button
                contractAddress={currentToken}
                action={handleApprovePermit2}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg"
              >
                Approve Permit2
              </Web3Button>
            ) : (
              <>
                <button
                  onClick={getSwapQuote}
                  disabled={isLoading || currentToken === targetToken}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg"
                >
                  {isLoading ? 'Loading...' : 'Get Quote'}
                </button>
                
                {swapData && (
                  <Web3Button
                    contractAddress={tbaAddress}
                    action={handleSwap}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg"
                  >
                    Execute Swap
                  </Web3Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};