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
      <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-200 text-gray-600">
        <Sun size={16} />
        <span className="text-sm font-medium">Light</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* TOGGLE PRINCIPAL - MINIMALISTA SEGÚN TEMA */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-lg hover:shadow-xl' 
            : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg hover:shadow-xl'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {theme === 'dark' ? (
          <>
            <Moon 
              size={16} 
              className="animate-moon-glow" 
            />
            <span className="text-sm font-medium">Dark</span>
          </>
        ) : (
          <>
            <Sun 
              size={16} 
              className="animate-sun-rotate" 
            />
            <span className="text-sm font-medium">Light</span>
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
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              whileHover={{ x: 2 }}
            >
              <Sun size={16} className="text-yellow-500" />
              <span>Light</span>
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
                  ? 'bg-gradient-to-r from-slate-400 to-slate-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              whileHover={{ x: 2 }}
            >
              <Moon 
                size={16} 
                className="text-slate-400" 
              />
              <span>Dark</span>
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