import React from 'react';

interface HeroSectionProps {
  onCreateGift: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onCreateGift }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-white opacity-10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute -bottom-8 -right-4 w-96 h-96 bg-yellow-300 opacity-10 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300 opacity-10 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
        {/* NFT Preview Mockup */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
            <div className="w-80 h-80 bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-blue-500 rounded-2xl mb-4 flex items-center justify-center">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-white">
                <h3 className="font-bold text-lg mb-2">Tu Regalo Cripto</h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-75">Balance:</span>
                  <span className="font-semibold">50 USDC</span>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-white font-bold">💎</span>
            </div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-sm">🎁</span>
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Regala el
          <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
            Futuro
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
          Crea NFT-wallets únicos con arte IA y criptomonedas reales. 
          La forma más emotiva de introducir a tus amigos al mundo blockchain.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={onCreateGift}
            className="group relative px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
          >
            <span className="relative z-10">Crear mi Regalo</span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-pink-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <div className="flex items-center text-white/60">
            <span className="text-sm">Sin comisiones • Gas gratis • 2 min</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto text-white">
          <div className="text-center">
            <div className="text-3xl font-bold">$2M+</div>
            <div className="text-sm opacity-75">Regalado</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">50K+</div>
            <div className="text-sm opacity-75">NFT-Wallets</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">98%</div>
            <div className="text-sm opacity-75">Satisfacción</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
};