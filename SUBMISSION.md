# Congressional App Challenge — submission packet

Use this with the official portal and rulebook. In-app: **Impact** dashboard → export submission prep.

## One-sentence purpose

> TrussIQ gives under-resourced classrooms free browser-based truss FEA so students can learn structural load paths without expensive engineering software.

**Audience:** Middle and high school physics, robotics, and intro engineering students and teachers.

## Demo video (~1:55)

Follow the timed storyboard in Impact → “Plan a 1:55 demo video,” or `CAC_VIDEO_STORYBOARD` in `src/lib/challengePrep.ts`.

Suggested live path:

1. Open guided demo or Howe preset.
2. Click **Run FEA**; explain one member force or yield utilization in your own words.
3. Change one section/material or load; re-run; compare.
4. State scope: linear, axial-only learning estimate — not construction certification.
5. Name stack: TypeScript, React, Vite, Tailwind, Three.js; optional Gemini coach.
6. Disclose AI assistance truthfully; describe code you personally understand (e.g. Direct Stiffness Method assembly in `feaEngine.ts`).

## Application talking points

| Prompt | Starter answer (personalize) |
| --- | --- |
| Inspiration | Schools often cannot afford commercial FEA; students deserve to *see* load paths. |
| Coding challenge | Assembling and reducing the global stiffness matrix / boundary conditions for 2D trusses. |
| What I learned | How tension vs compression and supports shape a design — and how to keep educational models honest about scope. |
| Version 2.0 | Teacher class sets, offline PWA packaging, or richer auto-graded labs. |

## AI disclosure (edit truthfully)

List every AI tool used (for example Cursor / Codex / Gemini) and what it helped with (UI, debugging, docs). Then list **your** original contributions: FEA understanding, design decisions, testing, video, and application answers. Review `THIRD_PARTY_NOTICES.md`.

## Ship checklist before portal submit

- [ ] `npm run verify` passes (`lint` + `test` + `build`) on the submitted commit
- [ ] For GitHub Pages: `npm run build:pages` then `npm run check:pages-artifact`
- [ ] README, PRIVACY.md, LICENSE, SUBMISSION.md, and THIRD_PARTY_NOTICES.md match the shipped app (including optional Gemini)
- [ ] Demo video public on YouTube or Vimeo (1–3 minutes, captions on)
- [ ] Live demo link works (`npm run preview`, or GitHub Pages after a green deploy)
- [ ] Eligibility, team rules, and deadline confirmed in the **live** submission portal
- [ ] Exit questionnaire plan after the deadline

## Official links

- Rules: https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf
- Registration: https://www.congressionalappchallenge.us/students/student-registration/
- Portal: https://webportalapp.com/sp/login/congressional_app_challenge_2026

Deadline sources have conflicted in past materials — confirm in the portal and submit early.
