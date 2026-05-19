# Westfield Agent Showcase — Maia

Demo / showcase del agente académico **Maia** de Westfield Business School. Réplica del sitio `westfield.crearia.co` reorientada para que el agente sea el producto principal, con un playground real conectado a OpenAI.

## Stack

- React 18 + TypeScript + Vite
- Framer Motion · Radix UI · lucide-react · Tailwind CSS
- Edge function (Vercel) que llama a `gpt-4o-mini` con el system prompt + contexto pedagógico (caso Etsy + notas + introspección + rúbrica)

## Instalar

```bash
npm install
cp .env.example .env.local
# rellena OPENAI_API_KEY en .env.local
npm run dev
```

## Estructura

```
src/
├── App.tsx
├── main.tsx
├── index.css                  # CSS vars + tailwind
├── lib/cn.ts                  # helper classnames
├── components/
│   ├── BackgroundOrbs.tsx
│   ├── ScrollProgress.tsx
│   ├── Nav.tsx
│   ├── Hero.tsx
│   ├── Footer.tsx
│   └── ... (más en hitos siguientes)
└── ...
api/                           # edge functions Vercel (hito 6)
└── maia.ts
```

## Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | server-only | Key de OpenAI Platform. **Nunca** commits ni la expongas con prefix `VITE_`. |
| `OPENAI_MODEL` | server-only | Por defecto `gpt-4o-mini`. |

## Notas

- Los archivos pedagógicos del agente (caso Etsy, notas del instructor, prompt, rúbrica, introspección) viven en `src/data/maia-context/` (a partir del hito 6).
- Branding 100% Westfield. Sin referencias a CrearIA ni Meta.
- Plan completo en `PLAN-westfield-agent-showcase.md`.
