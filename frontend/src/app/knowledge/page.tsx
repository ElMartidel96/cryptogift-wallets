"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface KnowledgeModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  duration: string;
  topics: string[];
  isLocked?: boolean;
  prerequisite?: string;
}

export default function KnowledgePage() {
  const [selectedCategory, setSelectedCategory] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const knowledgeModules: Record<string, KnowledgeModule[]> = {
    'getting-started': [
      {
        id: 'crypto-basics',
        title: '¿Qué es una Criptomoneda?',
        description: 'Conceptos fundamentales del dinero digital y blockchain',
        icon: '🪙',
        level: 'Básico',
        duration: '10 min',
        topics: ['Bitcoin', 'Ethereum', 'Wallets', 'Private Keys']
      },
      {
        id: 'wallet-basics',
        title: 'Tu Primera Wallet',
        description: 'Cómo crear y usar una billetera de criptomonedas',
        icon: '👛',
        level: 'Básico',
        duration: '15 min',
        topics: ['MetaMask', 'Seed Phrases', 'Seguridad', 'Backup']
      },
      {
        id: 'nft-intro',
        title: 'NFTs Explicado Simple',
        description: 'Qué son los NFTs y por qué son únicos',
        icon: '🖼️',
        level: 'Básico',
        duration: '12 min',
        topics: ['Tokens Únicos', 'Ownership', 'OpenSea', 'Metadata']
      }
    ],
    'platform-guide': [
      {
        id: 'cryptogift-basics',
        title: 'Cómo Funciona CryptoGift',
        description: 'Guía completa de nuestra plataforma',
        icon: '🎁',
        level: 'Básico',
        duration: '20 min',
        topics: ['NFT-Wallets', 'Gasless Transactions', 'TBA', 'Referrals']
      },
      {
        id: 'creating-gifts',
        title: 'Crear tu Primer Regalo',
        description: 'Tutorial paso a paso para regalar crypto',
        icon: '✨',
        level: 'Básico',
        duration: '25 min',
        topics: ['Upload Image', 'Add Funds', 'Share Link', 'Track Status']
      },
      {
        id: 'referral-system',
        title: 'Sistema de Referidos',
        description: 'Gana dinero invitando amigos',
        icon: '🌟',
        level: 'Intermedio',
        duration: '30 min',
        topics: ['Commission Structure', 'Tracking', 'Payments', 'Optimization']
      }
    ],
    'advanced-crypto': [
      {
        id: 'defi-basics',
        title: 'DeFi para Principiantes',
        description: 'Finanzas descentralizadas explicadas',
        icon: '🏦',
        level: 'Intermedio',
        duration: '45 min',
        topics: ['Lending', 'DEX', 'Yield Farming', 'Liquidity Pools'],
        isLocked: true,
        prerequisite: 'crypto-basics'
      },
      {
        id: 'smart-contracts',
        title: 'Smart Contracts 101',
        description: 'Contratos inteligentes y automatización',
        icon: '🤖',
        level: 'Avanzado',
        duration: '60 min',
        topics: ['Ethereum', 'Solidity', 'Gas', 'Security'],
        isLocked: true,
        prerequisite: 'defi-basics'
      }
    ],
    'security': [
      {
        id: 'wallet-security',
        title: 'Seguridad de Wallets',
        description: 'Protege tus fondos como un experto',
        icon: '🔐',
        level: 'Intermedio',
        duration: '35 min',
        topics: ['Hardware Wallets', 'Phishing', '2FA', 'Cold Storage']
      },
      {
        id: 'scam-protection',
        title: 'Evitar Estafas Crypto',
        description: 'Reconoce y evita las estafas más comunes',
        icon: '🛡️',
        level: 'Básico',
        duration: '20 min',
        topics: ['Rug Pulls', 'Fake Tokens', 'Social Engineering', 'Red Flags']
      }
    ]
  };

  const categories = [
    { id: 'getting-started', name: 'Primeros Pasos', icon: '🚀', color: 'bg-blue-50 text-blue-700' },
    { id: 'platform-guide', name: 'Guía CryptoGift', icon: '🎁', color: 'bg-purple-50 text-purple-700' },
    { id: 'advanced-crypto', name: 'Crypto Avanzado', icon: '⚡', color: 'bg-yellow-50 text-yellow-700' },
    { id: 'security', name: 'Seguridad', icon: '🔒', color: 'bg-red-50 text-red-700' }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Básico': return 'bg-green-100 text-green-800';
      case 'Intermedio': return 'bg-yellow-100 text-yellow-800';
      case 'Avanzado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentModules = knowledgeModules[selectedCategory] || [];
  const filteredModules = currentModules.filter(module => 
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 
                   dark:from-bg-primary dark:via-bg-secondary dark:to-bg-primary transition-all duration-500">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 flex items-center justify-center 
                          bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 
                          rounded-2xl shadow-lg dark:shadow-blue-500/20 border border-blue-200/50 dark:border-blue-500/30 
                          backdrop-blur-sm transition-all duration-300">
              <Image
                src="/knowledge-logo.png"
                alt="Knowledge"
                width={56}
                height={56}
                className="object-contain drop-shadow-lg"
              />
            </div>
            <h1 className="text-4xl font-bold text-text-primary transition-colors duration-300">
              CryptoGift Knowledge Academy
            </h1>
          </div>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto transition-colors duration-300">
            Aprende cripto de forma simple y didáctica. Desde conceptos básicos hasta estrategias avanzadas.
            <br />
            <span className="text-purple-600 dark:text-accent-gold font-medium transition-colors duration-300">Todo lo que necesitas para dominar el mundo cripto</span>
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="🔍 Buscar temas, tutoriales, conceptos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-border-primary bg-bg-card text-text-primary
                       focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-accent-gold 
                       text-lg transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-muted 
                         hover:text-text-secondary transition-colors duration-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedCategory === category.id
                  ? category.color + ' dark:bg-accent-gold/20 dark:text-accent-gold shadow-lg scale-105'
                  : 'bg-bg-card text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-bg-card p-6 rounded-2xl shadow-sm text-center transition-colors duration-300">
            <div className="text-3xl font-bold text-blue-600 dark:text-accent-gold transition-colors duration-300">50+</div>
            <div className="text-sm text-text-secondary transition-colors duration-300">Lecciones Disponibles</div>
          </div>
          <div className="bg-bg-card p-6 rounded-2xl shadow-sm text-center transition-colors duration-300">
            <div className="text-3xl font-bold text-green-600 dark:text-accent-silver transition-colors duration-300">15h</div>
            <div className="text-sm text-text-secondary transition-colors duration-300">Contenido Total</div>
          </div>
          <div className="bg-bg-card p-6 rounded-2xl shadow-sm text-center transition-colors duration-300">
            <div className="text-3xl font-bold text-purple-600 dark:text-accent-gold transition-colors duration-300">98%</div>
            <div className="text-sm text-text-secondary transition-colors duration-300">Satisfacción</div>
          </div>
          <div className="bg-bg-card p-6 rounded-2xl shadow-sm text-center transition-colors duration-300">
            <div className="text-3xl font-bold text-orange-600 dark:text-accent-silver transition-colors duration-300">24/7</div>
            <div className="text-sm text-text-secondary transition-colors duration-300">Asistente AI</div>
          </div>
        </div>

        {/* Knowledge Modules */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map(module => (
            <div
              key={module.id}
              className={`bg-bg-card rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${
                module.isLocked ? 'opacity-75' : 'cursor-pointer hover:scale-105'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{module.icon}</div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(module.level)}`}>
                      {module.level}
                    </span>
                    {module.isLocked && (
                      <span className="px-2 py-1 bg-bg-secondary dark:bg-bg-primary text-text-secondary 
                                     rounded-full text-xs font-medium transition-colors duration-300">
                        🔒 Bloqueado
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-text-primary mb-2 transition-colors duration-300">
                  {module.title}
                </h3>
                
                <p className="text-text-secondary mb-4 text-sm transition-colors duration-300">
                  {module.description}
                </p>

                <div className="flex items-center justify-between text-sm text-text-muted mb-4 transition-colors duration-300">
                  <span>⏱️ {module.duration}</span>
                  <span>📖 {module.topics.length} temas</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {module.topics.slice(0, 3).map(topic => (
                    <span key={topic} className="px-2 py-1 bg-bg-secondary dark:bg-bg-primary text-text-secondary 
                                               rounded text-xs transition-colors duration-300">
                      {topic}
                    </span>
                  ))}
                  {module.topics.length > 3 && (
                    <span className="px-2 py-1 bg-bg-secondary dark:bg-bg-primary text-text-secondary 
                                   rounded text-xs transition-colors duration-300">
                      +{module.topics.length - 3} más
                    </span>
                  )}
                </div>

                {module.isLocked ? (
                  <div className="text-center py-3">
                    <p className="text-sm text-text-muted mb-2 transition-colors duration-300">
                      Completa &quot;{module.prerequisite}&quot; para desbloquear
                    </p>
                    <button className="px-4 py-2 bg-bg-secondary dark:bg-bg-primary text-text-muted 
                                     rounded-lg cursor-not-allowed transition-colors duration-300">
                      🔒 Bloqueado
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/knowledge/${module.id}`}
                    className="block w-full text-center py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                             dark:from-accent-gold dark:to-accent-silver text-white dark:text-bg-primary 
                             rounded-lg font-medium hover:opacity-90 transition-all duration-300"
                  >
                    🚀 Comenzar Lección
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI Assistant Banner */}
        <div className="mt-12 bg-gradient-to-r from-indigo-500 to-purple-600 
                       dark:from-accent-gold dark:to-accent-silver rounded-2xl p-8 
                       text-white dark:text-bg-primary transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">🤖 Asistente AI Cripto</h3>
              <p className="text-indigo-100 dark:text-bg-secondary mb-4 transition-colors duration-300">
                ¿Tienes dudas específicas? Nuestro asistente AI está aquí 24/7 para ayudarte con cualquier pregunta sobre cripto.
              </p>
              <ul className="text-sm text-indigo-100 dark:text-bg-secondary space-y-1 transition-colors duration-300">
                <li>✨ Respuestas personalizadas a tus preguntas</li>
                <li>🎯 Recomendaciones de aprendizaje</li>
                <li>🔗 Enlaces a lecciones relevantes</li>
                <li>📊 Seguimiento de tu progreso</li>
              </ul>
            </div>
            <div className="ml-8">
              <button className="bg-white dark:bg-bg-primary text-indigo-600 dark:text-accent-gold px-8 py-4 
                               rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-bg-secondary 
                               transition-all duration-300">
                💬 Chatear Ahora
              </button>
            </div>
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="mt-8 bg-bg-card rounded-2xl p-6 transition-colors duration-300">
          <h3 className="text-xl font-bold text-text-primary mb-4 transition-colors duration-300">📈 Tu Progreso de Aprendizaje</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                <span className="text-2xl font-bold text-green-600 dark:text-accent-gold transition-colors duration-300">75%</span>
              </div>
              <div className="text-sm text-text-secondary transition-colors duration-300">Básico Completado</div>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-accent-silver/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                <span className="text-2xl font-bold text-yellow-600 dark:text-accent-silver transition-colors duration-300">45%</span>
              </div>
              <div className="text-sm text-text-secondary transition-colors duration-300">Intermedio en Progreso</div>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-bg-secondary dark:bg-bg-primary rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
                <span className="text-2xl font-bold text-text-muted transition-colors duration-300">0%</span>
              </div>
              <div className="text-sm text-text-secondary transition-colors duration-300">Avanzado Pendiente</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}