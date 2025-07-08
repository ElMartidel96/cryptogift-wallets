"use client";

import React, { useState } from 'react';
import { TransactionButton } from 'thirdweb/react';
import { keccak256, toUtf8Bytes } from 'ethers';

interface GuardiansModalProps {
  isOpen: boolean;
  onClose: () => void;
  tbaAddress: string;
}

export const GuardiansModal: React.FC<GuardiansModalProps> = ({
  isOpen,
  onClose,
  tbaAddress
}) => {
  const [guardians, setGuardians] = useState(['', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuardianChange = (index: number, value: string) => {
    const newGuardians = [...guardians];
    newGuardians[index] = value;
    setGuardians(newGuardians);
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddGuardians = async (contract: any) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate all emails
      const validEmails = guardians.filter(email => email.trim() && validateEmail(email.trim()));
      
      if (validEmails.length < 3) {
        throw new Error('Se requieren 3 emails válidos');
      }

      // Convert emails to hashes (for privacy)
      const guardianHashes = validEmails.map(email => {
        return keccak256(toUtf8Bytes(email.toLowerCase().trim()));
      });

      // Call the smart contract
      const tx = await contract.call('addGuardians', [guardianHashes]);
      
      console.log('Guardians added:', tx);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding guardians');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">🔒 Configurar Guardianes</h2>
            <p className="text-sm text-gray-500 mt-1">
              Recuperación social para tu wallet
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Explanation */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">¿Qué son los Guardianes?</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Contactos de confianza que pueden ayudarte a recuperar tu wallet</p>
              <p>• Solo se usarán si pierdes acceso a tu cuenta</p>
              <p>• Sus emails se guardan encriptados en blockchain</p>
              <p>• Necesitas 3 guardianes para máxima seguridad</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Guardian Inputs */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Emails de Guardianes</h3>
            
            {guardians.map((guardian, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardián {index + 1}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={guardian}
                    onChange={(e) => handleGuardianChange(index, e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 pr-10"
                  />
                  {guardian && validateEmail(guardian) && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {guardian && !validateEmail(guardian) && (
                  <p className="text-red-500 text-xs mt-1">Email no válido</p>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="bg-yellow-50 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">💡 Recomendaciones</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• Elige familiares o amigos muy cercanos</p>
              <p>• Asegúrate de que tengan acceso regular a su email</p>
              <p>• Considera personas en diferentes países/zonas horarias</p>
              <p>• Informa a tus guardianes sobre su rol</p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-2">🔐 Seguridad</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Los emails se almacenan como hashes encriptados</p>
              <p>• Solo tú y tus guardianes pueden iniciar recuperación</p>
              <p>• Se requiere mayoría (2 de 3) para recuperar acceso</p>
              <p>• Puedes cambiar guardianes en cualquier momento</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            
            <TransactionButton
              contractAddress={tbaAddress}
              action={handleAddGuardians}
              isDisabled={
                isLoading || 
                guardians.filter(email => email.trim() && validateEmail(email.trim())).length < 3
              }
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Configurando...
                </div>
              ) : (
                '🛡️ Configurar Guardianes'
              )}
            </TransactionButton>
          </div>

          {/* Skip Option */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm underline transition-colors"
            >
              Configurar más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};