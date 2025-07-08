"use client";

import React, { useState } from 'react';

interface AmountSelectorProps {
  currentAmount: number;
  onAmountSelect: (amount: number) => void;
  onBack: () => void;
  referralFee: number;
  platformFee: number;
  netAmount: number;
}

export const AmountSelector: React.FC<AmountSelectorProps> = ({
  currentAmount,
  onAmountSelect,
  onBack,
  referralFee,
  platformFee,
  netAmount
}) => {
  const [amount, setAmount] = useState(currentAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const presetAmounts = [25, 50, 100, 250, 500];
  const minAmount = 5;
  const maxAmount = 10000;

  const handlePresetSelect = (preset: number) => {
    setAmount(preset);
    setShowCustom(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= minAmount && numValue <= maxAmount) {
      setAmount(numValue);
    }
  };

  const handleContinue = () => {
    if (amount >= minAmount && amount <= maxAmount) {
      onAmountSelect(amount);
    }
  };

  const calculateFees = (baseAmount: number) => {
    const fee = (baseAmount * 4) / 100;
    const ref = fee / 2;
    const platform = fee / 2;
    const net = baseAmount - fee;
    return { fee, ref, platform, net };
  };

  const fees = calculateFees(amount);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Saldo Inicial</h2>
        <p className="text-gray-600">
          Elige cuántos USDC quieres regalar
        </p>
      </div>

      {/* Current Amount Display */}
      <div className="text-center">
        <div className="text-6xl font-bold text-blue-600 mb-2">
          ${amount.toFixed(0)}
        </div>
        <div className="text-lg text-gray-600">USDC</div>
      </div>

      {/* Preset Amounts */}
      <div className="grid grid-cols-5 gap-3">
        {presetAmounts.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetSelect(preset)}
            className={`p-4 rounded-xl font-semibold transition-all duration-300 ${
              amount === preset && !showCustom
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ${preset}
          </button>
        ))}
      </div>

      {/* Custom Amount */}
      <div className="space-y-3">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`w-full p-4 rounded-xl font-semibold transition-all duration-300 ${
            showCustom
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          💰 Monto Personalizado
        </button>

        {showCustom && (
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Ingresa el monto"
                min={minAmount}
                max={maxAmount}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500 text-center">
              Mínimo ${minAmount} - Máximo ${maxAmount.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Fee Breakdown */}
      <div className="bg-gray-50 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-gray-800 mb-4">Desglose de Costos</h3>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Monto base:</span>
          <span className="font-medium">${amount.toFixed(2)} USDC</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Fee de creación (4%):</span>
          <span className="font-medium text-red-600">-${fees.fee.toFixed(2)} USDC</span>
        </div>
        
        <div className="ml-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">• Para referidor:</span>
            <span className="text-green-600">${fees.ref.toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">• Para plataforma:</span>
            <span className="text-gray-600">${fees.platform.toFixed(2)} USDC</span>
          </div>
        </div>
        
        <hr className="border-gray-300" />
        
        <div className="flex justify-between text-lg font-bold">
          <span>Tu amigo recibirá:</span>
          <span className="text-green-600">${fees.net.toFixed(2)} USDC</span>
        </div>
      </div>

      {/* Why We Charge */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 ¿Por qué cobramos un fee?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Gas gratuito para todas las transacciones</li>
          <li>• Mantenimiento de servidores y APIs IA</li>
          <li>• Comisiones para referidores (viralidad)</li>
          <li>• Desarrollo continuo de nuevas features</li>
        </ul>
      </div>

      {/* Popular Choice */}
      {amount >= 50 && amount <= 100 && (
        <div className="text-center">
          <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            🎯 Opción más popular
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Atrás
        </button>
        
        <button
          onClick={handleContinue}
          disabled={amount < minAmount || amount > maxAmount}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};