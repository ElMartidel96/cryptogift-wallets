'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from 'thirdweb/react';
import { client } from '../app/client';

interface GasEstimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimatedGas: string;
  gasPrice: string;
  totalCost: string;
  networkName: string;
}

export const GasEstimationModal: React.FC<GasEstimationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  estimatedGas,
  gasPrice,
  totalCost,
  networkName
}) => {
  const [understood, setUnderstood] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-96 max-w-90vw overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">⚠️ Gasless Failed - Gas Required</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Gas Details */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-800 mb-2">⚠️ Gasless Transaction Failed</h4>
            <p className="text-sm text-orange-700 mb-3">
              The paymaster couldn&apos;t sponsor this transaction. You&apos;ll need to pay a small gas fee to proceed.
            </p>
            <h4 className="font-semibold text-orange-800 mb-3">💡 Transaction Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="font-medium">{networkName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Gas:</span>
                <span className="font-medium">{estimatedGas} gas units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gas Price:</span>
                <span className="font-medium">{gasPrice} gwei</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-800 font-semibold">Total Cost:</span>
                <span className="font-bold text-blue-600">{totalCost} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">USD Equivalent:</span>
                <span className="text-gray-600">~${(parseFloat(totalCost) * 3000).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* What happens */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">✅ What will happen:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Your NFT will be minted on Base Sepolia</li>
              <li>• A Token Bound Account wallet will be created</li>
              <li>• Metadata will be stored on IPFS permanently</li>
              <li>• Transaction will be recorded on blockchain</li>
              <li>• You&apos;ll receive a shareable link and QR code</li>
            </ul>
          </div>

          {/* Important notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notice:</h4>
            <p className="text-sm text-yellow-700">
              This is a real blockchain transaction on Base Sepolia testnet. 
              You&apos;ll need testnet ETH to pay for gas. This transaction cannot be reversed once confirmed.
            </p>
          </div>

          {/* User confirmation */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I understand that this will execute a real blockchain transaction and I will pay gas fees. 
                I have sufficient ETH in my wallet to cover the transaction cost.
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!understood}
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm & Pay Gas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GasEstimationModal;