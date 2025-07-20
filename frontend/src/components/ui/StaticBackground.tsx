'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function StaticBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* GRADIENT BASE ANIMADO */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br 
                   from-blue-50 via-indigo-50 to-purple-50
                   dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950"
        animate={{
          background: [
            "linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #faf5ff 100%)",
            "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f0f9ff 100%)",
            "linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #faf5ff 100%)"
          ]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* PARTÍCULAS FLOTANTES */}
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-blue-200 dark:bg-blue-800 rounded-full opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: Math.random() * 10 + 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}

      {/* EFECTO PARALLAX CON MOUSE */}
      <motion.div
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
                      rgba(59, 130, 246, 0.3) 0%, transparent 50%)`
        }}
      />

      {/* GRID PATTERN SUTIL */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
    </div>
  );
}