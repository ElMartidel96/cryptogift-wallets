"use client";

import React, { useState, useEffect } from 'react';

interface AccountData {
  profileComplete: boolean;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  tradingLevel: 'basic' | 'advanced' | 'professional';
  apiKeysEnabled: boolean;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  connectedServices: string[];
}

interface AccountManagementProps {
  walletAddress: string;
  className?: string;
}

export const AccountManagement: React.FC<AccountManagementProps> = ({
  walletAddress,
  className = ""
}) => {
  const [accountData, setAccountData] = useState<AccountData>({
    profileComplete: false,
    kycStatus: 'none',
    tradingLevel: 'basic',
    apiKeysEnabled: false,
    notifications: {
      email: true,
      push: false,
      sms: false
    },
    connectedServices: []
  });
  
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAccountData();
  }, [walletAddress]);

  const loadAccountData = () => {
    // Load from localStorage for demo
    const saved = localStorage.getItem(`account_${walletAddress}`);
    if (saved) {
      setAccountData(JSON.parse(saved));
    }
  };

  const saveAccountData = (data: AccountData) => {
    localStorage.setItem(`account_${walletAddress}`, JSON.stringify(data));
    setAccountData(data);
  };

  const availableServices = [
    {
      id: 'nexuswallet',
      name: 'NexusWallet Exchange',
      description: 'Acceso completo al exchange con trading avanzado',
      icon: '💼',
      features: ['Trading spot', 'Futuros', 'Análisis técnico', 'API privada'],
      level: 'professional'
    },
    {
      id: 'defi-bridge',
      name: 'DeFi Bridge',
      description: 'Conecta con protocolos DeFi populares',
      icon: '🌉',
      features: ['Uniswap', 'Aave', 'Compound', 'Bridge cross-chain'],
      level: 'advanced'
    },
    {
      id: 'nft-marketplace',
      name: 'NFT Marketplace',
      description: 'Compra, vende y crea NFTs',
      icon: '🎨',
      features: ['Crear NFTs', 'Marketplace', 'Colecciones', 'Royalties'],
      level: 'basic'
    },
    {
      id: 'portfolio-analytics',
      name: 'Portfolio Analytics',
      description: 'Análisis avanzado de tu portafolio',
      icon: '📊',
      features: ['P&L tracking', 'Tax reports', 'Performance analytics', 'Alerts'],
      level: 'advanced'
    },
    {
      id: 'lending-protocol',
      name: 'Lending Protocol',
      description: 'Presta y pide prestado crypto',
      icon: '🏦',
      features: ['Lending', 'Borrowing', 'Yield farming', 'Liquidation protection'],
      level: 'advanced'
    },
    {
      id: 'governance',
      name: 'DAO Governance',
      description: 'Participa en la gobernanza del protocolo',
      icon: '🗳️',
      features: ['Voting rights', 'Proposals', 'Staking rewards', 'Community'],
      level: 'basic'
    }
  ];

  const connectService = async (serviceId: string) => {
    setIsLoading(true);
    try {
      const service = availableServices.find(s => s.id === serviceId);
      if (!service) throw new Error('Servicio no encontrado');

      // Check if user meets requirements
      if (service.level === 'advanced' && accountData.tradingLevel === 'basic') {
        throw new Error('Necesitas upgrade a nivel Advanced');
      }
      if (service.level === 'professional' && accountData.tradingLevel !== 'professional') {
        throw new Error('Necesitas upgrade a nivel Professional');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newAccountData = {
        ...accountData,
        connectedServices: [...accountData.connectedServices, serviceId]
      };
      saveAccountData(newAccountData);

      alert(`✅ ${service.name} conectado exitosamente!`);
      setShowServiceModal(false);

    } catch (error) {
      console.error('❌ Error connecting service:', error);
      alert('Error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectService = (serviceId: string) => {
    const service = availableServices.find(s => s.id === serviceId);
    if (confirm(`¿Desconectar ${service?.name}?`)) {
      const newAccountData = {
        ...accountData,
        connectedServices: accountData.connectedServices.filter(s => s !== serviceId)
      };
      saveAccountData(newAccountData);
    }
  };

  const upgradeAccount = async (level: 'advanced' | 'professional') => {
    setIsLoading(true);
    try {
      if (level === 'professional' && accountData.kycStatus !== 'approved') {
        throw new Error('Necesitas completar KYC para nivel Professional');
      }

      // Simulate upgrade process
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newAccountData = {
        ...accountData,
        tradingLevel: level
      };
      saveAccountData(newAccountData);

      alert(`✅ Cuenta upgraded a ${level}!`);

    } catch (error) {
      console.error('❌ Error upgrading account:', error);
      alert('Error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const startKYC = async () => {
    setIsLoading(true);
    try {
      // Simulate KYC process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newAccountData = {
        ...accountData,
        kycStatus: 'pending' as const
      };
      saveAccountData(newAccountData);

      // Simulate approval after 3 seconds (for demo)
      setTimeout(() => {
        const approvedData = {
          ...newAccountData,
          kycStatus: 'approved' as const,
          profileComplete: true
        };
        saveAccountData(approvedData);
      }, 3000);

      alert('KYC iniciado. Recibirás una notificación cuando esté completo.');

    } catch (error) {
      console.error('❌ Error starting KYC:', error);
      alert('Error al iniciar KYC');
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountLevel = () => {
    if (accountData.tradingLevel === 'professional') return { level: 'Professional', color: 'purple', score: 100 };
    if (accountData.tradingLevel === 'advanced') return { level: 'Advanced', color: 'blue', score: 70 };
    return { level: 'Basic', color: 'green', score: 30 };
  };

  const getKYCStatus = () => {
    switch (accountData.kycStatus) {
      case 'approved': return { text: 'Verificado', color: 'green', icon: '✅' };
      case 'pending': return { text: 'Pendiente', color: 'yellow', icon: '⏳' };
      case 'rejected': return { text: 'Rechazado', color: 'red', icon: '❌' };
      default: return { text: 'No verificado', color: 'gray', icon: '⚪' };
    }
  };

  const accountLevel = getAccountLevel();
  const kycStatus = getKYCStatus();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        {/* Account Icon */}
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
          ⚙️
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 mb-2">
            Gestión de Cuenta
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Accede a servicios internos y configuración avanzada
          </p>
          
          {/* Account Status */}
          <div className="space-y-3 mb-4">
            {/* Account Level */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full bg-${accountLevel.color}-500`}></span>
                <span className="text-sm text-gray-700">Nivel: {accountLevel.level}</span>
              </div>
              <div className="text-xs text-gray-500">{accountLevel.score}/100</div>
            </div>

            {/* KYC Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm">{kycStatus.icon}</span>
                <span className="text-sm text-gray-700">KYC: {kycStatus.text}</span>
              </div>
              {accountData.kycStatus === 'none' && (
                <button
                  onClick={startKYC}
                  disabled={isLoading}
                  className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                >
                  Iniciar
                </button>
              )}
            </div>

            {/* Connected Services */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span className="text-sm text-gray-700">
                  Servicios conectados: {accountData.connectedServices.length}
                </span>
              </div>
              <button
                onClick={() => setShowServiceModal(true)}
                className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200"
              >
                Gestionar
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            {accountData.tradingLevel === 'basic' && (
              <button
                onClick={() => upgradeAccount('advanced')}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                📈 Upgrade a Advanced
              </button>
            )}
            
            {accountData.tradingLevel === 'advanced' && accountData.kycStatus === 'approved' && (
              <button
                onClick={() => upgradeAccount('professional')}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
              >
                💎 Upgrade a Professional
              </button>
            )}

            <button
              onClick={() => setShowServiceModal(true)}
              className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              🔧 Configuración Avanzada
            </button>
          </div>
        </div>
      </div>

      {/* Services Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Servicios Disponibles</h3>
              <button
                onClick={() => setShowServiceModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Account Status Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold text-${accountLevel.color}-600`}>
                    {accountLevel.level}
                  </div>
                  <div className="text-xs text-gray-500">Nivel de Cuenta</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {accountData.connectedServices.length}
                  </div>
                  <div className="text-xs text-gray-500">Servicios Activos</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl ${kycStatus.icon}`}>
                    {kycStatus.icon}
                  </div>
                  <div className="text-xs text-gray-500">Estado KYC</div>
                </div>
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {availableServices.map((service) => {
                const isConnected = accountData.connectedServices.includes(service.id);
                const canConnect = 
                  service.level === 'basic' ||
                  (service.level === 'advanced' && accountData.tradingLevel !== 'basic') ||
                  (service.level === 'professional' && accountData.tradingLevel === 'professional');

                return (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{service.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{service.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                        
                        {/* Features */}
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {service.features.slice(0, 2).map((feature, index) => (
                              <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {feature}
                              </span>
                            ))}
                            {service.features.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{service.features.length - 2} más
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Level requirement */}
                        <div className="mb-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            service.level === 'basic' ? 'bg-green-100 text-green-600' :
                            service.level === 'advanced' ? 'bg-blue-100 text-blue-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            Requiere: {service.level}
                          </span>
                        </div>

                        {/* Action Button */}
                        {isConnected ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-sm text-green-600 font-medium">Conectado</span>
                            </div>
                            <button
                              onClick={() => disconnectService(service.id)}
                              className="w-full py-2 px-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                            >
                              Desconectar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedService(service.id);
                              connectService(service.id);
                            }}
                            disabled={!canConnect || isLoading}
                            className={`w-full py-2 px-3 rounded-lg text-sm font-medium ${
                              canConnect 
                                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {!canConnect ? `Requiere ${service.level}` : 
                             isLoading && selectedService === service.id ? 'Conectando...' : 'Conectar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};