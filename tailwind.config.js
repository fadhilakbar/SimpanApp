/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FAF9F6',
          100: '#F5F4F0',
          200: '#EBE9E1',
          300: '#DDD9CF',
          400: '#C2BCAD',
          500: '#9E9786',
          700: '#524F47',
          800: '#3A3833',
          900: '#1F1E1B',
        },
        ios: {
          bg: '#FAF9F6',
          card: '#FFFFFF',
          border: 'rgba(0, 0, 0, 0.08)',
          accent: '#059669', // Mint emerald pastel
          subtext: '#8E8E93',
          highlight: '#007AFF',
          orange: '#FF9500',
          purple: '#AF52DE',
          blue: '#007AFF',
          red: '#FF3B30',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        'ios': '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'ios-hover': '0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.03)',
        'ios-modal': '0 20px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
