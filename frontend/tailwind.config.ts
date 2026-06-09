import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fixxly Design System
        dark: {
          900: "#0a0b0f",
          800: "#0f1117",
          700: "#161922",
          600: "#1e2230",
          500: "#252b3b",
          400: "#2d3448",
        },
        accent: {
          cyan: "#00d4ff",
          purple: "#7c3aed",
          green: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
          pink: "#ec4899",
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.08)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand": "linear-gradient(135deg, #7c3aed 0%, #00d4ff 100%)",
        "gradient-dark": "linear-gradient(180deg, #0f1117 0%, #0a0b0f 100%)",
      },
      boxShadow: {
        glass: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        glow: "0 0 20px rgba(0,212,255,0.3)",
        "glow-purple": "0 0 20px rgba(124,58,237,0.4)",
        card: "0 8px 32px rgba(0,0,0,0.5)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
