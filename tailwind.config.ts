import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // MAYA LEX brand palette
        jade: {
          DEFAULT: '#2D9B8A',
          light: '#3DB8A5',
          dark: '#1E6B5E',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E0BF6E',
          dark: '#9A7B30',
        },
        navy: {
          DEFAULT: '#0D1B3E',
          light: '#1A2F5A',
          medium: '#243E73',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-maya': 'linear-gradient(135deg, #2D9B8A 0%, #C9A84C 100%)',
        'gradient-navy': 'linear-gradient(180deg, #0D1B3E 0%, #1A2F5A 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        typing: {
          '0%, 60%, 100%': { opacity: '1' },
          '30%': { opacity: '0.4' },
        },
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('@tailwindcss/typography')],
};

export default config;
