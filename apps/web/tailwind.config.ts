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
        surface: "#F3F6FA",
        white: "#FFFFFF",
        text: "#17233B",
        navy800: "#1A3258",
        navy950: "#0A172A",
        surfaceDark: "#0B1524",
        cardDark: "#132135",
        borderDark: "#1E3352",
        textDark: "#E2E8F0",
        mutedDark: "#94A3B8",
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
