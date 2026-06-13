# AGENTS.md

## Project Overview

PatchForge AI — a multi-agent SecOps pipeline. React 19 + TypeScript + Vite 8 web app with a standalone Python CLI in `agent_cli/`. The app chains 4 sequential Gemini API calls (developer → auditor → patcher → git automator) to generate, scan, patch, and commit code.

## Commands

```bash
npm install          # install deps
npm run dev          # Vite dev server (localhost:5173)
npm run build        # tsc -b && vite build
npm run lint         # eslint .
npm run preview      # preview production build
```

**No test runner is configured.** `test_codes/` contains sample vulnerable code files for the CLI tool — not test suites.

## Build Order

`npm run build` runs `tsc -b && vite build`. Type-checking happens first; it will fail the build on type errors before Vite runs.

## Lint

ESLint with typescript-eslint + react-hooks + react-refresh plugins. Ignores `dist/`. Run `npm run lint` from the repo root.

## TypeScript

- Target: ES2023, JSX: react-jsx, bundler module resolution
- Strict-ish: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax` is on — use `import type` for type-only imports
- Config is split: `tsconfig.json` references `tsconfig.app.json` (src/) and `tsconfig.node.json` (vite config)

## Architecture

- **Entry**: `src/main.tsx` → `src/App.tsx` (single-page app, all state in App)
- **Components**: `src/components/AgentActivity.tsx`, `DiffViewer.tsx`, `PullRequestView.tsx`
- **Data types**: `src/data/vulnerabilities.ts` (VulnerabilityScenario, AgentLog)
- **Styling**: `src/index.css` (CSS-only, no CSS-in-JS library — all custom properties and classes)
- **API**: Gemini REST API called directly from browser (`fetch` in `App.tsx`). API key stored in `localStorage` under `patchforge_gemini_key`. Also supports `VITE_GEMINI_API_KEY` env var.
- **CLI**: `agent_cli/review_agent.py` — standalone Python script with local venv, zero npm deps. Requires `GEMINI_API_KEY` env var.

## Gotchas

- The app sends the Gemini API key from the browser. Do not log or expose `apiKey` state in a way that leaks to console in production builds.
- `import.meta.env.VITE_GEMINI_API_KEY` is the env var for the web app (Vite convention: only `VITE_`-prefixed vars are exposed).
- No `.env` file is checked in (`.env*` is gitignored). You need to supply the API key at runtime or via env.
- No CI, no pre-commit hooks, no formatter configured.
