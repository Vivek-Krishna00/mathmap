/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS variables so dark mode is automatic.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        // Blueprint primary: deep azure. 600 is the primary fill, 500 the lighter hover.
        brand: {
          50: '#EEF4FB',
          100: '#DCE8F6',
          200: '#B9D0EC',
          300: '#8CB2DE',
          400: '#5A8FCC',
          500: '#2E6FB4',
          600: '#1B4F8F',
          700: '#17427A',
          800: '#123564',
          900: '#0E2A4E',
          950: '#081A33',
        },
        // Single warm accent, used sparingly for highlights only.
        accent: {
          50: '#FBF6EA',
          100: '#F5E9CE',
          200: '#EBD3A0',
          300: '#DDB96D',
          400: '#C99A3F',
          500: '#B4761A',
          600: '#96600F',
          700: '#784D0E',
          800: '#5C3B0E',
          900: '#40290A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(13 17 23 / 0.04), 0 8px 24px -12px rgb(13 17 23 / 0.12)',
        pop: '0 12px 40px -12px rgb(13 17 23 / 0.30)',
      },
      borderRadius: {
        xl: '0.85rem',
        '2xl': '1.15rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          // Ends on `none`, not translateY(0): a retained transform would make the
          // route wrapper a containing block for position:fixed descendants.
          '100%': { opacity: '1', transform: 'none' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
