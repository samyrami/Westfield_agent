/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "hsl(var(--navy))",
        primary: "hsl(var(--primary))",
        "primary-glow": "hsl(var(--primary-glow))",
        secondary: "hsl(var(--secondary))",
        gold: "hsl(var(--gold))",
        "gold-glow": "hsl(var(--gold-glow))",
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        fg: "hsl(var(--fg))",
      },
      fontFamily: {
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
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
        // Realce decorativo / titulares: índigo → teal soñador
        "gradient-primary":
          "linear-gradient(100deg, hsl(var(--primary)), hsl(var(--secondary)))",
        // CTA cálido Westfield: dorado
        "gradient-warm":
          "linear-gradient(100deg, hsl(var(--gold-glow)), hsl(var(--gold)))",
      },
      boxShadow: {
        // Halo índigo grande y suave (Replika)
        glow: "0 0 60px -12px hsl(var(--primary) / 0.55)",
        "glow-soft": "0 0 90px -20px hsl(var(--primary) / 0.45)",
        "glow-gold": "0 0 50px -12px hsl(var(--gold) / 0.5)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-soft": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-7px)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
        // Orbes de fondo que derivan suavemente (sensación de vida)
        "drift-a": {
          "0%, 100%": { transform: "translate(0,0) scale(1)", opacity: "0.7" },
          "50%": { transform: "translate(26px,-18px) scale(1.15)", opacity: "1" },
        },
        "drift-b": {
          "0%, 100%": { transform: "translate(0,0) scale(1)", opacity: "0.6" },
          "50%": { transform: "translate(-22px,16px) scale(1.1)", opacity: "0.9" },
        },
        "drift-c": {
          "0%, 100%": { transform: "translate(0,0) scale(1)", opacity: "0.55" },
          "50%": { transform: "translate(16px,22px) scale(1.18)", opacity: "0.85" },
        },
        // Partículas que ascienden y se desvanecen
        particle: {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "15%": { opacity: "0.55" },
          "85%": { opacity: "0.4" },
          "100%": { transform: "translateY(-300px)", opacity: "0" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        "float-soft": "float-soft 6s ease-in-out infinite",
        breathe: "breathe 4s ease-in-out infinite",
        "drift-a": "drift-a 9s ease-in-out infinite",
        "drift-b": "drift-b 12s ease-in-out infinite",
        "drift-c": "drift-c 15s ease-in-out infinite",
        particle: "particle 12s linear infinite",
      },
    },
  },
  plugins: [],
};
