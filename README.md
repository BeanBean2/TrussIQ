# TrussIQ

Congressional App Challenge–ready **2D/3D Finite Element Analysis** lab for pin-jointed trusses — built for high-school physics, VEX/FTC robotics, and intro engineering.

## Highlight features

| Capability | How to use |
|------------|------------|
| Direct Stiffness Method FEA | **Run FEA** or press **Space** |
| Wind / Seismic dynamics | **Dynamics** menu |
| Plastic collapse animation | **Collapse** |
| 3D extrusion + GLB WebAR export | **3D/AR** |
| Pratt vs Warren comparison | **Compare** |
| Per-member sections & materials | Select a beam → Inspect panel |
| AI buckling / zero-force coach | Sidebar → **AI** |
| Formula Inspector + Classroom tour | Select beam / **Book** icon |
| Shortcuts | Press **?** |
| Guided modeling + live analysis status | Start on the canvas / top-bar status |
| Smooth collapse playback + reduced-motion support | **Collapse** / follows system accessibility settings |
| Automatic local save + resume | Return to the start screen after a refresh |

## Quick start

```bash
npm install
npm run dev
```

### Share the local app with VS Code Live Share

The development server listens on port `5173` so a trusted collaborator can open it through Live Share:

1. Start the app with `npm run dev`.
2. Open the **Ports** view in VS Code.
3. Find port `5173`, right-click it, and choose **Forward Port** (or **Share Port** in Live Share).
4. Send the generated forwarded URL to your collaborator.
5. They open that URL in their browser; they do not use your `localhost` URL, since `localhost` would point to their own computer.

Only share the port with people you trust. Stop the dev server or remove the forwarded port when you are finished.

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · Three.js · Recharts · jsPDF
