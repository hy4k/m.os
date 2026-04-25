import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        void: "#05050a",
        ink: "#0b1020",
        glass: "rgba(255,255,255,0.08)",
        aurora: {
          cyan: "#67e8f9",
          violet: "#a78bfa",
          rose: "#fb7185",
          amber: "#fbbf24",
          emerald: "#34d399"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "Inter", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 80px rgba(103,232,249,0.18)",
        violet: "0 0 80px rgba(167,139,250,0.20)"
      }
    }
  },
  plugins: []
};

export default config;
