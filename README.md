# TrussIQ

**Free classroom structural lab** — browser-based 2D truss FEA so every physics, robotics, and intro engineering class can see how a structure carries load, without expensive analysis software.

> **Purpose:** TrussIQ gives under-resourced classrooms free browser-based truss FEA so students can learn structural load paths without expensive engineering software.

| | |
| --- | --- |
| **Version** | 1.0.0 |
| **Stack** | Vite · React · TypeScript · Tailwind CSS · Three.js |
| **License** | [MIT](LICENSE) |
| **Privacy** | [PRIVACY.md](PRIVACY.md) — local-first; optional Gemini |

---

## Features

- **Build** — Snap-to-grid canvas for joints, members, supports, and nodal loads; adaptive grid while zooming; pan and zoom freely.
- **Solve** — Linear Direct Stiffness Method (`Ku = F`): axial forces, stress, yield utilization, displacements, and support reactions.
- **Inspect** — Color-coded members, length labels, optional force labels, deflection overlay, formula inspector, and structure audit.
- **Compare** — Materials, sections, mass/cost estimates, wind and seismic *quasi-static* load cases, side-by-side compare, 3D/GLB export.
- **Learn** — Guided tour, live demo, bridge challenges, mission mode, engineering coach (local rules by default).
- **Share** — Local drafts, `.truss` import/export, review links, PDF reports, project brief, and CAC Impact prep.

Results are **learning estimates**, not construction design or safety certification.

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run verify` | Lint + solver smoke tests + production build |
| `npm run build` | Production build (`dist/`) |
| `npm run build:pages` | Build with GitHub Pages base `/TrussIQ/` |
| `npm run check:pages-artifact` | Verify Pages asset paths after `build:pages` |
| `npm run preview` | Preview the production build |
| `npm test` | FEA, equilibrium, I/O, and CAC prep checks |
| `npm run lint` | Oxlint |

GitHub Actions runs lint, tests, and build before deploying to Pages.

---

## Workspace tour

1. **Home** — Purpose, sample Howe analysis, guided tour / demo entry.
2. **Top bar** — **Run FEA**, Presets, Dynamics, Demo, Impact; secondary tools under **More**.
3. **Left rail** — Node, Beam, Force, Support, Erase (mobile tool dock on small screens).
4. **Canvas** — Draw and inspect; empty state offers “Place a joint” or “Load Howe example.”
5. **Inspector** — Materials, results, checks, coach.
6. **Impact** — Learning goals, demo storyboard, CAC checklist export.

First open runs a short onboarding tour (reopen anytime from the book icon).

---

## Engineering scope

- Planar, **pin-jointed** members with **linear elastic axial** behavior only.
- Wind / seismic modes apply **quasi-static** load snapshots — not time-domain dynamics.
- Buckling and yield checks are educational screens based on the solved model.
- Do not use TrussIQ for construction permitting or professional certification.

Core solver: `src/lib/feaEngine.ts` · math helpers: `src/lib/math.ts`.

---

## Engineering coach and AI

| Mode | Behavior |
| --- | --- |
| **Default** | Local rules from solver output (`aiOptimizer.ts`, `aiMessages.ts`). Nothing leaves the browser. |
| **Optional** | Google Gemini (`gemini-3.8-flash` via `@google/generative-ai`) when a key is set. |

```bash
cp .env.example .env.local
# Set VITE_GEMINI_API_KEY=...   (never commit .env.local)
```

You can also paste a key in the coach panel (stored in browser local storage). Prompts may include a summary of the current model — see [PRIVACY.md](PRIVACY.md).

---

## Congressional App Challenge

Submission packet: **[SUBMISSION.md](SUBMISSION.md)** (purpose line, video storyboard, talking points, ship checklist).

In the app: open **Impact** → export submission prep. Official rules permit AI tools but require honest disclosure — record tools in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and in your portal answers. Be ready to explain the DSM solver yourself. Eligibility is determined only by the official contest portal and rulebook.

---

## Project docs

| Doc | Contents |
| --- | --- |
| [PRIVACY.md](PRIVACY.md) | Local storage, share links, optional Gemini data flow |
| [LICENSE](LICENSE) | MIT |
| [SUBMISSION.md](SUBMISSION.md) | CAC demo script and checklist |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Dependencies and AI assistance record |
| `.env.example` | Gemini key template |

---

## Technology

**Runtime:** React 19, Vite 8, Tailwind CSS 4, Three.js, Recharts, jsPDF, fflate, lucide-react, canvas-confetti, optional `@google/generative-ai`.

**Tooling:** TypeScript, Oxlint, tsx (smoke tests).
