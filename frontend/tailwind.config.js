/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        navy: '#0c1a14',
        blue: '#1a3d2e',
        forest: '#14532d',
        accent: '#34d399',
        accent2: '#5eead4',
        frost: '#a7f3d0',
        glass: 'rgba(255,255,255,0.08)',
        border: 'rgba(255,255,255,0.18)',
        text: '#ecfdf5',
      },
      backdropBlur: {
        glass: '14px',
      },
      boxShadow: {
        'glass-glow': '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 48px rgba(52, 211, 153, 0.1)',
        'glass-glow-lg': '0 12px 40px rgba(0, 0, 0, 0.3), 0 0 64px rgba(94, 234, 212, 0.12)',
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'mesh-drift': 'mesh-drift 20s ease-in-out infinite alternate',
        'logo-pulse': 'logo-pulse 2s ease-in-out infinite',
        'ecg-draw': 'ecg-draw 2.4s ease-in-out infinite',
        'shield-glow': 'shield-glow 3s ease-in-out infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'mesh-drift': {
          '0%': { transform: 'scale(1) translate(0, 0)', opacity: '0.2' },
          '100%': { transform: 'scale(1.04) translate(-1%, 1%)', opacity: '0.35' },
        },
        'logo-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.12)', opacity: '0.15' },
        },
        'ecg-draw': {
          '0%': { strokeDashoffset: '120' },
          '50%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-120' },
        },
        'shield-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.4))' },
          '50%': { filter: 'drop-shadow(0 0 10px rgba(94, 234, 212, 0.7))' },
        },
      },
    },
  },
  plugins: [],
}
