# TrussIQ

TrussIQ is an educational workspace for building and analyzing planar, pin-jointed truss models. It is intended for classroom physics, robotics, and introductory engineering activities.

## What it does

- Build a 2D truss on a snap-to-grid canvas; edit nodes, supports, loads, sections, and materials.
- Solve the linear Direct Stiffness Method model and inspect member forces, stress, yield utilization, displacement, and reactions.
- Review model checks, compare load cases and materials, and explore rule-based engineering guidance.
- Export a 3D extrusion as GLB, save local drafts, and export analysis reports.
- Use guided examples, engineering challenges, and a Congressional App Challenge preparation checklist.

## Engineering scope

The solver models planar, pin-jointed members with linear elastic axial behavior. Wind and seismic features apply quasi-static load cases; they are not time-domain structural dynamics. The results are for learning and exploration, not construction design or safety certification. The in-app engineering coach uses local rules and solver results; it is not a hosted generative AI service.

## Run locally

```bash
npm install
npm run dev
```

## Verify changes

```bash
npm run lint
npm test
npm run build
```

`npm test` checks the sample models, force equilibrium, solver rejection cases, and design import/export validation. The GitHub Pages workflow runs lint, tests, and the production build before deploying.

## Technology

Vite, React, TypeScript, Tailwind CSS, Three.js, Recharts, and jsPDF.

See [third-party and AI assistance disclosures](THIRD_PARTY_NOTICES.md) for the direct dependency inventory and a record of AI-assisted development in this repository.

## Congressional App Challenge note

The 2026 rules permit AI tools but require AI use to be disclosed in the submission materials. This repository has received AI-assisted code contributions. Entrants should document the tools and tasks accurately, ensure the student team makes significant original contributions, and be prepared to explain and demonstrate the code. Eligibility and submission requirements are determined by the official contest portal and current rulebook.
