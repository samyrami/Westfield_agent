/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--primary))",
        "primary-glow": "hsl(var(--primary-glow))",
        secondary: "hsl(var(--secondary))",
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        fg: "hsl(var(--fg))",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))",
      },
      boxShadow: {
        glow: "0 0 24px 0 hsla(var(--primary), 0.55)",
      },
    },
  },
  plugins: [],
};
