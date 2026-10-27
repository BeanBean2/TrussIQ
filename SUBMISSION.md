# Congressional App Challenge — submission packet

Use this with the official portal and rulebook. In-app: **Impact** dashboard → export submission prep / learning portfolio.

## Live demo

**https://happypotato9001.github.io/TrussIQ/**

## One-sentence purpose

> TrussIQ gives under-resourced classrooms free browser-based truss FEA so students can learn structural load paths without expensive engineering software.

**Audience:** Middle and high school physics, robotics, and intro engineering students and teachers.

## Demo video (1–3 minutes, aim ~2:00)

**Full speakable script + shot list:** [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md) (aligned to the 2026 CAC rules PDF).

Also see Impact → “Plan a 1:55 demo video,” or `CAC_VIDEO_STORYBOARD` in `src/lib/challengePrep.ts`.

Suggested live path:

1. Open the live demo → **Launch Demo Mode**.
2. Run analysis; explain tension/compression or peak utilization in your own words.
3. Reinforce the hottest member; re-run; compare; say it is an educational estimate, not a blueprint.
4. Name stack: TypeScript, React, Vite, Tailwind, Three.js; solver in the browser.
5. Disclose AI assistance truthfully in the **written** submission; in the video, describe code you personally understand (e.g. Direct Stiffness Method in `feaEngine.ts`).
6. Upload to YouTube or Vimeo as **Public**.

## Application talking points

| Prompt | Starter answer (personalize) |
| --- | --- |
| Inspiration | Schools often cannot afford commercial FEA; students deserve to *see* load paths. |
| Coding challenge | Assembling and reducing the global stiffness matrix / boundary conditions for 2D trusses. |
| What I learned | How tension vs compression and supports shape a design — and how to keep educational models honest about scope. |
| Security / privacy | TrussIQ has no accounts or backend that stores student data—FEA runs in the browser, and models stay on the device. We keep coaching local by default, lock share links and optional Gemini until consent, omit names from exports unless users opt in, and offer Clear private data plus PRIVACY.md. |
| Version 2.0 | Teacher class sets, offline PWA packaging, or richer auto-graded labs. |

## Classroom features to mention

- Printable **lab worksheet** PDF (Impact or canvas feature bar)
- **SI / US** display units and **colorblind-safer** member palette
- **Named class-period drafts** (Team → History)
- Learning **portfolio** JSON export with design score + live demo URL

## AI disclosure (edit truthfully)

List every AI tool used (for example Cursor / Codex / Gemini) and what it helped with (UI, debugging, docs). Then list **your** original contributions: FEA understanding, design decisions, testing, video, and application answers. Review `THIRD_PARTY_NOTICES.md`.

## Ship checklist before portal submit

- [ ] `npm run verify` passes (`lint` + `test` + `build`) on the submitted commit
- [ ] Live demo URL works: https://happypotato9001.github.io/TrussIQ/
- [ ] For GitHub Pages: `npm run build:pages` then `npm run check:pages-artifact`
- [ ] README, PRIVACY.md, LICENSE, SUBMISSION.md, and THIRD_PARTY_NOTICES.md match the shipped app
- [ ] Demo video public on YouTube or Vimeo (1–3 minutes, captions on)
- [ ] Eligibility, team rules, and deadline confirmed in the **live** submission portal
- [ ] Exit questionnaire plan after the deadline

## Official links

- Rules: https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf
- Registration: https://www.congressionalappchallenge.us/students/student-registration/
- Portal: https://webportalapp.com/sp/login/congressional_app_challenge_2026

Deadline sources have conflicted in past materials — confirm in the portal and submit early.
