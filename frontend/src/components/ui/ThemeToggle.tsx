'use client';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* TOGGLE PRINCIPAL - SOL DORADO */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1 rounded-full 
                   bg-gradient-to-r from-yellow-400 to-orange-500 
                   text-white shadow-lg hover:shadow-xl
                   transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sun 
          size={16} 
          className={`transition-transform duration-300 ${
            theme === 'light' ? 'animate-sun-rotate' : ''
          }`} 
        />
        <span className="text-sm font-medium">Light</span>
      </motion.button>

      {/* PANEL DESPLEGABLE MINIMALISTA */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 left-0 w-48 
                       glass-panel rounded-xl shadow-2xl p-3 z-50
                       animate-panel-slide"
          >
            {/* MODO CLARO */}
            <motion.button
              onClick={() => {
                setTheme('light');
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg
                         transition-colors duration-200 ${
                theme === 'light' 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              whileHover={{ x: 4 }}
            >
              <Sun size={18} className="text-yellow-500" />
              <span className="text-sm font-medium">Light Mode</span>
            </motion.button>

            {/* MODO OSCURO */}
            <motion.button
              onClick={() => {
                setTheme('dark');
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg
                         transition-colors duration-200 mt-1 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-slate-600 to-slate-800 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              whileHover={{ x: 4 }}
            >
              <Moon 
                size={18} 
                className={`text-slate-400 ${
                  theme === 'dark' ? 'animate-moon-glow' : ''
                }`} 
              />
              <span className="text-sm font-medium">Dark Mode</span>
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