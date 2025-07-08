import React from 'react';

export const FeatureSection: React.FC = () => {
  const features = [
    {
      icon: '🎨',
      title: 'Arte IA Personalizado',
      description: 'Convierte cualquier foto en arte único con filtros de inteligencia artificial profesionales.',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: '💎',
      title: 'NFT = Wallet Real',
      description: 'Cada NFT es una wallet funcional que guarda criptomonedas reales usando tecnología ERC-6551.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '⚡',
      title: 'Gas Patrocinado',
      description: 'Todas las transacciones son gratuitas para el usuario final. Nosotros pagamos el gas.',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: '🔒',
      title: 'Recuperación Social',
      description: 'Sistema de guardianes para recuperar el acceso sin depender de frases semilla complicadas.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: '🔄',
      title: 'Swap Integrado',
      description: 'Cambia entre diferentes criptomonedas directamente desde la wallet del NFT con un clic.',
      color: 'from-purple-500 to-violet-500'
    },
    {
      icon: '📊',
      title: 'Transparencia Total',
      description: 'Todas las reservas son auditables on-chain. Dashboard público con estadísticas en tiempo real.',
      color: 'from-indigo-500 to-blue-600'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            ¿Por qué CryptoGift Wallets?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Combinamos arte, tecnología y emociones para crear la experiencia de regalo cripto más humana del mundo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-gray-200"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-4 group-hover:text-gray-900">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison Section */}
        <div className="mt-20 bg-white rounded-3xl p-8 md:p-12 shadow-xl">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-12">
            Vs. Métodos Tradicionales
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Way */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-gray-700 mb-6 flex items-center">
                <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center mr-3 text-sm">✗</span>
                Métodos Tradicionales
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">•</span>
                  <span className="text-gray-600">Exchanges complicados e intimidantes</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">•</span>
                  <span className="text-gray-600">Comisiones altas y gas impredecible</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">•</span>
                  <span className="text-gray-600">Riesgo de perder claves privadas</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">•</span>
                  <span className="text-gray-600">Experiencia fría y técnica</span>
                </div>
              </div>
            </div>

            {/* CryptoGift Way */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-gray-700 mb-6 flex items-center">
                <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 text-sm">✓</span>
                CryptoGift Wallets
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">•</span>
                  <span className="text-gray-600">Interfaz simple, como enviar un email</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">•</span>
                  <span className="text-gray-600">Cero comisiones, gas patrocinado</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">•</span>
                  <span className="text-gray-600">Recuperación social con guardianes</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">•</span>
                  <span className="text-gray-600">Experiencia emotiva y personal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};