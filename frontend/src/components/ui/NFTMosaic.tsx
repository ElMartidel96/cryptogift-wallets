'use client';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

const SAMPLE_NFTS = [
  '/api/placeholder/100/100?text=NFT1', // Placeholder URLs
  '/api/placeholder/100/100?text=NFT2',
  '/api/placeholder/100/100?text=NFT3',
  // ... más URLs de NFTs reales cuando estén disponibles
];

export function NFTMosaic() {
  const { theme } = useTheme();
  
  // Generar grid de 10x6 = 60 items como "Everydays"
  const mosaicItems = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    src: SAMPLE_NFTS[i % SAMPLE_NFTS.length],
    delay: Math.random() * 2
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* MOSAIC GRID BACKGROUND */}
      <motion.div
        className="absolute inset-0 grid grid-cols-10 gap-1 opacity-[var(--nft-mosaic-opacity)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 'var(--nft-mosaic-opacity)' }}
        transition={{ duration: 1 }}
      >
        {mosaicItems.map((item) => (
          <motion.div
            key={item.id}
            className="aspect-square bg-gradient-to-br from-blue-400 to-purple-600 
                       rounded-sm overflow-hidden"
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              delay: item.delay,
              duration: 0.6,
              ease: "backOut"
            }}
            whileHover={{ 
              scale: 1.1,
              zIndex: 10,
              opacity: 0.8
            }}
          >
            {/* PLACEHOLDER PARA NFT REAL */}
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-700 
                          flex items-center justify-center text-white text-xs font-bold">
              {item.id + 1}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* BLUR OVERLAY */}
      <div 
        className="absolute inset-0 backdrop-blur-[8px] 
                   bg-white/60 dark:bg-slate-900/70"
      />
    </div>
  );
}