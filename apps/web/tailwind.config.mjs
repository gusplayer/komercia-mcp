/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#14b8a6',
          hover: '#0d9488',
          subtle: '#134e4a',
        },
        dark: {
          bg: '#0a0e1a',
          surface: '#0f1420',
          elevated: '#1a2030',
          border: '#1e2638',
          'border-md': '#2a3548',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '7xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        '3xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.6s ease forwards',
        blink: 'blink 1s step-end infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      backgroundImage: {
        'dot-dark': 'radial-gradient(circle at 1px 1px, rgb(42 53 72 / 0.6) 1px, transparent 0)',
        'dot-light': 'radial-gradient(circle at 1px 1px, rgb(203 213 225 / 0.7) 1px, transparent 0)',
        'glow-teal': 'radial-gradient(ellipse 900px 500px at 50% -60px, rgb(20 184 166 / 0.1), transparent)',
      },
      backgroundSize: {
        dot: '28px 28px',
      },
      boxShadow: {
        'teal-glow': '0 0 60px -10px rgb(20 184 166 / 0.3)',
        'card-dark': '0 1px 3px rgb(0 0 0 / 0.5)',
        'card-light': '0 1px 3px rgb(0 0 0 / 0.08)',
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
};
