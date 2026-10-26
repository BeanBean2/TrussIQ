# Third-party and AI assistance disclosures

## Direct dependencies

Versions below are the versions currently installed from `package-lock.json`. Licenses are copied from each package's metadata. Transitive packages may have additional notices; their package metadata and license files remain in `node_modules` and the npm lockfile records the resolved dependency tree.

### Runtime

| Package | Version | License | Use |
| --- | --- | --- | --- |
| @google/generative-ai | 0.24.1 | Apache-2.0 | Optional Gemini engineering coach (only when an API key is configured) |
| canvas-confetti | 1.9.4 | ISC | Celebrate completed learning challenges |
| fflate | 0.8.3 | MIT | Compress self-contained model share links |
| jspdf | 4.2.1 | MIT | Generate PDF reports |
| lucide-react | 1.61.0 | ISC | Interface icons |
| react | 19.3.1 | MIT | User interface |
| react-dom | 19.3.1 | MIT | Browser rendering |
| recharts | 3.10.1 | MIT | Analysis charts |
| three | 0.186.1 | MIT | 3D model preview and GLB export |

### Optional dependency

| Package | Version | License | Use |
| --- | --- | --- | --- |
| html2canvas | 1.4.1 | MIT | Optional jsPDF HTML conversion support; TrussIQ does not call that feature |

### Development and build

| Package | Version | License | Use |
| --- | --- | --- | --- |
| @types/canvas-confetti | 1.9.0 | MIT | Type definitions for canvas-confetti |
| @tailwindcss/vite | 4.3.3 | MIT | Tailwind CSS integration |
| @types/node | 24.19.2 | MIT | Type definitions |
| @types/react | 19.3.0 | MIT | Type definitions |
| @types/react-dom | 19.3.0 | MIT | Type definitions |
| @types/three | 0.186.0 | MIT | Type definitions |
| @vitejs/plugin-react | 6.1.2 | MIT | React integration for Vite |
| oxlint | 1.89.0 | MIT | Lint checks |
| tailwindcss | 4.3.3 | MIT | Styling framework |
| tsx | 4.23.15 | MIT | Run TypeScript smoke checks |
| typescript | 6.0.3 | Apache-2.0 | Type checking and compilation |
| vite | 8.3.5 | MIT | Development server and bundler |

The interface also requests IBM Plex Sans and IBM Plex Mono from Google Fonts when the app is online.

## AI assistance

The following AI tools have assisted development of this repository. The student entrant/team must review this record, add any other tools and tasks, and accurately describe their own contributions in the official Congressional App Challenge application.

| Tool | Typical tasks in this repo |
| --- | --- |
| OpenAI Codex / Cursor agent | Review code, implement UI and features, debug behavior, write docs (README, PRIVACY, SUBMISSION), run verification commands |
| Google Gemini (in-app, optional) | Runtime coaching answers when a user supplies an API key; not required to use TrussIQ |

AI assistance does not replace the requirement that students make significant original contributions and understand the submitted code — especially the Direct Stiffness Method solver in `src/lib/feaEngine.ts` and related math.
