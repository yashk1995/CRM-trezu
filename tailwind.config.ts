import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["'Inter Tight'", "var(--font-sans)", "sans-serif"],
        mono:    ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        brand: {
          DEFAULT:  "#0953FF",
          deep:     "#003DCA",
          bright:   "#1B66FF",
          glow:     "#4D86FF",
          wash:     "#EAF0FF",
          "wash-2": "#DCE6FF",
        },
        ink: {
          DEFAULT: "#0A0B10",
          2:       "#14161D",
        },
        // Remap indigo → brand cobalt so existing indigo-* classes work
        indigo: {
          50:  "#EAF0FF",
          100: "#DCE6FF",
          200: "#B3CAFF",
          300: "#7AACFF",
          400: "#4D86FF",
          500: "#1B66FF",
          600: "#0953FF",
          700: "#003DCA",
          800: "#002FA8",
          900: "#001F7A",
          950: "#000F4D",
        },
        mist:    "#DCDFE5",
        cloud:   "#F4F5F7",
        "cloud-2": "#ECEEF2",
        stone:   "#6E7280",
        fog:     "#A6AAB4",
        slate:   "#4A4E5A",
        graphite:"#2A2D36",
      },
      borderRadius: {
        xs:   "4px",
        sm:   "6px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;
