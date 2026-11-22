/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Brand: deep forest green scale
        forest: {
          50: '#f2f8f4',
          100: '#e0efe5',
          200: '#c2dfcd',
          300: '#95c7aa',
          400: '#63a881',
          500: '#408b62',
          600: '#2f6f4e',
          700: '#285940',
          800: '#224735',
          900: '#1d3b2d',
          950: '#0f211a',
        },
        // Soft green accent for savings/healthy
        sage: {
          50: '#f4f9f2',
          100: '#e5f1e1',
          200: '#cbe3c4',
          300: '#a5cf98',
          400: '#7cb56c',
          500: '#5c9a4b',
          600: '#467c39',
          700: '#39632f',
          800: '#304f29',
          900: '#294324',
        },
        // Restrained amber for warnings
        amber2: {
          50: '#fdf9ec',
          100: '#f9efcd',
          200: '#f2dc9b',
          300: '#e9c263',
          400: '#e2a93c',
          500: '#d99726',
          600: '#bd761e',
          700: '#9c581c',
          800: '#80461d',
          900: '#693a1c',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 42 30 / 0.05), 0 1px 3px 0 rgb(16 42 30 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(16 42 30 / 0.1), 0 2px 4px -2px rgb(16 42 30 / 0.06)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
