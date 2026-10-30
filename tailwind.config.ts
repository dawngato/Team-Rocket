import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFBFD",
        surface: "#FFFFFF",
        subtle: "#F4F7FB",
        border: {
          subtle: "#EAEFF6",
          DEFAULT: "#E2E8F0",
        },
        brand: {
          50: "#EEF3FF",
          100: "#DCE6FF",
          200: "#BFD3FE",
          500: "#3156D9",
          600: "#2545B8",
          700: "#1D3694",
        },
        royal: {
          50: "#F0F4FF",
          100: "#E0E8FF",
          500: "#304FFE",
          600: "#2842E5",
          700: "#1F35C7",
        },
        mint: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        amber: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(15, 23, 42, 0.03), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'elevated': '0 10px 30px -4px rgba(15, 23, 42, 0.05), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
        'card': '0 0 0 1px rgba(226, 232, 240, 0.7), 0 2px 8px rgba(15, 23, 42, 0.03)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatSubtle: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float-subtle': 'floatSubtle 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
export default config;
