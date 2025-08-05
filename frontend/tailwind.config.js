/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      width: {
        192: '42rem', // 192 * 0.25rem
      },
      colors: {
        kubeprimary: '#2f86ff',
        accent: {
          blue: {
            light: '#3b82f6',
            DEFAULT: '#2563eb',
            dark: '#1d4ed8',
          },
          purple: {
            light: '#a78bfa',
            DEFAULT: '#8b5cf6',
            dark: '#7c3aed',
          },
          green: {
            light: '#4ade80',
            DEFAULT: '#22c55e',
            dark: '#16a34a',
          },
          red: {
            light: '#f87171',
            DEFAULT: '#ef4444',
            dark: '#dc2626',
          },
          amber: {
            light: '#fbbf24',
            DEFAULT: '#f59e0b',
            dark: '#d97706',
          },
        },
        kubestellar: {
          50: '#f0f7ff',
          100: '#e0f0ff',
          200: '#baddff',
          300: '#86c1ff',
          400: '#499dff',
          500: '#2f86ff', // Primary
          600: '#1a66ff',
          700: '#1554ed',
          800: '#1744bc',
          900: '#193d94',
        },
      },
      boxShadow: {
        'glass-light':
          '0 4px 6px -1px rgba(255, 255, 255, 0.1), 0 2px 4px -2px rgba(255, 255, 255, 0.05)',
        'glass-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        kubeprimary:
          '0 4px 15px -3px rgba(47, 134, 255, 0.3), 0 2px 8px -2px rgba(47, 134, 255, 0.1)',
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.9 },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['light'],
          primary: '#2563eb',
          'primary-focus': '#1d4ed8',
          'primary-content': '#ffffff',

          secondary: '#8b5cf6',
          'secondary-focus': '#7c3aed',
          'secondary-content': '#ffffff',

          accent: '#22c55e',
          'accent-focus': '#16a34a',
          'accent-content': '#ffffff',

          neutral: '#334155',
          'neutral-focus': '#1e293b',
          'neutral-content': '#ffffff',

          'base-100': '#f8fafc',
          'base-200': '#f1f5f9',
          'base-300': '#e2e8f0',
          'base-content': '#1e293b',

          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.5rem',
          '--rounded-badge': '0.5rem',
          '--animation-btn': '0.2s',
          '--animation-input': '0.2s',
          '--btn-focus-scale': '0.95',
          '--tab-radius': '0.5rem',
        },
        dark: {
          ...require('daisyui/src/theming/themes')['dark'],
          primary: '#3b82f6',
          'primary-focus': '#2563eb',
          'primary-content': '#ffffff',

          secondary: '#a78bfa',
          'secondary-focus': '#8b5cf6',
          'secondary-content': '#ffffff',

          accent: '#4ade80',
          'accent-focus': '#22c55e',
          'accent-content': '#ffffff',

          neutral: '#94a3b8',
          'neutral-focus': '#cbd5e1',
          'neutral-content': '#0f172a',

          'base-100': '#0d1117',
          'base-200': '#111827',
          'base-300': '#1f2937',
          'base-content': '#f1f5f9',

          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.5rem',
          '--rounded-badge': '0.5rem',
          '--animation-btn': '0.2s',
          '--animation-input': '0.2s',
          '--btn-focus-scale': '0.95',
          '--tab-radius': '0.5rem',
        },
      },
    ],
  },
};
