'use client';
import { motion } from 'framer-motion';
import { NFTMosaic } from '../ui/NFTMosaic';
import { ThemeToggle } from '../ui/ThemeToggle';

export function GlassHeader({ children }: { children: React.ReactNode }) {
  return (
    <motion.header
      className="relative glass-panel border-0 border-b border-white/20 dark:border-slate-700/30"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* NFT MOSAIC BACKGROUND */}
      <NFTMosaic />
      
      {/* HEADER CONTENT */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {/* LOGO Y TITULO */}
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                         bg-clip-text text-transparent">
            CryptoGift Wallets
          </h1>
          
          {/* THEME TOGGLE */}
          <ThemeToggle />
        </div>
        
        {/* NAVEGACIÓN U OTROS ELEMENTOS */}
        <div className="flex items-center space-x-4">
          {children}
        </div>
      </div>
    </motion.header>
  );
}