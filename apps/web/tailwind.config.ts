import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy900: "#10233F",
        teal600: "#157E92",
        green600: "#15805D",
        amber600: "#AA6C0B",
        red600: "#C23C45",
        surface: "var(--surface)",
        white: "#FFFFFF",
        text: "var(--text)",
        navy800: "#1A3258",
        navy950: "#0A172A",
        surfaceDark: "#0C0A09",
        cardDark: "#1C1917",
        borderDark: "#292524",
        textDark: "#F5F5F4",
        mutedDark: "#A8A29E",

        // shadcn/ui palette: Black / Charcoal / Warm Grey / Stone / Cream / Burnt Orange
        charcoal: {
          DEFAULT: "#1C1917",
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          700: "#44403C",
          800: "#292524",
          900: "#1C1917",
          950: "#0C0A09",
        },
        cream: {
          DEFAULT: "#FAF8F5",
          50: "#FDFBF7",
          100: "#FAF8F5",
          200: "#F5F2EB",
          300: "#EFECE6",
        },
        burntOrange: {
          DEFAULT: "#C2410C",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        warmGrey: {
          DEFAULT: "#78716C",
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#A8A29E",
          500: "#78716C",
          600: "#57534E",
          700: "#44403C",
          800: "#292524",
          900: "#1C1917",
        },

        // shadcn semantic variables
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      fontFamily: {
        sans: ["DM Sans", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
