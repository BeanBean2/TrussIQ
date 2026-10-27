# TrussIQ

**Free classroom structural lab** — browser-based 2D truss FEA so every physics, robotics, and intro engineering class can see how a structure carries load, without expensive analysis software.

> **Purpose:** TrussIQ gives under-resourced classrooms free browser-based truss FEA so students can learn structural load paths without expensive engineering software.

**Try it live:** [https://happypotato9001.github.io/TrussIQ/](https://happypotato9001.github.io/TrussIQ/)

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
- **Inspect** — Green→red stress heatmap after FEA, length labels, optional force labels, deflection overlay, formula inspector, and structure audit.
- **Compare** — Materials, sections, mass/cost estimates, wind and seismic *quasi-static* load cases, side-by-side compare, interactive **3D editor** (views, parts, chords, mirrors), and extruded 3D/GLB preview.
- **Learn** — **Demo Mode** (turnkey live pitch with Reset Demo), **Guided Lesson Mode** (4-step truss intro), **scaffolded challenges** (beginner → advanced with live FEA scorecards), UI tour, mission mode, printable lab worksheet, engineering coach (local rules by default).
- **Classroom** — SI ↔ US display units, colorblind-safer result palette, named class-period drafts, learning portfolio export.
- **Projects** — Named local project library (save / reopen / duplicate), `.truss` import/export with friendly validation errors, and privacy-aware **project summaries** (model viz, FEA, design score, reflection).
- **Privacy** — No accounts or TrussIQ backend; share links and cloud Gemini locked until consent; names omitted from exports by default; Clear private data in **More → Privacy**.
- **Share** — Local drafts, opt-in review links, PDF reports, and project brief.

**Educational estimate only:** TrussIQ results are educational estimates from a linear, axial-only Direct Stiffness Method model. They are **not** certified construction blueprints, code compliance, or professional engineering approval.

### Guided Lesson Mode

A docked, step-by-step lesson for students new to truss engineering. The canvas, FEA solver, undo history, and local draft saving stay fully usable while the lesson panel is open.

| Step | Focus |
| --- | --- |
| 1 | Build a simple truss (nodes and members) |
| 2 | Add supports (pin/roller) and external loads |
| 3 | Run the Direct Stiffness Method FEA solver |
| 4 | Interpret tension vs compression and yield utilization |

**How to launch**

- Top bar → **Lesson**
- Empty canvas → **Guided lesson**
- Command palette (`Ctrl+K`) → “Guided Lesson Mode”

**Controls:** progress bar and step tracker, **Back** / **Next**, per-step **Set up…** helpers, and a prominent **Restart Lesson** (reloads the Step 1 mini-truss geometry).

**Educational objectives:** name the parts of a planar truss, explain why supports and loads matter, run an analysis, and read member status (tension/compression) plus peak yield utilization as a classroom screen—not a construction certification.

### Scaffolded challenges

Ten progressive engineering goals with constraints, progressive hints, starter models, and a live scorecard that compares the current design to challenge criteria using FEA results (utilization, mass, cost, deflection, wind/buckling screens).

| Tier | Examples |
| --- | --- |
| Beginner | Stable triangle, read tension/compression, light deck load |
| Intermediate | Mass budget, classroom cost cap, deflection limit, wind screen |
| Advanced | Low-budget 10 m span, high-wind resilience, efficient robot arm |

**How to launch**

- Floating **Challenge** button (bottom-right)
- Empty canvas → **Challenges**
- Command palette (`Ctrl+K`) → “Scaffolded challenges”

The hub and active challenge panel include the educational-estimate disclaimer and are keyboard / screen-reader accessible (dialog semantics, ARIA labels, focus rings, progressive hint reveal).

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`), or use the [live demo](https://happypotato9001.github.io/TrussIQ/).

### Release verification (required before claiming ready)

Run these on a clean machine checkout:

```bash
npm install
npm run verify
```

`npm run verify` runs **lint → automated smoke tests → production build**. Do not treat the app as submission-ready until this exits **0**.

Then smoke the UI from a **private/incognito window** (no prior localStorage):

1. Open `npm run preview` after a successful verify, or the live Pages URL.
2. Home → **Demo Mode** → Launch → Run analysis → reinforce → **Reset Demo**.
3. Import a `.truss` export; confirm a bad/corrupt file shows a clear import message (not a blank failure).
4. Export → **Save .truss file** and confirm a success toast.
5. Narrow the window (~360px width) and confirm Demo coach / tools remain usable.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run verify` | Lint + workflow smoke tests + production build (**gate**) |
| `npm run build` | Production build (`dist/`) |
| `npm run build:pages` | Build with GitHub Pages base `/TrussIQ/` |
| `npm run check:pages-artifact` | Verify Pages asset paths after `build:pages` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Solver, equilibrium, import/export, demo, and summary checks |
| `npm run lint` | Oxlint |

GitHub Actions runs lint, tests, and build before deploying to Pages. Live pitch notes: [DEMO_PACKAGE.md](DEMO_PACKAGE.md).

---

## Workspace tour

1. **Home** — Purpose, sample Howe analysis, guided tour / demo entry.
2. **Top bar** — **Run FEA**, Presets, Dynamics, **Lesson**, **Demo**, Impact; export menu for **My projects** / **Project summary**; secondary tools under **More**. See [DEMO_PACKAGE.md](DEMO_PACKAGE.md) for the live pitch script.
3. **Left rail** — Node, Beam, Force, Support, Erase (mobile tool dock on small screens).
4. **Canvas** — Draw and inspect; empty state offers Guided lesson, Challenges, Place a joint, or presets. Floating **Challenge** opens the scaffolded hub.
5. **Inspector** — Materials, results, checks, coach; educational-estimate disclaimer on the model review card.
6. **Impact** — Learning goals and presentation helpers.

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

## Project docs

| Doc | Contents |
| --- | --- |
| [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md) | CAC 2026 demo video script (rules checklist + speakable lines) |
| [DEMO_PACKAGE.md](DEMO_PACKAGE.md) | Live Demo Mode launch + judge feature list |
| [PRIVACY.md](PRIVACY.md) | Local storage, share links, optional Gemini data flow |
| [LICENSE](LICENSE) | MIT |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Dependencies and AI assistance record |
| `.env.example` | Gemini key template |

---

## Technology

**Runtime:** React 19, Vite 8, Tailwind CSS 4, Three.js, Recharts, jsPDF, fflate, lucide-react, canvas-confetti, optional `@google/generative-ai`.

**Tooling:** TypeScript, Oxlint, tsx (smoke tests).
