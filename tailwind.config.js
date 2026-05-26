/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "race-black": "#0a0a0b",
        "race-dark": "#111114",
        "race-card": "#16161a",
        "race-border": "#1e1e24",
        "race-muted": "#2a2a32",
        "race-text": "#e8e8f0",
        "race-dim": "#6b6b7e",
        "neon-purple": "#b84fff",
        "neon-purple-dark": "#8b2fd4",
        "neon-purple-glow": "#b84fff40",
        "neon-green": "#39ff14",
        "neon-green-dark": "#28c40f",
        "neon-green-glow": "#39ff1430",
        "lap-gold": "#ffd700",
        "lap-silver": "#c0c0c0",
        "lap-bronze": "#cd7f32",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        display: ["'Barlow Condensed'", "'Bebas Neue'", "sans-serif"],
        body: ["'Barlow'", "sans-serif"],
      },
      animation: {
        "pulse-purple": "pulsePurple 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "glow-green": "glowGreen 1.5s ease-in-out infinite alternate",
        ticker: "ticker 20s linear infinite",
      },
      keyframes: {
        pulsePurple: {
          "0%, 100%": { boxShadow: "0 0 8px #b84fff40" },
          "50%": { boxShadow: "0 0 24px #b84fff80" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glowGreen: {
          from: { textShadow: "0 0 4px #39ff1460" },
          to: { textShadow: "0 0 16px #39ff14, 0 0 32px #39ff1480" },
        },
        ticker: {
          "0%": { transform: "translateX(100vw)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
    },
  },
  plugins: [],
};
