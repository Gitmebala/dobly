import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg) / <alpha-value>)",
        foreground: "rgb(var(--text) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          1: "rgb(var(--surface-1-rgb) / <alpha-value>)",
          2: "rgb(var(--surface-2-rgb) / <alpha-value>)",
          3: "rgb(var(--surface-3-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          dim: "rgb(var(--accent-rgb) / 0.12)",
          muted: "rgb(var(--accent-rgb) / 0.28)",
          hover: "rgb(var(--accent-strong-rgb) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border-rgb) / <alpha-value>)",
          bright: "rgb(var(--border-bright-rgb) / <alpha-value>)",
        },
        text: {
          DEFAULT: "rgb(var(--text-rgb) / <alpha-value>)",
          muted: "rgb(var(--text-muted-rgb) / <alpha-value>)",
          dim: "rgb(var(--text-dim-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "pulse-green": "pulseGreen 2s ease-in-out infinite",
        "typing": "typing 1.5s steps(20) infinite",
        "cursor-blink": "cursorBlink 1s step-end infinite",
        "flow": "flow 3s ease-in-out infinite",
        "scan": "scan 4s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseGreen: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 232, 122, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0, 232, 122, 0)" },
        },
        cursorBlink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        flow: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
      backgroundImage: {
        "grid-pattern": `
          linear-gradient(rgb(var(--grid-rgb) / 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgb(var(--grid-rgb) / 0.08) 1px, transparent 1px)
        `,
        "glow-gradient": "radial-gradient(ellipse at center top, rgb(var(--accent-rgb) / 0.16) 0%, transparent 70%)",
        "card-gradient": "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.08) 0%, transparent 100%)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
    },
  },
  plugins: [],
};

export default config;
