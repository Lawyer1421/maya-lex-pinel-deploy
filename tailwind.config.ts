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
        // MAYA LEX brand palette (V1 — se conserva sin cambios, en uso en /chat, /cuenta, etc.)
        jade: {
          DEFAULT: '#2D9B8A',
          light: '#3DB8A5',
          dark: '#1E6B5E',
          // V2: fondo de CTA primario — jade profundo con contraste ≥4.5:1
          // frente a texto blanco (WCAG AA texto normal). #2D9B8A queda para
          // acentos no textuales y texto jade sobre obsidiana.
          deep: '#17796A',
        },
        gold: {
          // Oro institucional: c5a880 (tono champán, texto/bordes de reposo)
          // y d4af37 (oro vivo, hover/énfasis) — pedidos explícitamente para
          // la identidad Enterprise/Luxury Legal Tech.
          DEFAULT: '#c5a880',
          light: '#d4af37',
          dark: '#9c8560',
        },
        navy: {
          DEFAULT: '#0D1B3E',
          light: '#1A2F5A',
          medium: '#243E73',
        },
        // MAYA LEX V2 — "Enterprise / Luxury Legal Tech" (rediseño Exequátur +
        // identidad institucional). Base azul noche profundo con acentos en
        // oro institucional — reemplaza el negro puro anterior. Los alias
        // obsidian.* se conservan (mismas clases ya usadas en todo V2:
        // bg-obsidian, border-obsidian-medium, etc.) para que el rebrand
        // se propague sin tocar cada componente.
        obsidian: {
          DEFAULT: '#060d1a',
          light: '#0d1830',
          medium: '#16233f',
        },
        ivory: {
          DEFAULT: '#F6F2E9',
          dim: '#E9E2D2',
          muted: '#C9C0AA',
        },
        verify: {
          DEFAULT: '#3FAE68',
          light: '#5FC988',
          dark: '#2A7C48',
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
