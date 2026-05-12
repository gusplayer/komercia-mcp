import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config}
 *
 * Minimal Tailwind config — the site uses scoped <style> blocks per
 * Astro page (terminal aesthetic / 099 design system), so Tailwind
 * just provides the base reset + a handful of utility classes
 * (`hidden`, `flex`, `grid`) we still reference inline.
 */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Space Mono', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
};
