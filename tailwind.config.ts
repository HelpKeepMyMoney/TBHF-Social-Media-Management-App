import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm nonprofit palette
        brand: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f4dbb2',
          300: '#ecc07d',
          400: '#e39d47',
          500: '#d97706', // amber-600 — primary
          600: '#c2670f',
          700: '#9a5210',
          800: '#7c4214',
          900: '#653714',
          950: '#391b08',
        },
        surface: {
          DEFAULT: '#ffffff',
          warm:    '#faf9f7',
          muted:   '#f5f3ef',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
