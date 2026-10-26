# Privacy

TrussIQ is designed to run locally in your browser for classroom learning.

## What stays on your device

- Truss models, drafts, theme, tutorial progress, and Congressional App Challenge checklist notes are stored in **browser local storage** on this device.
- Finite-element analysis runs **entirely in the browser**. Geometry and results are not uploaded to a TrussIQ server (there is no TrussIQ backend for models).
- Export files (JSON, PDF, GLB) and share/review links are created on your device. Share links encode model data in the URL; anyone with the link can open that snapshot.

## Optional Google Gemini coaching

- Without a Gemini API key, the engineering coach uses **local rules** only. No model data is sent to Google.
- If you set `VITE_GEMINI_API_KEY` or paste a key in the coach panel, chat prompts and a summary of your current model/results are sent to **Google’s Gemini API** to generate replies.
- Keys saved in the UI are stored in local storage on this device. Do not paste keys into shared demos or screen recordings.
- Google’s processing of API requests is governed by Google’s terms and privacy policy for the Gemini API / AI Studio. Review those documents before enabling Gemini in a school setting.

## What we do not collect

TrussIQ does not operate an account system, analytics backend, or telemetry service as part of this repository. Third-party CDNs (for example Google Fonts when online) may receive standard browser requests when pages load.

## Learning tool disclaimer

Analysis results are educational estimates for planar, pin-jointed, linear elastic trusses. They are **not** construction design approvals, safety certifications, or professional engineering advice.

## Contact

For classroom deployments, prefer the local-rules coach (no API key) unless your school has approved use of the Gemini API and student data policies.
