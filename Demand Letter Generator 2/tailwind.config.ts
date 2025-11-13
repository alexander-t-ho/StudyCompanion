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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Forest green color scheme
        'forest': {
          50: '#f0f9f4',
          100: '#dcf2e3',
          200: '#bce4ca',
          300: '#8fcea8',
          400: '#5ab07f',
          500: '#228B22', // Main forest green
          600: '#1a6d1a',
          700: '#165716',
          800: '#154715',
          900: '#123b13',
          950: '#0a1f0b',
        },
      },
    },
  },
  plugins: [],
};
export default config;

