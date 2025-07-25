'use client';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center space-x-1">
        <Sun size={14} className="text-accent-gold" />
        <span className="text-xs font-medium text-accent-gold">Light</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* TOGGLE PRINCIPAL - SOLO SILUETAS SIN CONTORNOS */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 transition-all duration-300 hover:opacity-80"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {theme === 'dark' ? (
          <>
            <Moon 
              size={14} 
              className="text-accent-silver animate-moon-glow" 
            />
            <span className="text-xs font-medium text-accent-silver">Dark</span>
          </>
        ) : (
          <>
            <Sun 
              size={14} 
              className="text-accent-gold animate-sun-rotate" 
            />
            <span className="text-xs font-medium text-accent-gold">Light</span>
          </>
        )}
      </motion.button>

      {/* PANEL DESPLEGABLE MINIMALISTA */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 right-0 w-40 
                       glass-panel rounded-xl shadow-2xl p-2 z-50"
          >
            {/* MODO CLARO */}
            <motion.button
              onClick={() => {
                setTheme('light');
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-2 p-2 rounded-lg text-sm
                         transition-colors duration-200 ${
                theme === 'light' 
                  ? 'bg-accent-gold/20 text-accent-gold' 
                  : 'hover:bg-bg-secondary text-text-secondary'
              }`}
              whileHover={{ x: 2 }}
            >
              <Sun size={14} className="text-accent-gold" />
              <span className="text-accent-gold">Light</span>
            </motion.button>

            {/* MODO OSCURO */}
            <motion.button
              onClick={() => {
                setTheme('dark');
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-2 p-2 rounded-lg text-sm mt-1
                         transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'bg-accent-silver/20 text-accent-silver' 
                  : 'hover:bg-bg-secondary text-text-secondary'
              }`}
              whileHover={{ x: 2 }}
            >
              <Moon 
                size={14} 
                className="text-accent-silver" 
              />
              <span className="text-accent-silver">Dark</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY PARA CERRAR */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}