# TrussIQ — Demo Package (Congressional App Challenge)

Live demo: [https://happypotato9001.github.io/TrussIQ/](https://happypotato9001.github.io/TrussIQ/)

**Educational estimate only:** TrussIQ results are educational estimates from a linear, axial-only Direct Stiffness Method model. They are not certified construction blueprints, code compliance, or professional engineering approval.

---

## How to launch Demo Mode (judges / presenters)

1. Open the live URL (or `npm run dev` locally) in a **fresh browser window** — no prior saves required.
2. On Home, click **Guided Demo**, **or** in the workspace click top-bar **Demo**.
3. Click **Launch Demo Mode** — the polished Warren classroom bridge loads immediately with an on-canvas coach.
4. Follow the coach: **Run FEA** → read results → **Reinforce hottest member** → re-solve and compare.
5. Use the bold **Reset Demo** button anytime to restore the default starter instantly.

Keyboard: `Ctrl+K` → “Demo Mode”.

---

## Demonstration video script (CAC rules)

Use the full rules-aligned script in **[VIDEO_SCRIPT.md](VIDEO_SCRIPT.md)** (1–3 minutes; aim ~2:00). It covers every required video element from the 2026 CAC rules: names, app name, one-sentence purpose, audience, tools/languages, and a working demo.

**If something goes wrong while recording:** hit **Reset Demo**, then continue from “Run analysis.” Do not depend on local drafts.

---

## Feature list for judges

### Core engineering lab
- Snap-to-grid 2D truss editor (joints, members, supports, nodal loads)
- Adaptive grid while zooming; pan / zoom canvas
- Linear Direct Stiffness Method FEA: axial force, stress, yield utilization, displacements, reactions
- Deflection overlay with display scale; force / length labels; SI ↔ US units
- Colorblind-safer result palette; structure audit; formula inspector
- Materials & sections with mass / cost estimates
- Wind and seismic *quasi-static* load cases
- Interactive 3D editor + extruded 3D / GLB preview

### Learning & presentation
- **Demo Mode** — turnkey polished model, FEA coach, one design change, **Reset Demo**
- Guided Lesson Mode (build → support/load → solve → interpret)
- Scaffolded challenges (beginner → advanced) with live FEA scorecards and hints
- Mission mode, challenge library, engineering coach (local rules by default; optional Gemini)
- Printable lab worksheet; Impact / presentation helpers

### Classroom project lifecycle
- Named project library (save / reopen / duplicate) in local storage
- `.truss` import/export with friendly validation errors
- Privacy-aware project summaries (viz, FEA, design score, reflection; personal fields opt-in)
- Local drafts, review / share links, official study PDF, project brief

### Trust & privacy
- Analysis runs entirely in the browser (no TrussIQ model backend)
- Clear educational-scope disclaimers in Demo Mode, challenges, reports, and README
- Optional Gemini coaching only when a key is configured ([PRIVACY.md](PRIVACY.md))

### Build & openness
- MIT licensed · Vite / React / TypeScript / Tailwind / Three.js
- `npm run verify` — lint, solver smoke tests, production build
- Deployable static app (GitHub Pages live demo above)

---

## Reliability checklist (before a live pitch)

- [ ] Open live URL in a private/incognito window (proves zero prior data)
- [ ] Home → Guided Demo → Launch Demo Mode
- [ ] Complete FEA + reinforce + compare once
- [ ] Press **Reset Demo** and confirm the Warren starter returns
- [ ] Confirm you can still say the educational-estimate disclaimer aloud

---

## Related docs

| Doc | Use |
| --- | --- |
| [README.md](README.md) | Product overview and quick start |
| [PRIVACY.md](PRIVACY.md) | Local-first storage and optional Gemini |
| [SUBMISSION.md](SUBMISSION.md) | Submission checklist (if present) |
| Official CAC rules / portal | Confirm deadline and upload requirements on the live Congressional App Challenge site |
