import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // ← CRÍTICO para next-themes
  theme: {
    extend: {
      colors: {
        // LIGHT THEME PALETTE
        primary: {
          50: '#fef7ee',
          100: '#fdeacc', 
          500: '#fb923c', // Golden accent
          600: '#ea580c',
          900: '#9a3412'
        },
        // DARK THEME PALETTE  
        dark: {
          50: '#f8fafc',
          100: '#1e293b',
          800: '#0f172a',
          900: '#020617'
        },
        // SEMANTIC COLORS (auto dark variants)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        accent: 'hsl(var(--accent))',
        muted: 'hsl(var(--muted))',
        'card-bg': 'hsl(var(--card-bg))',
        border: 'hsl(var(--border))',
        'input-bg': 'hsl(var(--input-bg))',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'theme-transition': 'theme-fade 0.3s ease-in-out',
        'sun-rotate': 'rotate 20s linear infinite',
        'moon-glow': 'glow 2s ease-in-out infinite alternate',
        'panel-slide': 'slide-down 0.2s ease-out'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'theme-fade': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'glow': {
          '0%': { filter: 'drop-shadow(0 0 5px rgba(148, 163, 184, 0.5))' },
          '100%': { filter: 'drop-shadow(0 0 15px rgba(148, 163, 184, 0.8))' }
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate')
  ],
};
export default config;
