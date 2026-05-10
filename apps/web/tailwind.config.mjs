import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /* ── Color palette ─────────────────────────────────────────────
         Mirrors the CSS custom properties in global.css. Use these in
         Tailwind utility classes (e.g. bg-ghost-white, text-deep-plum).
         ────────────────────────────────────────────────────────────── */
      colors: {
        'ink-blue': '#011821',
        'code-black': '#000000',
        'ghost-white': '#ffffff',
        'fog-gray': '#f6f6f8',
        'steel-gray': '#e3e4e8',
        charcoal: '#232730',
        'slate-text': '#7c7f88',
        graphite: '#121610',
        'deep-plum': '#111a4a',
        'action-orange': '#ec652b',
        'faded-grid-blue': '#023247',
        'success-moss': '#44b48b',
        'info-blue': '#7ea7e9',
        'callout-cyan': '#167e6c',
        'notification-teal': '#88deeb',
      },

      /* ── Font families ─────────────────────────────────────────── */
      fontFamily: {
        display: ['Inter', ...defaultTheme.fontFamily.sans],
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['IBM Plex Mono', ...defaultTheme.fontFamily.mono],
      },

      /* ── Type scale ────────────────────────────────────────────── */
      fontSize: {
        caption: ['10px', { lineHeight: '1.5' }],
        'body-sm': ['12px', { lineHeight: '1.5' }],
        body: ['14px', { lineHeight: '1.5', letterSpacing: '-0.28px' }],
        'body-lg': ['16px', { lineHeight: '1.5' }],
        subheading: ['18px', { lineHeight: '1.4', letterSpacing: '-0.36px' }],
        'heading-sm': ['24px', { lineHeight: '1.33', letterSpacing: '-0.48px' }],
        heading: ['40px', { lineHeight: '1.1', letterSpacing: '-0.8px' }],
        display: ['48px', { lineHeight: '1', letterSpacing: '-1.44px' }],
        'display-lg': ['60px', { lineHeight: '1', letterSpacing: '-1.8px' }],
      },

      /* ── Spacing — base 4px ────────────────────────────────────── */
      spacing: {
        4: '4px',
        8: '8px',
        12: '12px',
        16: '16px',
        20: '20px',
        24: '24px',
        32: '32px',
        40: '40px',
        48: '48px',
        64: '64px',
        72: '72px',
        80: '80px',
        96: '96px',
        100: '100px',
        144: '144px',
      },

      /* ── Border radius ─────────────────────────────────────────── */
      borderRadius: {
        sm: '2px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },

      /* ── Shadows ───────────────────────────────────────────────── */
      boxShadow: {
        subtle:
          'rgba(17,26,74,0.1) 0px 1px 3px 0px, rgba(17,26,74,0.05) 0px 1px 0px 0px, rgba(255,255,255,0.5) 0px 1px 0px 0px inset, rgba(255,255,255,0.5) 0px 1px 4px 0px inset',
        card:
          'rgba(17,26,74,0.05) 0px 0px 0px 1px, rgba(0,0,0,0.1) 0px 1px 2px 0px, rgba(255,255,255,0.5) 0px 0px 0px 1px inset',
        sm:
          'rgba(0,0,0,0.05) 0px 4px 8px 0px, rgba(0,0,0,0.1) 0px 2px 4px 0px, rgba(0,0,0,0.1) 0px 1px 1px 0px',
        xl:
          'rgba(0,0,0,0.02) 0px 40px 32px 0px, rgba(0,0,0,0.03) 0px 22px 18px 0px, rgba(0,0,0,0.03) 0px 12px 10px 0px, rgba(0,0,0,0.04) 0px 7px 5px 0px, rgba(0,0,0,0.07) 0px 3px 2px 0px',
        callout:
          'rgba(0,0,0,0.1) 0px 4px 8px 0px, rgba(0,0,0,0.1) 0px 2px 4px 0px, rgba(0,0,0,0.25) 0px 1px 1px 0px',
      },

      /* ── Background images / gradients ─────────────────────────── */
      backgroundImage: {
        'gradient-soft-horizon':
          'linear-gradient(125deg, rgb(214,86,32) -3.16%, rgb(159,122,238) 14.55%, rgb(69,117,205) 32.26%, rgb(113,210,240) 49.97%, rgb(68,180,139) 67.68%, rgb(244,223,105) 85.39%)',
        'gradient-radial-twilight':
          'radial-gradient(29.88% 184.91% at 6.55% -48.11%, rgb(119,28,134) 0%, rgb(17,26,74) 100%)',
      },

      /* ── Layout maxWidths ──────────────────────────────────────── */
      maxWidth: {
        page: '1200px',
        narrow: '720px',
      },

      /* ── Animations ────────────────────────────────────────────── */
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [],
};
