import React from 'react';

interface GiftSummaryProps {
  data: {
    imageFile: File | null;
    imageUrl: string;
    filteredImageUrl: string;
    selectedFilter: string;
    amount: number;
  };
  fees: {
    creation: number;
    referral: number;
    platform: number;
    net: number;
  };
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export const GiftSummary: React.FC<GiftSummaryProps> = ({
  data,
  fees,
  onConfirm,
  onBack,
  isLoading,
  error
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Resumen del Regalo</h2>
        <p className="text-gray-600">
          Revisa los detalles antes de crear tu NFT-wallet
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Error al crear el regalo</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* NFT Preview */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative">
            <img
              src={data.filteredImageUrl || data.imageUrl}
              alt="NFT Preview"
              className="w-48 h-48 object-cover rounded-2xl shadow-lg"
            />
            <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              NFT #{Date.now().toString().slice(-4)}
            </div>
          </div>
          
          <div className="flex-1 space-y-3">
            <h3 className="text-xl font-bold text-gray-800">Tu Regalo Cripto</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Filtro aplicado:</span>
                <span className="font-medium">{data.selectedFilter || 'Original'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Balance inicial:</span>
                <span className="font-medium text-green-600">${fees.net.toFixed(2)} USDC</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Tamaño de archivo:</span>
                <span className="font-medium">
                  {data.imageFile ? (data.imageFile.size / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Desglose de Costos</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Monto depositado:</span>
            <span className="font-medium">${data.amount.toFixed(2)} USDC</span>
          </div>
          
          <div className="border-l-4 border-gray-300 pl-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fee de creación (4%):</span>
              <span className="text-red-600">-${fees.creation.toFixed(2)} USDC</span>
            </div>
            
            <div className="ml-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">→ Para referidor:</span>
                <span className="text-green-600">${fees.referral.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">→ Para plataforma:</span>
                <span className="text-gray-500">${fees.platform.toFixed(2)} USDC</span>
              </div>
            </div>
          </div>
          
          <hr className="border-gray-200" />
          
          <div className="flex justify-between py-2 text-lg font-bold">
            <span>Tu amigo recibirá:</span>
            <span className="text-green-600">${fees.net.toFixed(2)} USDC</span>
          </div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-3">¿Qué pasa después?</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex items-start">
            <span className="font-bold mr-2">1.</span>
            <span>Se crea tu NFT único con la imagen y filtro seleccionados</span>
          </div>
          <div className="flex items-start">
            <span className="font-bold mr-2">2.</span>
            <span>Se genera automáticamente una wallet ERC-6551 conectada al NFT</span>
          </div>
          <div className="flex items-start">
            <span className="font-bold mr-2">3.</span>
            <span>Los USDC se depositan directamente en esa wallet</span>
          </div>
          <div className="flex items-start">
            <span className="font-bold mr-2">4.</span>
            <span>Recibes un link y QR para compartir con tu amigo</span>
          </div>
          <div className="flex items-start">
            <span className="font-bold mr-2">5.</span>
            <span>¡Tu amigo puede reclamar el NFT y usar la wallet inmediatamente!</span>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-yellow-800">Importante:</p>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              <li>• Esta transacción no se puede deshacer</li>
              <li>• El gas está patrocinado (gratis para ti)</li>
              <li>• El NFT se creará en Base blockchain</li>
              <li>• Tu amigo necesitará conectar una wallet para reclamarlo</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Atrás
        </button>
        
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Creando Regalo...
            </div>
          ) : (
            '🎁 Crear Mi Regalo NFT'
          )}
        </button>
      </div>
    </div>
  );
};