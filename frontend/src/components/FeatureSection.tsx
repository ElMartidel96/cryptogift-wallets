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
    <section className="py-20 bg-bg-secondary dark:bg-bg-primary transition-colors duration-500">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 transition-colors duration-300">
            ¿Por qué CryptoGift Wallets?
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto transition-colors duration-300">
            Combinamos arte, tecnología y emociones para crear la experiencia de regalo cripto más humana del mundo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-2xl 
                       transition-all duration-300 border border-border-primary 
                       hover:border-accent-gold dark:hover:border-accent-silver"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} 
                             dark:from-accent-gold dark:to-accent-silver
                             rounded-2xl flex items-center justify-center mb-6 
                             group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-2xl filter dark:brightness-0 dark:invert">{feature.icon}</span>
              </div>
              
              <h3 className="text-xl font-bold text-text-primary mb-4 
                           group-hover:text-accent-gold dark:group-hover:text-accent-silver 
                           transition-colors duration-300">
                {feature.title}
              </h3>
              
              <p className="text-text-secondary leading-relaxed transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison Section */}
        <div className="mt-20 bg-bg-card rounded-3xl p-8 md:p-12 shadow-xl 
                      border border-border-primary transition-all duration-300">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-text-primary mb-12 transition-colors duration-300">
            Vs. Métodos Tradicionales
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Way */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-text-primary mb-6 flex items-center transition-colors duration-300">
                <span className="w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                               rounded-full flex items-center justify-center mr-3 text-sm transition-colors duration-300">✗</span>
                Métodos Tradicionales
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Exchanges complicados e intimidantes</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Comisiones altas y gas impredecible</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Riesgo de perder claves privadas</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-500 dark:text-red-400 mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Experiencia fría y técnica</span>
                </div>
              </div>
            </div>

            {/* CryptoGift Way */}
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-text-primary mb-6 flex items-center transition-colors duration-300">
                <span className="w-8 h-8 bg-green-100 dark:bg-accent-gold/20 text-green-600 dark:text-accent-gold 
                               rounded-full flex items-center justify-center mr-3 text-sm transition-colors duration-300">✓</span>
                CryptoGift Wallets
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Interfaz simple, como enviar un email</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Cero comisiones, gas patrocinado</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Recuperación social con guardianes</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 dark:text-accent-gold mr-3 mt-1 transition-colors duration-300">•</span>
                  <span className="text-text-secondary transition-colors duration-300">Experiencia emotiva y personal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};