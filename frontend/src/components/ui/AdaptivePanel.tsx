'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AdaptivePanelProps {
  children: ReactNode;
  className?: string;
}

export function AdaptivePanel({ children, className = '' }: AdaptivePanelProps) {
  return (
    <motion.div
      className={`glass-panel rounded-2xl p-6 shadow-xl
                  hover:shadow-2xl transition-all duration-300
                  ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -4 }}
    >
      {children}
    </motion.div>
  );
}