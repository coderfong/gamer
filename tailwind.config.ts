import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand-color, #6d28d9)",
          fg: "var(--brand-fg, #ffffff)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans, system-ui)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
