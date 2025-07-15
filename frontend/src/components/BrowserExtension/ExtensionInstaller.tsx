"use client";

import React, { useState, useEffect } from 'react';

interface ExtensionInstallerProps {
  walletData: {
    nftContract: string;
    tokenId: string;
    tbaAddress: string;
    name: string;
    image: string;
  };
  className?: string;
}

export const ExtensionInstaller: React.FC<ExtensionInstallerProps> = ({
  walletData,
  className = ""
}) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [browserType, setBrowserType] = useState<'chrome' | 'firefox' | 'safari' | 'edge' | 'unsupported'>('unsupported');

  useEffect(() => {
    detectBrowser();
    checkIfInstalled();
  }, []);

  const detectBrowser = () => {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      setBrowserType('chrome');
    } else if (userAgent.includes('Firefox')) {
      setBrowserType('firefox');
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      setBrowserType('safari');
    } else if (userAgent.includes('Edg')) {
      setBrowserType('edge');
    } else {
      setBrowserType('unsupported');
    }
  };

  const checkIfInstalled = () => {
    // Check if the wallet is already installed as a PWA or browser extension
    const installedWallets = JSON.parse(localStorage.getItem('installedCGWallets') || '[]');
    const isCurrentWalletInstalled = installedWallets.some((w: any) => 
      w.nftContract === walletData.nftContract && w.tokenId === walletData.tokenId
    );
    setIsInstalled(isCurrentWalletInstalled);
  };

  const installExtension = async () => {
    setIsInstalling(true);
    
    try {
      if (browserType === 'chrome' || browserType === 'edge') {
        await installChromeExtension();
      } else if (browserType === 'firefox') {
        await installFirefoxExtension();
      } else if (browserType === 'safari') {
        await installSafariExtension();
      } else {
        throw new Error('Browser no soportado');
      }
      
      // Mark as installed
      const installedWallets = JSON.parse(localStorage.getItem('installedCGWallets') || '[]');
      installedWallets.push({
        ...walletData,
        installedAt: new Date().toISOString(),
        browserType
      });
      localStorage.setItem('installedCGWallets', JSON.stringify(installedWallets));
      
      setIsInstalled(true);
      
    } catch (error) {
      console.error('❌ Error installing extension:', error);
      alert('Error al instalar la extensión: ' + (error as Error).message);
    } finally {
      setIsInstalling(false);
    }
  };

  const installChromeExtension = async () => {
    // Create a dynamic PWA manifest for this specific wallet
    const manifest = {
      name: `CG Wallet - ${walletData.name}`,
      short_name: walletData.name,
      description: `Tu CryptoGift Wallet NFT #${walletData.tokenId}`,
      start_url: `/token/${walletData.nftContract}/${walletData.tokenId}?wallet=open&pwa=true`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#f97316",
      orientation: "portrait",
      icons: [
        {
          src: walletData.image,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: walletData.image,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      categories: ["finance", "crypto", "wallet"],
      shortcuts: [
        {
          name: "Abrir Wallet",
          short_name: "Wallet",
          description: "Abrir mi CryptoGift Wallet",
          url: `/token/${walletData.nftContract}/${walletData.tokenId}?wallet=open`,
          icons: [{ src: walletData.image, sizes: "96x96" }]
        },
        {
          name: "Enviar",
          short_name: "Send",
          description: "Enviar criptomonedas",
          url: `/token/${walletData.nftContract}/${walletData.tokenId}?wallet=open&action=send`,
          icons: [{ src: "/icons/send.png", sizes: "96x96" }]
        }
      ]
    };

    // Try to trigger PWA installation
    if ('serviceWorker' in navigator) {
      try {
        // Register service worker if not already registered
        await navigator.serviceWorker.register('/sw.js');
        
        // Create dynamic manifest
        const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        
        // Create manifest link element
        const existingManifest = document.querySelector('link[rel="manifest"]');
        if (existingManifest) {
          existingManifest.remove();
        }
        
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = manifestUrl;
        document.head.appendChild(manifestLink);
        
        // Wait a moment for the manifest to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Trigger PWA install prompt if available
        if ((window as any).deferredPrompt) {
          const deferredPrompt = (window as any).deferredPrompt;
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`PWA install outcome: ${outcome}`);
          (window as any).deferredPrompt = null;
        } else {
          // Fallback: Show instructions
          showInstallInstructions();
        }
        
      } catch (error) {
        console.error('❌ PWA installation error:', error);
        showInstallInstructions();
      }
    } else {
      showInstallInstructions();
    }
  };

  const installFirefoxExtension = async () => {
    // Firefox PWA installation
    showInstallInstructions();
  };

  const installSafariExtension = async () => {
    // Safari PWA installation
    showInstallInstructions();
  };

  const showInstallInstructions = () => {
    const instructions = {
      chrome: [
        '1. Haz clic en los tres puntos (⋮) en la esquina superior derecha',
        '2. Selecciona "Instalar CG Wallet..."',
        '3. Confirma la instalación',
        'O busca el icono de instalación (⬇️) en la barra de direcciones'
      ],
      firefox: [
        '1. Haz clic en el menú (☰) en la esquina superior derecha',
        '2. Selecciona "Instalar esta aplicación"',
        '3. Confirma la instalación'
      ],
      safari: [
        '1. Haz clic en "Compartir" (□↗) en la barra de herramientas',
        '2. Selecciona "Añadir a la pantalla de inicio"',
        '3. Personaliza el nombre y confirma'
      ],
      edge: [
        '1. Haz clic en los tres puntos (...) en la esquina superior derecha',
        '2. Selecciona "Aplicaciones" > "Instalar esta aplicación"',
        '3. Confirma la instalación'
      ]
    };

    const browserInstructions = instructions[browserType] || ['Browser no soportado'];
    
    alert(`Para instalar tu CG Wallet como aplicación:\n\n${browserInstructions.join('\n')}\n\n💡 Una vez instalada, podrás acceder rápidamente a tu wallet desde tu escritorio o pantalla de inicio.`);
  };

  const uninstallExtension = () => {
    const installedWallets = JSON.parse(localStorage.getItem('installedCGWallets') || '[]');
    const filteredWallets = installedWallets.filter((w: any) => 
      !(w.nftContract === walletData.nftContract && w.tokenId === walletData.tokenId)
    );
    localStorage.setItem('installedCGWallets', JSON.stringify(filteredWallets));
    setIsInstalled(false);
  };

  const getBrowserIcon = () => {
    const icons = {
      chrome: '🟢',
      firefox: '🟠', 
      safari: '🔵',
      edge: '🔷',
      unsupported: '❓'
    };
    return icons[browserType];
  };

  const getBrowserName = () => {
    const names = {
      chrome: 'Chrome',
      firefox: 'Firefox',
      safari: 'Safari', 
      edge: 'Edge',
      unsupported: 'No Soportado'
    };
    return names[browserType];
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        {/* Browser Icon */}
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
          {getBrowserIcon()}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 mb-2">
            Extensión del Navegador
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Agrega tu wallet como extensión para acceso rápido desde {getBrowserName()}
          </p>
          
          {/* Status */}
          {isInstalled ? (
            <div className="flex items-center space-x-2 mb-4">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-green-600 font-medium">Instalada como PWA</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 mb-4">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span className="text-sm text-gray-500">No instalada</span>
            </div>
          )}
          
          {/* Action Button */}
          {!isInstalled ? (
            <button
              onClick={installExtension}
              disabled={isInstalling || browserType === 'unsupported'}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                browserType === 'unsupported'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
              }`}
            >
              {isInstalling ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Instalando...</span>
                </div>
              ) : browserType === 'unsupported' ? (
                'Navegador No Soportado'
              ) : (
                '📱 Instalar Extensión'
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => window.open(`/token/${walletData.nftContract}/${walletData.tokenId}?wallet=open&pwa=true`, '_blank')}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                🚀 Abrir App Instalada
              </button>
              <button
                onClick={uninstallExtension}
                className="w-full py-2 px-4 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
              >
                Desinstalar
              </button>
            </div>
          )}
          
          {/* Help text */}
          <p className="text-xs text-gray-500 mt-3">
            💡 La extensión te permitirá acceder a tu wallet directamente desde tu escritorio o pantalla de inicio
          </p>
        </div>
      </div>
    </div>
  );
};